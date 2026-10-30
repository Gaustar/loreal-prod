// ========== RÉINTÉGRATION DES AC (L60) ==========
// Chaque AC du poste a son stock : les palettes reçues s'additionnent tant
// que l'AC ne change pas. « À garder » = boîtes entières couvrant l'objectif
// en cours + les objectifs des commandes précédentes faites avec cet AC ;
// le reste est à renvoyer. Au changement de commande, les AC cochés
// repartent à zéro, les autres gardent leur stock.

// État d'affichage (non sauvegardé) : panneau « Entamée » ouvert, dernier
// ajout annulable, panneau « Changement de commande ».
let acEntamee = null;            // { id, niv, boites }
let acDernierAjout = null;       // id de l'AC
let changementOuvert = false;
let acQuiChangent = {};          // id → true
let reintOuvert = false;

function lireAC(id) {
    try {
        const e = JSON.parse(storageGet('l60-ac-' + id, ''));
        if (e && Array.isArray(e.palettes)) return { palettes: e.palettes, objectifsPasses: e.objectifsPasses || 0 };
    } catch (err) {}
    return { palettes: [], objectifsPasses: 0 };
}

function ecrireAC(id, etat) {
    storageSet('l60-ac-' + id, JSON.stringify(etat));
}

// Calcul pur (testé dans tests/reintegration.check.js).
function calculReintegration(ac, recu, besoin) {
    const garder = Math.ceil(besoin / ac.parBoite) * ac.parBoite;
    if (recu < garder) return { garder, renvoyer: 0, manque: Math.max(0, besoin - recu), boites: 0 };
    const renvoyer = recu - garder;
    return { garder, renvoyer, manque: 0, boites: Math.floor(renvoyer / ac.parBoite) };
}

function quantitePalette(ac, niv, boites) {
    return (niv * ac.parNiveau + boites) * ac.parBoite;
}

// 22 boîtes de laminés → « 5 niveaux + 2 boîtes »
function enNiveaux(ac, boites) {
    const niv = Math.floor(boites / ac.parNiveau);
    const b = boites % ac.parNiveau;
    const unite = n => n + ' ' + (n > 1 ? ac.labelBoite : ac.labelBoite.slice(0, -1));
    const parts = [];
    if (niv) parts.push(niv + (niv > 1 ? ' niveaux' : ' niveau'));
    if (b || !niv) parts.push(unite(b));
    return parts.join(' + ');
}

function acDuPoste() {
    return AC_L60[posteActuel] || [];
}

function objectifEnCours(ligne) {
    return parseInt(document.getElementById('total-' + ligne).value) || 0;
}

function majReintegration(ligne) {
    const div = document.getElementById('reint-' + ligne);
    if (!div) return;
    const objectif = objectifEnCours(ligne);

    let html = '';
    const resume = [];
    acDuPoste().forEach(ac => {
        const etat = lireAC(ac.id);
        const recu = etat.palettes.reduce((s, q) => s + q, 0);
        const besoin = etat.objectifsPasses + objectif;
        const r = calculReintegration(ac, recu, besoin);
        const pleine = quantitePalette(ac, ac.niveaux, 0);
        if (recu && besoin) resume.push(`${ac.nom} : ${r.manque ? '<span class="reint-manque">encore ' + fmt(r.manque) + ' à recevoir</span>' : 'renvoyer <b>' + fmt(r.renvoyer) + '</b>'}`);

        let resultat;
        if (!recu) resultat = '<div class="reint-detail">Aucune palette reçue</div>';
        else if (!besoin) resultat = '<div class="reint-detail">Saisis l\'objectif pour le calcul</div>';
        else if (r.manque) resultat = `<div class="reint-chiffre"><span>Encore à recevoir</span><b class="reint-manque">${fmt(r.manque)}</b></div>`;
        else resultat = `
            <div class="reint-chiffre"><span>À renvoyer</span><b>${fmt(r.renvoyer)}</b></div>
            <div class="reint-detail">${r.boites ? enNiveaux(ac, r.boites) + ' · ' : ''}garder ${fmt(r.garder / ac.parBoite)} ${ac.labelBoite}</div>`;

        const listePalettes = etat.palettes.map((q, i) =>
            `<button class="reint-pal" onclick="retirerPaletteAC('${ligne}', '${ac.id}', ${i})">${fmt(q)} ✕</button>`).join('');

        html += `
            <div class="reint-ac">
                <div class="reint-entete"><b>${ac.icone} ${ac.nom}</b>
                    ${recu ? `<details class="reint-recu"><summary>reçu ${fmt(recu)}</summary>${listePalettes}<div class="reint-detail">Toucher une palette pour la supprimer</div></details>` : ''}
                </div>
                ${resultat}
                <div class="reint-actions">
                    <button class="btn reint-btn" onclick="ajouterPaletteAC('${ligne}', '${ac.id}', ${pleine})">+ Complète <small>${fmt(pleine)}</small></button>
                    <button class="btn reint-btn reint-btn-2" onclick="ouvrirEntamee('${ligne}', '${ac.id}')">+ Entamée</button>
                </div>
                ${acEntamee && acEntamee.id === ac.id ? htmlEntamee(ligne, ac) : ''}
                ${acDernierAjout === ac.id ? `<div class="reint-annuler">✓ Palette ajoutée · <button class="lien-discret" onclick="annulerDernierAC('${ligne}')">Annuler</button></div>` : ''}
            </div>`;
    });

    html += changementOuvert ? htmlChangement(ligne, objectif)
        : `<button class="btn reint-btn reint-btn-2 reint-changement" onclick="basculerChangement('${ligne}')">🔄 Changement de commande</button>`;
    // Replié par défaut : le titre donne déjà les chiffres à renvoyer.
    div.innerHTML = `
        <details class="card reint" ${reintOuvert ? 'open' : ''} ontoggle="reintOuvert = this.open">
            <summary class="reint-titre">
                <span>↩️ Réintégration AC</span>
                <span class="reint-resume">${resume.length ? resume.join('<br>') : 'Ajoute les palettes reçues'}</span>
            </summary>
            ${html}
        </details>`;
}

function htmlEntamee(ligne, ac) {
    const stepper = (champ, val, label) => `
        <div class="reint-step"><span>${label}</span>
            <span class="reint-step-btns">
                <button class="btn-icone" onclick="regleEntamee('${ligne}', '${champ}', -1)">−</button>
                <b>${val}</b>
                <button class="btn-icone" onclick="regleEntamee('${ligne}', '${champ}', 1)">+</button>
            </span>
        </div>`;
    const qte = quantitePalette(ac, acEntamee.niv, acEntamee.boites);
    return `
        <div class="reint-entamee">
            ${stepper('niv', acEntamee.niv, 'Niveaux complets')}
            ${stepper('boites', acEntamee.boites, ac.labelBoite.charAt(0).toUpperCase() + ac.labelBoite.slice(1) + ' en plus')}
            <div class="reint-actions">
                <button class="btn reint-btn reint-btn-2" onclick="ouvrirEntamee('${ligne}', null)">Fermer</button>
                <button class="btn reint-btn" onclick="ajouterPaletteAC('${ligne}', '${ac.id}', ${qte})" ${qte ? '' : 'disabled'}>Ajouter ${fmt(qte)}</button>
            </div>
        </div>`;
}

function htmlChangement(ligne, objectif) {
    const lignes = acDuPoste().map(ac => `
        <label class="toggle">
            <input type="checkbox" ${acQuiChangent[ac.id] ? 'checked' : ''} onchange="acQuiChangent['${ac.id}'] = this.checked">
            <span class="toggle-switch"></span>
            <span class="toggle-label">${ac.icone} ${ac.nom} change</span>
        </label>`).join('');
    return `
        <div class="reint-entamee">
            <div class="reint-detail">Coche les AC qui changent : ils repartent à zéro (renvoie le chiffre affiché au-dessus). Les autres gardent leur stock pour la commande suivante. L'objectif et la quantité produite sont remis à zéro.</div>
            ${lignes}
            <div class="reint-actions">
                <button class="btn reint-btn reint-btn-2" onclick="basculerChangement('${ligne}')">Annuler</button>
                <button class="btn reint-btn" onclick="validerChangement('${ligne}', ${objectif})">Valider</button>
            </div>
        </div>`;
}

// « Commande suivante » (Réglages) : les AC en stock continuent, on cumule l'objectif fait.
function cumulerObjectifAC(objectif) {
    [...AC_L60.arriere, ...AC_L60.avant].forEach(ac => {
        const etat = lireAC(ac.id);
        if (!etat.palettes.length) return;
        etat.objectifsPasses += objectif;
        ecrireAC(ac.id, etat);
    });
}

// Vide les AC des deux postes (bouton « Réinitialiser la ligne »).
function reinitialiserAC() {
    [...AC_L60.arriere, ...AC_L60.avant].forEach(ac => storageRemove('l60-ac-' + ac.id));
    acEntamee = null;
    acDernierAjout = null;
    changementOuvert = false;
    acQuiChangent = {};
}

function ajouterPaletteAC(ligne, id, qte) {
    if (!qte) return;
    const etat = lireAC(id);
    etat.palettes.push(qte);
    ecrireAC(id, etat);
    acEntamee = null;
    acDernierAjout = id;
    majReintegration(ligne);
}

function annulerDernierAC(ligne) {
    if (!acDernierAjout) return;
    const etat = lireAC(acDernierAjout);
    etat.palettes.pop();
    ecrireAC(acDernierAjout, etat);
    acDernierAjout = null;
    majReintegration(ligne);
}

function retirerPaletteAC(ligne, id, index) {
    const etat = lireAC(id);
    demanderConfirmation({
        titre: 'Supprimer cette palette ?',
        message: `${fmt(etat.palettes[index])} pièces seront retirées du reçu.`,
        libelleOk: 'Supprimer',
        onOk: () => {
            etat.palettes.splice(index, 1);
            ecrireAC(id, etat);
            acDernierAjout = null;
            majReintegration(ligne);
        }
    });
}

function ouvrirEntamee(ligne, id) {
    acEntamee = id ? { id, niv: 0, boites: 0 } : null;
    majReintegration(ligne);
}

function regleEntamee(ligne, champ, delta) {
    const ac = acDuPoste().find(a => a.id === acEntamee.id);
    const max = champ === 'niv' ? ac.niveaux : ac.parNiveau - 1;
    acEntamee[champ] = Math.min(max, Math.max(0, acEntamee[champ] + delta));
    majReintegration(ligne);
}

function basculerChangement(ligne) {
    changementOuvert = !changementOuvert;
    acQuiChangent = {};
    majReintegration(ligne);
}

// shortcut: seuls les AC du poste affiché sont mis à jour (chaque poste a son
// téléphone) ; à revoir si un même appareil sert aux deux postes.
function validerChangement(ligne, objectif) {
    acDuPoste().forEach(ac => {
        if (acQuiChangent[ac.id]) { ecrireAC(ac.id, { palettes: [], objectifsPasses: 0 }); return; }
        const etat = lireAC(ac.id);
        etat.objectifsPasses += objectif;
        ecrireAC(ac.id, etat);
    });
    changementOuvert = false;
    acQuiChangent = {};
    acDernierAjout = null;
    document.getElementById('total-' + ligne).value = '';
    document.getElementById('fait-' + ligne).value = '0';
    effacerSauvegardeLigne(ligne);

    // Si la file d'attente (⚙️ Réglages) a une commande, elle devient l'objectif.
    const file = chargerCommandes(ligne);
    if (file.length) {
        const prochaine = file.shift();
        document.getElementById('total-' + ligne).value = prochaine.quantite;
        sauvegarderValeur(ligne, 'total', prochaine.quantite);
        sauvegarderCommandes(ligne, file);
        calculer(ligne);
        afficherAlerteTemporaire('▶ Commande chargée : ' + fmt(prochaine.quantite) + ' pièces');
        return;
    }
    calculer(ligne);
    ouvrirCommande(ligne);
    afficherAlerteTemporaire('🔄 Nouvelle commande : saisis l\'objectif');
}

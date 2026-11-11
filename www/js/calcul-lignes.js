// ========== CALCUL — PARTIE COMMUNE ==========
// calculer() gère la validation/progression communes à toutes les lignes,
// puis délègue l'affichage du détail (conditionnement, temps, cuve...)
// à une fonction spécifique à la ligne via CALCUL_STRATEGIES.
// Pour ajouter une ligne avec une logique particulière (comme l60),
// il suffit d'ajouter une entrée dans CALCUL_STRATEGIES plus bas,
// sans toucher au reste.

// Verrou anti-répétition par ligne (pas une seule variable globale) : un
// plafonnement sur une ligne ne doit pas supprimer la notification d'une
// autre ligne qui se plafonnerait dans les mêmes 2 secondes.
const alertesCorrigeesActives = {};

// Seuil minimum de la cuve, personnalisable par ligne (au lieu d'une
// constante unique). Retombe sur SEUIL_CUVE_DEFAUT tant que rien n'est réglé.
function getSeuilCuve(ligne) {
    const val = parseFloat(storageGet(`${ligne}-cuve-seuil`, SEUIL_CUVE_DEFAUT));
    return isNaN(val) ? SEUIL_CUVE_DEFAUT : val;
}

function sauvegarderSeuilCuve(ligne, valeur) {
    storageSet(`${ligne}-cuve-seuil`, valeur);
}

function calculer(ligne) {
    const totalInput = document.getElementById('total-' + ligne);
    const faitInput = document.getElementById('fait-' + ligne);
    const kpiDiv = document.getElementById('kpi-' + ligne);
    const resDiv = document.getElementById('resultat-' + ligne);
    let total = parseInt(totalInput.value) || 0;
    let fait = parseInt(faitInput.value) || 0;

    // Avant les retours anticipés : la réintégration sert surtout en fin de production.
    if (LIGNES[ligne].hasPoste) majReintegration(ligne);

    if (fait < 0) {
        fait = 0;
        faitInput.value = 0;
        sauvegarderValeur(ligne, 'fait', 0);
    }

    majResumeCommande(ligne, total);
    if (total <= 0) {
        // Pas de tableau de bord sans commande : la carte Commande, ouverte, guide la saisie.
        kpiDiv.innerHTML = '';
        resDiv.innerHTML = '';
        majProgression(ligne, fait, 0);
        totalInput.classList.add('total-obligatoire');
        document.getElementById('commande-' + ligne).open = true;
        return;
    } else {
        totalInput.classList.remove('total-obligatoire');
    }

    let correctionAppliquee = false;
    if (fait > total) {
        fait = total;
        faitInput.value = fait;
        sauvegarderValeur(ligne, 'fait', fait);
        correctionAppliquee = true;
    }

    sauvegarderValeur(ligne, 'total', total);
    sauvegarderValeur(ligne, 'fait', fait);
    majProgression(ligne, fait, total);

    const reste = Math.max(0, total - fait);

    // Doit être évalué AVANT le court-circuit "reste === 0" : quand fait est
    // plafonné à total, reste vaut systématiquement 0, donc la notification
    // ne se déclencherait jamais si elle était placée après ce court-circuit.
    if (correctionAppliquee && !alertesCorrigeesActives[ligne]) {
        alertesCorrigeesActives[ligne] = true;
        afficherAlerteTemporaire(`⚠️ Production plafonnée à ${fmt(total)} pièces`);
        setTimeout(() => { alertesCorrigeesActives[ligne] = false; }, 2000);
    }

    if (reste === 0) {
        kpiDiv.innerHTML = '<div class="kpi-message kpi-termine">✅ Production terminée</div>';
        resDiv.innerHTML = '';
        return;
    }

    const config = LIGNES[ligne];
    const cuve = calculerCuve(ligne, reste);

    // Temps restant et consommables suivent la quantité réellement
    // productible (limitée par la cuve le cas échéant), pas l'objectif complet.
    const minTot = cuve.qte / config.vitesse;
    const hh = Math.floor(minTot / 60);
    const mm = Math.floor(minTot % 60);
    const fin = new Date(Date.now() + minTot * 60000).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    kpiDiv.innerHTML = renderTableau(ligne, reste, Math.floor((fait / total) * 100), hh, mm, fin, cuve);

    const strategie = CALCUL_STRATEGIES[ligne] || itemsStandard;
    const items = strategie(ligne, cuve.qte, cuve.limite);
    // Le colorant reste calculé sur l'objectif complet : c'est "ce qu'il
    // faudrait pour finir", pas "ce qui est atteignable maintenant".
    if (config.colorant) {
        items.push({ icone: '🎨', label: 'Colorant (objectif)', valeur: ((reste / config.produitsParPalette) * config.colorant).toFixed(1).replace('.', ',') + ' kg' });
    }

    let html = '';
    if (cuve.limite) {
        html += `
            <div class="alerte-cuve">
                <div class="alerte-cuve-titre">⛔ Maximum possible avec la cuve actuelle</div>
                <div class="alerte-cuve-valeur">${fmt(cuve.possibles)} pièces</div>
                <div class="alerte-cuve-detail">Soit ${fmt(reste - cuve.possibles)} pièces de moins que l'objectif</div>
            </div>`;
    }
    html += renderAPrevoir(items);
    if (cuve.limite) {
        html += '<div class="note-limite">* Temps et quantités limités par la cuve</div>';
    }
    resDiv.innerHTML = html;
}

function majProgression(ligne, fait, total) {
    const pourcent = total > 0 ? Math.min(100, (fait / total) * 100) : 0;
    const qte = document.getElementById('progress-qte-' + ligne);
    const barre = document.getElementById('barre-' + ligne);
    if (qte) qte.innerHTML = total > 0 ? `<b>${fmt(fait)}</b> / ${fmt(total)} pièces` : 'Aucune commande en cours';
    if (barre) barre.style.width = pourcent + '%';
}

// Zone « Commande » repliée : son titre rappelle l'objectif pour ne pas avoir à l'ouvrir.
function majResumeCommande(ligne, total) {
    const el = document.getElementById('commande-resume-' + ligne);
    if (el) el.innerText = total > 0 ? fmt(total) + ' pièces' : 'à saisir';
}

function ouvrirCommande(ligne) {
    const details = document.getElementById('commande-' + ligne);
    details.open = true;
    details.scrollIntoView({ behavior: 'smooth', block: 'start' });
    document.getElementById('total-' + ligne).focus({ preventScroll: true });
}

// Limitation par la cuve de colorant (toute ligne ayant un colorant configuré).
// Renvoie la quantité réellement productible et si la limite s'applique.
function calculerCuve(ligne, reste) {
    const config = LIGNES[ligne];
    const res = { qte: reste, limite: false, possibles: 0 };
    if (!config.colorant) return res;

    const checkCuve = document.getElementById(`check-cuve-${ligne}`);
    if (!checkCuve || !checkCuve.checked) return res;

    const seuil = getSeuilCuve(ligne);
    const poidsActuel = parseFloat(document.getElementById(`poids-cuve-${ligne}`).value) || 0;
    if (poidsActuel > seuil) {
        const poidsUtilisable = poidsActuel - seuil;
        res.possibles = Math.floor((poidsUtilisable / config.colorant) * config.produitsParPalette);
        if (res.possibles < reste) {
            res.qte = res.possibles;
            res.limite = true;
        }
    } else if (poidsActuel > 0 && poidsActuel <= seuil) {
        res.possibles = 0;
        res.qte = 0;
        res.limite = true;
    }
    return res;
}

// ========== RENDU PARTAGÉ DES RÉSULTATS ==========
// - un tableau de bord en tuiles (fin prévue, reste, cuve, commande suivante)
// - une checklist "À prévoir" pour les consommables, visuellement secondaire

function dureeHM(minutes) {
    return `${Math.floor(minutes / 60)}h${String(Math.floor(minutes % 60)).padStart(2, '0')}`;
}

// Tuiles lisibles d'un coup d'œil, sans défiler. Cuve et commande suivante
// sont des boutons : elles ouvrent l'endroit où on les règle.
function renderTableau(ligne, reste, pct, h, m, fin, cuve) {
    const config = LIGNES[ligne];
    const tuile = (label, valeur, detail, classe = '', action = '') =>
        `<${action ? `button onclick="${action}"` : 'div'} class="tuile ${classe}">
            <span class="tuile-label">${label}</span>
            <span class="tuile-valeur">${valeur}</span>
            <span class="tuile-detail">${detail}</span>
        </${action ? 'button' : 'div'}>`;

    const tuiles = [
        tuile('Fin prévue' + (cuve.limite ? ' *' : ''), fin, `dans ${h}h${String(m).padStart(2, '0')}` + (cuve.limite ? ' · limité par la cuve' : ''), 'tuile-fin'),
        tuile('Reste', fmt(reste), `pièces · ${pct} % fait`)
    ];

    if (config.colorant) {
        const ouvrir = `ouvrirCommande('${ligne}')`;
        const poids = parseFloat(document.getElementById(`poids-cuve-${ligne}`).value) || 0;
        if (!document.getElementById(`check-cuve-${ligne}`).checked) tuiles.push(tuile('Cuve', '—', 'non suivie', 'tuile-vide', ouvrir));
        else if (!poids) tuiles.push(tuile('Cuve', '?', 'saisis le poids', 'tuile-vide', ouvrir));
        else if (cuve.limite) tuiles.push(tuile('Cuve ⛔', fmt(cuve.possibles), `pièces max · manque ${fmt(reste - cuve.possibles)}`, 'tuile-alerte', ouvrir));
        else tuiles.push(tuile('Cuve', 'OK', `${fmt(poids)} kg · suffit pour finir`, 'tuile-ok', ouvrir));
    }

    const suivante = chargerCommandes(ligne)[0];
    tuiles.push(suivante
        ? tuile('Commande suivante', fmt(suivante.quantite), `pièces · ${dureeHM(suivante.quantite / config.vitesse)} de production`, '', `ouvrirReglagesLigne('${ligne}')`)
        : tuile('Commande suivante', '—', "file d'attente vide", 'tuile-vide', `ouvrirReglagesLigne('${ligne}')`));

    // Nombre impair de tuiles : la fin prévue prend toute la largeur.
    return (tuiles.length % 2 ? tuiles[0].replace('tuile-fin', 'tuile-fin tuile-large') : tuiles[0]) + tuiles.slice(1).join('');
}

function renderAPrevoir(items) {
    let html = '<div class="apprevoir">';
    items.forEach(it => {
        html += `
            <div class="apprevoir-ligne">
                <span class="apprevoir-icone">${it.icone}</span>
                <span class="apprevoir-label">${it.label}${it.detail ? `<small>${it.detail}</small>` : ''}</span>
                <span class="apprevoir-valeur${it.limite ? ' valeur-limite' : ''}">${it.valeur}</span>
            </div>`;
    });
    html += '</div>';
    return html;
}

// ========== STRATÉGIE STANDARD (CCG, Color Sensation, L87...) ==========
// Renvoie les consommables "À prévoir" pour qte pièces réellement productibles.

function itemsStandard(ligne, qte, limite) {
    const config = LIGNES[ligne];

    if (config.consommables) {
        // Liste de consommables générique : chaque entrée optionnelle
        // n'apparaît que si sa case est cochée dans la carte de la ligne.
        return config.consommables
            .filter(c => {
                if (!c.optionnel) return true;
                const chk = document.getElementById(`conso-${ligne}-${c.id}`);
                return !!(chk && chk.checked);
            })
            .map(c => {
                const nbBoites = Math.ceil(qte / c.parBoite);
                const capacite = nbBoites * c.parBoite;
                return { icone: c.icone || '📦', label: c.label, valeur: nbBoites + ' boîtes', detail: fmt(capacite) + ' pièces', limite };
            });
    }

    const pal = Math.floor(qte / config.produitsParPalette);
    const resteP = qte % config.produitsParPalette;
    const niv = Math.floor(resteP / config.produitsParNiveau);
    const boit = Math.ceil((resteP % config.produitsParNiveau) / config.produitsParBoite);
    return [
        { icone: '📦', label: 'Palettes complètes', valeur: pal + ' palettes', limite },
        { icone: '📐', label: 'Niveaux + boîtes', valeur: niv + ' niv. + ' + boit + ' boîtes', limite }
    ];
}

// Construit un item "À prévoir" pour un conditionnement L60 à partir de
// CONDITIONNEMENT_L60 (config.js) — pas de valeurs codées en dur ici, pour
// qu'une modification de la config centrale se répercute automatiquement.
function itemConditionnementL60(cfg, qte, limite) {
    const nbBoites = Math.ceil(qte / cfg.parBoite);
    const capacite = nbBoites * cfg.parBoite;
    const label = `${cfg.unite} (${fmt(cfg.parBoite)}/${cfg.labelBoite.slice(0, -1)})`;
    return {
        icone: cfg.icone,
        label,
        valeur: nbBoites + ' ' + cfg.labelBoite,
        detail: fmt(capacite) + ' ' + cfg.labelPiece,
        limite
    };
}

// ========== STRATÉGIE L60 (consommables selon le poste arrière/avant) ==========

function itemsL60(ligne, qte, limite) {
    const c = CONDITIONNEMENT_L60;
    return posteActuel === 'arriere'
        ? [itemConditionnementL60(c.arriere, qte, limite), itemConditionnementL60(c.arriereAlt, qte, limite)]
        : [itemConditionnementL60(c.avant, qte, limite), itemConditionnementL60(c.avantAlt, qte, limite)];
}

// Registre des stratégies : ajouter une ligne ici pour lui donner des
// consommables sur-mesure. Toute ligne absente de ce registre utilise
// itemsStandard automatiquement.
const CALCUL_STRATEGIES = {
    l60: itemsL60
};

// ========== ACTIONS SUR LES PALETTES / RÉINITIALISATION ==========

function modifierPalette(ligne, direction) {
    const totalInput = document.getElementById('total-' + ligne);
    let total = parseInt(totalInput.value) || 0;

    if (total <= 0 && direction === 1) {
        afficherAlerteTemporaire("⚠️ Veuillez d'abord saisir la quantité totale à produire");
        return;
    }

    const faitInput = document.getElementById('fait-' + ligne);
    let val = parseInt(faitInput.value) || 0;
    if (isNaN(val)) val = 0;
    const modif = LIGNES[ligne].produitsParPalette * direction;
    let nouvelleValeur = val + modif;
    if (total > 0 && nouvelleValeur > total) nouvelleValeur = total;
    if (nouvelleValeur < 0) nouvelleValeur = 0;
    faitInput.value = nouvelleValeur;
    sauvegarderValeur(ligne, 'fait', faitInput.value);

    // Mise à jour automatique du poids de la cuve (le poids DIMINUE quand on ajoute une palette)
    // Générique : s'applique à toute ligne ayant un colorant configuré, pas seulement l60.
    if (LIGNES[ligne].colorant) {
        const poidsInput = document.getElementById(`poids-cuve-${ligne}`);
        const checkCuve = document.getElementById(`check-cuve-${ligne}`);
        if (checkCuve && checkCuve.checked && poidsInput && poidsInput.value !== '') {
            let poidsActuel = parseFloat(poidsInput.value) || 0;
            let nouveauPoids = poidsActuel - (LIGNES[ligne].colorant * direction);
            if (nouveauPoids < 0) nouveauPoids = 0;
            poidsInput.value = nouveauPoids;
            sauvegarderPoidsCuve(ligne, nouveauPoids);
        }
    }

    calculer(ligne);
}

function reinitialiser(ligne) {
    document.getElementById('total-' + ligne).value = '';
    document.getElementById('fait-' + ligne).value = '0';

    if (LIGNES[ligne].colorant) {
        const checkCuve = document.getElementById(`check-cuve-${ligne}`);
        const poidsInput = document.getElementById(`poids-cuve-${ligne}`);
        if (checkCuve) checkCuve.checked = false;
        if (poidsInput) poidsInput.value = '';
        toggleCuveUI(ligne);
    }

    effacerSauvegardeLigne(ligne);
    calculer(ligne);
}

function toggleCuveUI(ligneId) {
    const checkCuve = document.getElementById(`check-cuve-${ligneId}`);
    const configDiv = document.getElementById(`config-cuve-${ligneId}`);
    if (checkCuve && configDiv) {
        storageSet(`${ligneId}-cuve-active`, checkCuve.checked);
        if (checkCuve.checked) {
            configDiv.classList.add('visible');
            configDiv.style.display = 'block';
        } else {
            configDiv.classList.remove('visible');
            configDiv.style.display = 'none';
            document.getElementById(`poids-cuve-${ligneId}`).value = '';
            storageRemove(`${ligneId}-cuve-poids`);
        }
        calculer(ligneId);
    }
}

// Sauvegarde le poids de la cuve à chaque saisie, pour ne pas avoir à le
// resaisir à chaque rechargement de la page.
function sauvegarderPoidsCuve(ligneId, valeur) {
    storageSet(`${ligneId}-cuve-poids`, valeur);
}

// Reset dédié à la cuve : vide le poids ET décoche le suivi,
// indépendamment du bouton RÉINITIALISER général de la ligne.
function resetCuve(ligneId) {
    const checkCuve = document.getElementById(`check-cuve-${ligneId}`);
    const poidsInput = document.getElementById(`poids-cuve-${ligneId}`);
    if (checkCuve) checkCuve.checked = false;
    if (poidsInput) poidsInput.value = '';
    storageRemove(`${ligneId}-cuve-poids`);
    storageRemove(`${ligneId}-cuve-active`);
    toggleCuveUI(ligneId);
}

function chargerToutesLesDonnees() {
    Object.keys(LIGNES).forEach(ligne => {
        const totalInput = document.getElementById('total-' + ligne);
        const faitInput = document.getElementById('fait-' + ligne);
        if (totalInput) totalInput.value = chargerValeur(ligne, 'total', '');
        if (faitInput) faitInput.value = chargerValeur(ligne, 'fait', '0');
    });
}

// Recharge l'état de la cuve (checkbox + poids) pour toutes les lignes concernées
function chargerToutesLesCuves() {
    Object.keys(LIGNES).forEach(ligne => {
        if (!LIGNES[ligne].colorant) return;
        const checkCuve = document.getElementById(`check-cuve-${ligne}`);
        const poidsInput = document.getElementById(`poids-cuve-${ligne}`);
        if (!checkCuve || !poidsInput) return;
        checkCuve.checked = storageGet(`${ligne}-cuve-active`, 'false') === 'true';
        poidsInput.value = storageGet(`${ligne}-cuve-poids`, '');
        toggleCuveUI(ligne);
    });
}

// Recharge l'état des cases de consommables optionnels (ex: notices sur CCG)
function chargerConsommablesOptionnels() {
    Object.keys(LIGNES).forEach(ligne => {
        const conso = LIGNES[ligne].consommables;
        if (!conso) return;
        conso.filter(c => c.optionnel).forEach(c => {
            const chk = document.getElementById(`conso-${ligne}-${c.id}`);
            if (chk) chk.checked = storageGet(`${ligne}-conso-${c.id}-actif`, 'false') === 'true';
        });
    });
}

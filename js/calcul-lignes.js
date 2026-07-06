// ========== CALCUL — PARTIE COMMUNE ==========
// calculer() gère la validation/progression communes à toutes les lignes,
// puis délègue l'affichage du détail (conditionnement, temps, cuve...)
// à une fonction spécifique à la ligne via CALCUL_STRATEGIES.
// Pour ajouter une ligne avec une logique particulière (comme l60),
// il suffit d'ajouter une entrée dans CALCUL_STRATEGIES plus bas,
// sans toucher au reste.

let alerteCorrigeeActive = false;

function calculer(ligne) {
    const totalInput = document.getElementById('total-' + ligne);
    const faitInput = document.getElementById('fait-' + ligne);
    let total = parseInt(totalInput.value) || 0;
    let fait = parseInt(faitInput.value) || 0;

    if (fait < 0) {
        fait = 0;
        faitInput.value = 0;
        sauvegarderValeur(ligne, 'fait', 0);
    }

    if (total <= 0) {
        document.getElementById('resultat-' + ligne).innerHTML =
            '<div class="card error">⚠️ Veuillez renseigner la quantité totale à produire</div>';
        totalInput.classList.add('total-obligatoire');
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

    const pourcent = total > 0 ? Math.min(100, (fait / total) * 100) : 0;
    const progressText = document.getElementById('progress-text-' + ligne);
    const fillDiv = document.getElementById('progress-fill-' + ligne);
    if (progressText) progressText.innerText = 'Progression: ' + pourcent.toFixed(1) + '%';
    if (fillDiv) {
        fillDiv.style.width = pourcent + '%';
        fillDiv.innerText = pourcent > 15 ? fait.toLocaleString() : '';
    }

    const resDiv = document.getElementById('resultat-' + ligne);
    const reste = Math.max(0, total - fait);

    if (reste === 0) {
        resDiv.innerHTML = '<div class="card success">✅ PRODUCTION TERMINÉE</div>';
        return;
    }

    if (correctionAppliquee && !alerteCorrigeeActive) {
        alerteCorrigeeActive = true;
        afficherAlerteTemporaire(`⚠️ Production plafonnée à ${total} pièces`);
        setTimeout(() => { alerteCorrigeeActive = false; }, 2000);
    }

    const strategie = CALCUL_STRATEGIES[ligne] || calculerStandard;
    resDiv.innerHTML = strategie(ligne, reste);
}

// ========== STRATÉGIE STANDARD (L70, L74, L87) ==========

function calculerStandard(ligne, reste) {
    const config = LIGNES[ligne];
    const pal = Math.floor(reste / config.produitsParPalette);
    const resteP = reste % config.produitsParPalette;
    const niv = Math.floor(resteP / config.produitsParNiveau);
    const boit = Math.ceil((resteP % config.produitsParNiveau) / config.produitsParBoite);
    const minTot = reste / config.vitesse;
    const hh = Math.floor(minTot / 60);
    const mm = Math.floor(minTot % 60);
    const finH = new Date(Date.now() + minTot * 60000).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

    let html = '<div class="card">';
    html += '<div class="resultat-section"><div class="resultat-title">Reste à produire</div><div class="resultat-highlight">' + reste.toLocaleString() + ' pces</div></div>';
    html += '<div class="resultat-section"><div class="resultat-title">Conditionnement</div><div>• ' + pal + ' palettes complètes<br>• ' + niv + ' niveaux + ' + boit + ' boîtes</div></div>';
    html += '<div class="resultat-section"><div class="resultat-title">Temps restant</div><div class="resultat-highlight">' + hh + 'h ' + mm + 'min</div><div>Fin estimée : ' + finH + '</div></div>';
    if (config.colorant) {
        html += '<div class="resultat-section"><div class="resultat-title">Colorant</div><div>' + ((reste / config.produitsParPalette) * config.colorant).toFixed(1) + ' kg</div></div>';
    }
    html += '</div>';
    return html;
}

// ========== STRATÉGIE L60 (poste arrière/avant + suivi de cuve) ==========

function calculerL60(ligne, reste) {
    const config = LIGNES.l60;
    const minTotales = reste / config.vitesse;
    const h = Math.floor(minTotales / 60);
    const m = Math.floor(minTotales % 60);
    const fin = new Date(Date.now() + minTotales * 60000).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    const colorant = ((reste / config.produitsParPalette) * config.colorant).toFixed(1);

    let html = '<div class="card">';
    html += '<div class="resultat-section"><div class="resultat-title">Reste à produire (Objectif)</div><div class="resultat-highlight">' + reste.toLocaleString() + ' pièces</div></div>';

    // === LOGIQUE CUVE ===
    let qte_a_produire = reste;
    let limiteCuveActive = false;
    let piecesPossiblesCuve = 0;

    const checkCuve = document.getElementById(`check-cuve-${ligne}`);
    if (checkCuve && checkCuve.checked) {
        const poidsActuel = parseFloat(document.getElementById(`poids-cuve-${ligne}`).value) || 0;

        if (poidsActuel > CUVE_SEUIL_MIN_KG) {
            const poidsUtilisable = poidsActuel - CUVE_SEUIL_MIN_KG;
            piecesPossiblesCuve = Math.floor((poidsUtilisable / config.colorant) * config.produitsParPalette);

            if (piecesPossiblesCuve < reste) {
                qte_a_produire = piecesPossiblesCuve;
                limiteCuveActive = true;
            }
        } else if (poidsActuel > 0 && poidsActuel <= CUVE_SEUIL_MIN_KG) {
            piecesPossiblesCuve = 0;
            qte_a_produire = 0;
            limiteCuveActive = true;
        }
    }

    if (limiteCuveActive) {
        html += `
            <div class="resultat-section" style="border-left-color: #e74c3c; background: #fff5f5; margin-top: 15px;">
                <div class="resultat-title" style="color: #e74c3c;">⛔ Maximum possible avec la cuve actuelle</div>
                <div class="resultat-highlight" style="color: #e74c3c; font-size: 32px;">${piecesPossiblesCuve.toLocaleString()} pièces</div>
                <div style="font-size: 13px; color: #c0392b; margin-top: 5px; font-weight: bold;">
                    (Soit ${reste - piecesPossiblesCuve} pièces de moins que l'objectif)
                </div>
            </div>
        `;
    }

    const couleur = limiteCuveActive ? '#e74c3c' : '#1a1a1a';

    if (posteActuel === 'arriere') {
        const tubesLaminesParBoite = 252;
        const nbBoitesLam = Math.ceil(qte_a_produire / tubesLaminesParBoite);
        const capaciteLam = nbBoitesLam * tubesLaminesParBoite;
        const tubesPlastiqueParBoite = 690;
        const nbBoitesPlast = Math.ceil(qte_a_produire / tubesPlastiqueParBoite);
        const capacitePlast = nbBoitesPlast * tubesPlastiqueParBoite;

        html += `<div class="resultat-section"><div class="resultat-title">Tubes laminés (252/boîte)</div><div class="resultat-highlight" style="color: ${couleur};">${nbBoitesLam} boîtes</div><div>Capacité : ${capaciteLam.toLocaleString()} tubes</div></div>`;
        html += `<div class="resultat-section"><div class="resultat-title">Tubes plastique (690/boîte)</div><div class="resultat-highlight" style="color: ${couleur};">${nbBoitesPlast} boîtes</div><div>Capacité : ${capacitePlast.toLocaleString()} tubes</div></div>`;
    } else {
        const noticesParPaquet = 1200;
        const nbPaquetsNotices = Math.ceil(qte_a_produire / noticesParPaquet);
        const capaciteNotices = nbPaquetsNotices * noticesParPaquet;
        const etuisParBoite = 230;
        const nbBoitesEtuis = Math.ceil(qte_a_produire / etuisParBoite);
        const capaciteEtuis = nbBoitesEtuis * etuisParBoite;

        html += `<div class="resultat-section"><div class="resultat-title">Paquets de notices (1 200/paquet)</div><div class="resultat-highlight" style="color: ${couleur};">${nbPaquetsNotices} paquets</div><div>Capacité : ${capaciteNotices.toLocaleString()} notices</div></div>`;
        html += `<div class="resultat-section"><div class="resultat-title">Boîtes d'étuis (230/boîte)</div><div class="resultat-highlight" style="color: ${couleur};">${nbBoitesEtuis} boîtes</div><div>Capacité : ${capaciteEtuis.toLocaleString()} étuis</div></div>`;
    }

    html += '<div class="resultat-section"><div class="resultat-title">Temps restant</div><div class="resultat-highlight">' + h + 'h ' + m + 'min</div><div>Fin estimée : ' + fin + '</div></div>';
    html += '<div class="resultat-section"><div class="resultat-title">Colorant nécessaire (pour l\'objectif)</div><div class="resultat-highlight">' + colorant + ' kg</div></div>';

    if (limiteCuveActive) {
        html += '<div style="margin-top: 15px; padding: 10px; background: #fff3cd; border-left: 4px solid #e74c3c; border-radius: 8px; font-size: 13px; color: #856404; font-weight: bold;">⚠️ Quantités de consommables limitées par la cuve</div>';
    }

    html += '</div>';
    return html;
}

// Registre des stratégies : ajouter une ligne ici pour lui donner
// un affichage/calcul sur-mesure. Toute ligne absente de ce registre
// utilise calculerStandard automatiquement.
const CALCUL_STRATEGIES = {
    l60: calculerL60
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
    if (ligne === 'l60') {
        const poidsInput = document.getElementById('poids-cuve-l60');
        const checkCuve = document.getElementById('check-cuve-l60');
        if (checkCuve && checkCuve.checked && poidsInput && poidsInput.value !== '') {
            let poidsActuel = parseFloat(poidsInput.value) || 0;
            let nouveauPoids = poidsActuel - (LIGNES.l60.colorant * direction);
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
    document.getElementById('resultat-' + ligne).innerHTML = '';
    const fill = document.getElementById('progress-fill-' + ligne);
    if (fill) { fill.style.width = '0%'; fill.innerText = ''; }
    const txt = document.getElementById('progress-text-' + ligne);
    if (txt) txt.innerText = 'Progression: 0%';

    if (ligne === 'l60') {
        const checkCuve = document.getElementById('check-cuve-l60');
        const poidsInput = document.getElementById('poids-cuve-l60');
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

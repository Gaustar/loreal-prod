// ========== MODAL RÉGLAGES (UNIFIÉ) ==========
// Un seul modal par ligne regroupant cadence, seuil cuve, contrôle qualité
// et file d'attente, plutôt que plusieurs icônes séparées.
// Cadence / seuil / heure de contrôle : édition "à froid", appliquées
// seulement au tap sur Valider (comme avant).
// File d'attente : chaque action s'applique immédiatement (voir commandes.js).

let ligneReglages = null;

function ouvrirReglagesLigne(ligne) {
    ligneReglages = ligne;
    document.getElementById('modal-reglages-title').innerText = '⚙️ Réglages — ' + LIGNES[ligne].nom;

    // Cadence
    document.getElementById('input-cadence').value = LIGNES[ligne].vitesse;

    // Seuil cuve (uniquement pour les lignes avec colorant configuré)
    const groupeSeuil = document.getElementById('groupe-seuil-cuve');
    if (LIGNES[ligne].colorant) {
        groupeSeuil.style.display = 'block';
        document.getElementById('input-seuil-cuve').value = getSeuilCuve(ligne);
    } else {
        groupeSeuil.style.display = 'none';
    }

    // Contrôle qualité
    const ref = getReferenceControle(ligne);
    document.getElementById('input-controle-heure').value =
        ref ? `${String(ref.h).padStart(2, '0')}:${String(ref.m).padStart(2, '0')}` : '';

    // File d'attente
    renderListeCommandes(ligne);

    document.getElementById('modal-reglages').classList.add('active');
}

function fermerReglagesLigne() {
    document.getElementById('modal-reglages').classList.remove('active');
    ligneReglages = null;
    commandeEnEdition = null;
}

function validerReglagesLigne() {
    if (!ligneReglages) return;
    const ligne = ligneReglages;

    const cadenceVal = parseInt(document.getElementById('input-cadence').value);
    if (cadenceVal > 0) {
        LIGNES[ligne].vitesse = cadenceVal;
        storageSet('cadence-' + ligne, cadenceVal);
    }

    if (LIGNES[ligne].colorant) {
        const seuilVal = parseFloat(document.getElementById('input-seuil-cuve').value);
        if (!isNaN(seuilVal) && seuilVal >= 0) {
            sauvegarderSeuilCuve(ligne, seuilVal);
        }
    }

    const heureVal = document.getElementById('input-controle-heure').value;
    if (heureVal) {
        sauverHeureControle(ligne, heureVal);
    }

    calculer(ligne);
    majFabControle();
    fermerReglagesLigne();
}

// Rétablit la cadence par défaut de la ligne réglée (garde le modal ouvert
// pour continuer d'autres réglages si besoin).
function resetCadenceReglages() {
    if (!ligneReglages) return;
    const defaut = CADENCES_DEFAUT[ligneReglages];
    LIGNES[ligneReglages].vitesse = defaut;
    storageRemove('cadence-' + ligneReglages);
    document.getElementById('input-cadence').value = defaut;
    calculer(ligneReglages);
}

// Désactive le contrôle qualité de la ligne réglée (utile quand on est au
// poste "arrière" et que ce n'est pas soi qui fait le contrôle).
function resetControleReglages() {
    if (!ligneReglages) return;
    storageRemove(`${ligneReglages}-controle-heure`);
    storageRemove(`${ligneReglages}-controle-fait-periode`);
    document.getElementById('input-controle-heure').value = '';
    majFabControle();
}

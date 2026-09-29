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
    poserCouleurLigne(document.getElementById('modal-reglages'), LIGNES[ligne].couleur);

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

    const cadenceVal = parseFloat(document.getElementById('input-cadence').value);
    if (cadenceVal > 0) {
        LIGNES[ligne].vitesse = cadenceVal;
        storageSet('cadence-' + ligne, cadenceVal);
    }

    if (LIGNES[ligne].colorant) {
        const seuilVal = parseFloat(document.getElementById('input-seuil-cuve').value);
        if (!isNaN(seuilVal) && seuilVal >= 0) {
            sauvegarderSeuilCuve(ligne, seuilVal);
            majLabelCuve(ligne);
        }
    }

    const heureVal = document.getElementById('input-controle-heure').value;
    if (heureVal) {
        sauverHeureControle(ligne, heureVal);
    } else {
        storageRemove(`${ligne}-controle-heure`);
        storageRemove(`${ligne}-controle-fait-periode`);
    }

    calculer(ligne);
    majFabControle();
    fermerReglagesLigne();
}

// Rétablit la cadence par défaut de la ligne réglée dans le champ uniquement
// (modification "à froid" comme le reste de la section Cadence : rien n'est
// appliqué/persisté tant que Valider n'est pas tapé — un Fermer juste après
// abandonne donc ce reset, comme n'importe quel autre changement du champ).
function resetCadenceReglages() {
    if (!ligneReglages) return;
    document.getElementById('input-cadence').value = CADENCES_DEFAUT[ligneReglages];
}

// Vide le champ heure de contrôle qualité (modification "à froid", comme
// resetCadenceReglages ci-dessus). L'effacement réel du réglage ne se
// produit qu'au tap sur Valider (voir validerReglagesLigne).
function resetControleReglages() {
    if (!ligneReglages) return;
    document.getElementById('input-controle-heure').value = '';
}

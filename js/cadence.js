// ========== CADENCE (logique) ==========
// La gestion du modal (ouverture/sauvegarde/reset) est centralisée dans
// js/reglages.js, qui regroupe cadence + seuil cuve + contrôle qualité +
// file d'attente dans un seul menu par ligne.

function chargerCadences() {
    Object.keys(LIGNES).forEach(ligne => {
        const saved = storageGet('cadence-' + ligne, null);
        if (saved && !isNaN(parseInt(saved))) LIGNES[ligne].vitesse = parseInt(saved);
    });
}

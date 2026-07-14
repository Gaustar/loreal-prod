// ========== CADENCE ==========
let ligneEnCoursReglage = null;

function chargerCadences() {
    Object.keys(LIGNES).forEach(ligne => {
        const saved = storageGet('cadence-' + ligne, null);
        if (saved && !isNaN(parseInt(saved))) LIGNES[ligne].vitesse = parseInt(saved);
    });
}

function ouvrirReglageCadence(ligne) {
    ligneEnCoursReglage = ligne;
    document.getElementById('modal-cadence-title').innerText = '🔩 Ligne ' + LIGNES[ligne].nom;
    document.getElementById('input-cadence').value = LIGNES[ligne].vitesse;

    const groupeSeuil = document.getElementById('groupe-seuil-cuve');
    if (LIGNES[ligne].colorant) {
        groupeSeuil.style.display = 'block';
        document.getElementById('input-seuil-cuve').value = getSeuilCuve(ligne);
    } else {
        groupeSeuil.style.display = 'none';
    }

    document.getElementById('modal-cadence').classList.add('active');
    setTimeout(() => document.getElementById('input-cadence').select(), 100);
}

function fermerReglageCadence() {
    document.getElementById('modal-cadence').classList.remove('active');
    ligneEnCoursReglage = null;
}

function sauverCadence() {
    if (!ligneEnCoursReglage) return;
    const val = parseInt(document.getElementById('input-cadence').value);
    if (val > 0) {
        LIGNES[ligneEnCoursReglage].vitesse = val;
        storageSet('cadence-' + ligneEnCoursReglage, val);
    }
    if (LIGNES[ligneEnCoursReglage].colorant) {
        const seuilVal = parseFloat(document.getElementById('input-seuil-cuve').value);
        if (!isNaN(seuilVal) && seuilVal >= 0) {
            sauvegarderSeuilCuve(ligneEnCoursReglage, seuilVal);
        }
    }
    calculer(ligneEnCoursReglage);
    fermerReglageCadence();
}

function resetCadence() {
    if (!ligneEnCoursReglage) return;
    const defaut = CADENCES_DEFAUT[ligneEnCoursReglage];
    LIGNES[ligneEnCoursReglage].vitesse = defaut;
    storageRemove('cadence-' + ligneEnCoursReglage);
    document.getElementById('input-cadence').value = defaut;
    calculer(ligneEnCoursReglage);
    fermerReglageCadence();
}

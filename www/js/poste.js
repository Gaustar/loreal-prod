// ========== POSTE L60 ==========
// La ligne L60 est la seule à avoir deux postes de travail (arrière/avant),
// avec des consommables différents. Voir calcul-lignes.js pour l'impact
// du poste sur le calcul.

let posteActuel = "arriere";

function initialiserPoste() {
    const saved = storageGet('l60-poste', 'arriere');
    posteActuel = (saved === 'avant' || saved === 'arriere') ? saved : 'arriere';
    mettreAJourBoutonsPoste();
}

function mettreAJourBoutonsPoste() {
    const bandeau = document.getElementById('poste-bandeau-l60');
    if (!bandeau) return;
    const arriere = posteActuel === 'arriere';
    bandeau.className = 'poste-bandeau ' + (arriere ? 'poste-arriere' : 'poste-avant');
    bandeau.innerHTML = `<span class="poste-nom">${arriere ? '🔧 Poste arrière' : '📦 Poste avant'}<small>${arriere ? 'remplissage' : 'qualité'}</small></span><span class="poste-changer">Changer ⇄</span>`;
}

function basculerPoste() {
    changerPoste(posteActuel === 'arriere' ? 'avant' : 'arriere');
}

function changerPoste(poste) {
    posteActuel = poste;
    storageSet('l60-poste', poste);
    mettreAJourBoutonsPoste();
    calculer('l60');
}

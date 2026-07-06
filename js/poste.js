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
    const btns = document.querySelectorAll('#poste-selector-l60 .poste-btn');
    btns.forEach(btn => {
        const p = btn.getAttribute('data-poste');
        btn.classList.toggle('active', p === posteActuel);
    });
}

function changerPoste(poste) {
    posteActuel = poste;
    storageSet('l60-poste', poste);
    mettreAJourBoutonsPoste();
    calculer('l60');
}

function attacherEvenementsPoste() {
    const selector = document.getElementById('poste-selector-l60');
    if (selector) {
        selector.querySelectorAll('.poste-btn').forEach(btn => {
            btn.addEventListener('click', () => changerPoste(btn.getAttribute('data-poste')));
        });
    }
}

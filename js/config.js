// ========== CONFIGURATION CENTRALISÉE ==========
// Toute nouvelle ligne de production s'ajoute ici.
// Si une ligne a besoin d'une logique de calcul spécifique (comme l60),
// voir js/calcul-lignes.js pour enregistrer une stratégie dédiée.

const LIGNES = {
    l60: {
        nom: "Excellence",
        produitsParPalette: 720,
        produitsParNiveau: 120,
        produitsParBoite: 6,
        vitesse: 72,
        colorant: 35,
        hasPoste: true
    },
    ccg: {
        nom: "Casting Crème Gloss (CCG)",
        produitsParPalette: 828,
        produitsParNiveau: 138,
        produitsParBoite: 6,
        vitesse: 103.5,
        colorant: 42,
        consommables: [
            { id: 'tubes', label: 'Tubes (252/boîte)', parBoite: 252, optionnel: false, icone: '🧴' },
            { id: 'etuis', label: 'Étuis (225/boîte)', parBoite: 225, optionnel: false, icone: '📦' },
            { id: 'notices', label: 'Notices (1 200/paquet)', parBoite: 1200, optionnel: true, icone: '📄' }
        ]
    },
    l87: {
        nom: "L87",
        produitsParPalette: 1920,
        produitsParNiveau: 384,
        produitsParBoite: 6,
        vitesse: 75
    }
};

const CADENCES_DEFAUT = { l60: 72, ccg: 103.5, l87: 75 };

// Ligne actuellement affichée (onglet actif) — utilisée par le FAB
// de contrôle qualité pour savoir quel décompte afficher.
let ligneActiveCourante = null;

const SHIFTS = {
    matin: { debut: { h: 6, m: 5 }, fin: { h: 14, m: 5 }, label: 'Shift Matin ☀️' },
    aprem: { debut: { h: 13, m: 55 }, fin: { h: 21, m: 55 }, label: 'Shift Après-midi 🌤️' }
};

// Constantes de conditionnement spécifiques au poste de la ligne l60
const CONDITIONNEMENT_L60 = {
    arriere: { unite: 'Tubes laminés', parBoite: 252, labelBoite: 'boîtes', labelPiece: 'tubes' },
    arriereAlt: { unite: 'Tubes plastique', parBoite: 690, labelBoite: 'boîtes', labelPiece: 'tubes' },
    avant: { unite: 'Paquets de notices', parBoite: 1200, labelBoite: 'paquets', labelPiece: 'notices' },
    avantAlt: { unite: "Boîtes d'étuis", parBoite: 230, labelBoite: 'boîtes', labelPiece: 'étuis' }
};

// Valeur de seuil cuve utilisée tant qu'aucune valeur personnalisée n'a
// été réglée pour la ligne (voir getSeuilCuve dans calcul-lignes.js).
const SEUIL_CUVE_DEFAUT = 50;

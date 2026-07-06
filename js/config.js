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
    l70: {
        nom: "L70",
        produitsParPalette: 828,
        produitsParNiveau: 138,
        produitsParBoite: 6,
        vitesse: 150
    },
    l74: {
        nom: "L74",
        produitsParPalette: 828,
        produitsParNiveau: 138,
        produitsParBoite: 6,
        vitesse: 130
    },
    l87: {
        nom: "L87",
        produitsParPalette: 1920,
        produitsParNiveau: 384,
        produitsParBoite: 6,
        vitesse: 75
    }
};

const CADENCES_DEFAUT = { l60: 72, l70: 150, l74: 130, l87: 75 };

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

const CUVE_SEUIL_MIN_KG = 50;

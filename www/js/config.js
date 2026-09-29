// ========== CONFIGURATION CENTRALISÉE ==========
// Toute nouvelle ligne de production s'ajoute ici.
// Si une ligne a besoin d'une logique de calcul spécifique (comme l60),
// voir js/calcul-lignes.js pour enregistrer une stratégie dédiée.
// nomCourt : libellé de l'onglet (doit tenir sur une rangée à 4 lignes).
// couleur  : couleur d'identification de la ligne (onglet, bandeau, carte),
//            pour voir d'un coup d'œil sur quelle ligne on saisit. Reprend la
//            couleur de l'étui actuel (relevée sur photos, sept. 2026) :
//            Excellence = bloc logo doré, CCG = bloc fuchsia, Color
//            Sensation = bloc rouge. L87 : gamme inconnue, vert neutre.

const LIGNES = {
    l60: {
        nom: "Excellence",
        nomCourt: "Excellence",
        couleur: "#D1B28A",
        produitsParPalette: 720,
        produitsParNiveau: 120,
        produitsParBoite: 6,
        vitesse: 72,
        colorant: 35,
        hasPoste: true
    },
    ccg: {
        nom: "Casting Crème Gloss",
        nomCourt: "CCG",
        couleur: "#D82D88",
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
    l72: {
        nom: "Color Sensation",
        nomCourt: "Color S.",
        couleur: "#870C27",
        produitsParPalette: 1260,
        produitsParNiveau: 210,
        produitsParBoite: 6,
        vitesse: 100,
        colorant: 42,
        consommables: [
            { id: 'lamine',  label: 'Tubes laminés (383/boîte)', parBoite: 383, optionnel: false, icone: '🧴' },
            { id: 'etuis',   label: 'Étuis (240/boîte)',          parBoite: 240, optionnel: false, icone: '📦' },
            { id: 'notices', label: 'Notices (500/paquet)',       parBoite: 500, optionnel: true,  icone: '📄' }
        ]
    },
    l87: {
        nom: "L87",
        nomCourt: "L87",
        couleur: "#3CC48F",
        produitsParPalette: 1920,
        produitsParNiveau: 384,
        produitsParBoite: 6,
        vitesse: 75
    }
};

// Cadences d'usine, relevées avant que chargerCadences() n'applique les
// cadences personnalisées : une seule source de vérité (LIGNES).
const CADENCES_DEFAUT = Object.fromEntries(
    Object.entries(LIGNES).map(([id, l]) => [id, l.vitesse])
);

// Durées proposées pour le chrono de pause (minutes). 0 = chrono libre.
const PAUSES_PRESETS = [10, 15, 20, 30, 0];

// Ligne actuellement affichée (onglet actif) — utilisée par le FAB
// de contrôle qualité pour savoir quel décompte afficher.
let ligneActiveCourante = null;

const SHIFTS = {
    matin: { debut: { h: 6, m: 5 }, fin: { h: 14, m: 5 }, label: 'Shift Matin ☀️' },
    aprem: { debut: { h: 13, m: 55 }, fin: { h: 21, m: 55 }, label: 'Shift Après-midi 🌤️' }
};

// Constantes de conditionnement spécifiques au poste de la ligne l60
const CONDITIONNEMENT_L60 = {
    arriere: { icone: '🧴', unite: 'Tubes laminés', parBoite: 252, labelBoite: 'boîtes', labelPiece: 'tubes' },
    arriereAlt: { icone: '🧴', unite: 'Tubes plastique', parBoite: 690, labelBoite: 'boîtes', labelPiece: 'tubes' },
    avant: { icone: '📄', unite: 'Paquets de notices', parBoite: 1200, labelBoite: 'paquets', labelPiece: 'notices' },
    avantAlt: { icone: '📦', unite: "Boîtes d'étuis", parBoite: 230, labelBoite: 'boîtes', labelPiece: 'étuis' }
};

// Valeur de seuil cuve utilisée tant qu'aucune valeur personnalisée n'a
// été réglée pour la ligne (voir getSeuilCuve dans calcul-lignes.js).
const SEUIL_CUVE_DEFAUT = 50;

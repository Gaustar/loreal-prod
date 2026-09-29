// ========== STOCKAGE ==========
// Wrapper localStorage : toutes les autres modules passent par ici,
// jamais d'appel direct à localStorage ailleurs dans le code.

function storageSet(key, value) {
    try { localStorage.setItem(key, value); } catch (e) {}
}

function storageGet(key, def) {
    try {
        const val = localStorage.getItem(key);
        return val !== null ? val : def;
    } catch (e) {
        return def;
    }
}

function storageRemove(key) {
    try { localStorage.removeItem(key); } catch (e) {}
}

// Raccourcis spécifiques aux valeurs de production par ligne
function sauvegarderValeur(ligne, champ, valeur) {
    storageSet(ligne + '-' + champ, valeur);
}

function chargerValeur(ligne, champ, def) {
    return storageGet(ligne + '-' + champ, def);
}

function effacerSauvegardeLigne(ligne) {
    storageRemove(ligne + '-total');
    storageRemove(ligne + '-fait');
}

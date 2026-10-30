// Vérif rapide du calcul de réintégration : node tests/reintegration.check.js
const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

const store = {};
const ctx = { storageGet: (k, d) => (k in store ? store[k] : d), storageSet: (k, v) => { store[k] = String(v); } };
vm.createContext(ctx);
for (const f of ['config.js', 'reintegration.js']) {
    vm.runInContext(fs.readFileSync(__dirname + '/../www/js/' + f, 'utf8'), ctx);
}
const { calculReintegration, quantitePalette, enNiveaux } = ctx;
const lamine = vm.runInContext('AC_L60.arriere[0]', ctx);

// Exemple de la feuille : 5 040 + 3 niv + 2 boîtes + 2 palettes pleines, objectif 19 000
const recu = 5040 + quantitePalette(lamine, 3, 2) + 2 * quantitePalette(lamine, lamine.niveaux, 0);
assert.strictEqual(quantitePalette(lamine, 3, 2), 3528);
assert.strictEqual(recu, 24696);
const r = calculReintegration(lamine, recu, 19000);
assert.strictEqual(r.garder, 19152);
assert.strictEqual(r.renvoyer, 5544);
assert.strictEqual(enNiveaux(lamine, r.boites), '5 niveaux + 2 boîtes');

// Pas assez reçu
assert.strictEqual(calculReintegration(lamine, 8064, 19000).manque, 10936);
// Pile une boîte : rien à renvoyer
assert.strictEqual(calculReintegration(lamine, 252, 252).renvoyer, 0);
assert.strictEqual(enNiveaux(lamine, 1), '1 boîte');

// « Commande suivante » : 19 000 faits puis 5 000 avec le même stock → renvoyer 504, pas 19 656
vm.runInContext("ecrireAC('lamine', { palettes: [24696], objectifsPasses: 0 }); cumulerObjectifAC(19000);", ctx);
const etat = vm.runInContext("lireAC('lamine')", ctx);
assert.strictEqual(etat.objectifsPasses, 19000);
assert.strictEqual(calculReintegration(lamine, 24696, etat.objectifsPasses + 5000).renvoyer, 504);
// Un AC sans palette reçue ne cumule rien
assert.strictEqual(vm.runInContext("lireAC('notices').objectifsPasses", ctx), 0);

console.log('OK');

// Vérif rapide du calcul de réintégration : node tests/reintegration.check.js
const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

const ctx = { storageGet: () => '', storageSet: () => {} };
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

console.log('OK');

// Vérif rapide des échéances « À anticiper » : node tests/anticiper.check.js
const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

const store = {};
const ctx = { localStorage: {
    getItem: k => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: k => { delete store[k]; }
} };
vm.createContext(ctx);
for (const f of ['config.js', 'storage.js', 'shift-timer.js', 'pause.js', 'controle-qualite.js', 'anticiper.js']) {
    vm.runInContext(fs.readFileSync(__dirname + '/../www/js/' + f, 'utf8'), ctx);
}

const now = new Date(2026, 9, 30, 9, 52);   // 9h52, shift du matin

// Rien de configuré : seule la fin du shift apparaît
let items = ctx.echeancesAnticiper('l60', now);
assert.strictEqual(JSON.stringify(items.map(i => i.icone)), JSON.stringify(['🏁']));

// Contrôle à 08:00 (toutes les heures) → dû à 10:00, dans 8 min, urgent ; repas 12:00
store['l60-controle-heure'] = '08:00';
store['repas-actif'] = 'true';
store['repas-heure'] = '12:00';
items = ctx.echeancesAnticiper('l60', now);
assert.strictEqual(JSON.stringify(items.map(i => i.icone)), JSON.stringify(['🔍', '🍴', '🏁']));   // trié du plus proche au plus lointain
assert.strictEqual(items[0].valeur, 'dans 8 min');
assert.strictEqual(items[0].urgent, true);
assert.strictEqual(items[1].valeur, 'dans 2h08');

// Repas déjà passé : il disparaît
store['repas-heure'] = '09:00';
assert.ok(!ctx.echeancesAnticiper('l60', now).some(i => i.icone === '🍴'));

console.log('OK');

// ========== TIMER SHIFT ==========
let shiftInterval = null;
let shiftActuel = 'matin';

function getShiftWindow(type, now) {
    let start = new Date(now);
    start.setHours(SHIFTS[type].debut.h, SHIFTS[type].debut.m, 0, 0);
    let end = new Date(now);
    end.setHours(SHIFTS[type].fin.h, SHIFTS[type].fin.m, 0, 0);

    if (now < start) return { start, end, status: 'avant' };
    if (now > end) {
        let nextStart = new Date(now);
        nextStart.setDate(now.getDate() + 1);
        nextStart.setHours(SHIFTS[type].debut.h, SHIFTS[type].debut.m, 0, 0);
        let nextEnd = new Date(now);
        nextEnd.setDate(now.getDate() + 1);
        nextEnd.setHours(SHIFTS[type].fin.h, SHIFTS[type].fin.m, 0, 0);
        return { start: nextStart, end: nextEnd, status: 'futur' };
    }
    return { start, end, status: 'pendant' };
}

function detecterShiftAuto() {
    const now = new Date();
    const heureActuelle = now.getHours() * 60 + now.getMinutes();
    const debutAprem = 13 * 60 + 55;
    const finMatin = 14 * 60 + 5;
    if (heureActuelle < debutAprem) return 'matin';
    if (heureActuelle >= debutAprem && heureActuelle < finMatin) return 'aprem';
    return 'aprem';
}

function ouvrirTimerShift() {
    shiftActuel = detecterShiftAuto();
    appliquerShiftUI();
    chargerRepas();
    document.getElementById('modal-shift').classList.add('active');
    majTimerShift();
    if (shiftInterval) clearInterval(shiftInterval);
    shiftInterval = setInterval(majTimerShift, 1000);
}

function fermerTimerShift() {
    document.getElementById('modal-shift').classList.remove('active');
    if (shiftInterval) clearInterval(shiftInterval);
}

function choisirShift(type) {
    shiftActuel = type;
    appliquerShiftUI();
    majTimerShift();
}

function appliquerShiftUI() {
    document.getElementById('btn-shift-matin').classList.toggle('active', shiftActuel === 'matin');
    document.getElementById('btn-shift-aprem').classList.toggle('active', shiftActuel === 'aprem');
}

function majTimerShift() {
    const now = new Date();
    const windowInfo = getShiftWindow(shiftActuel, now);
    const { start, end, status } = windowInfo;

    let remainSec, pourcent;
    let finTexte = `Fin du shift à ${String(SHIFTS[shiftActuel].fin.h).padStart(2, '0')}h${String(SHIFTS[shiftActuel].fin.m).padStart(2, '0')}`;

    if (status === 'avant') {
        remainSec = (start - now) / 1000;
        document.getElementById('shift-countdown').innerText = formatTime(remainSec);
        document.getElementById('shift-progress-fill').style.width = '0%';
        document.getElementById('shift-progress-text').innerText = "Le shift n'a pas encore commencé";
        document.getElementById('shift-end-time').innerHTML = `Début à ${String(SHIFTS[shiftActuel].debut.h).padStart(2, '0')}h${String(SHIFTS[shiftActuel].debut.m).padStart(2, '0')}`;
        return;
    } else if (status === 'futur') {
        remainSec = (start - now) / 1000;
        document.getElementById('shift-countdown').innerText = formatTime(remainSec);
        document.getElementById('shift-progress-fill').style.width = '0%';
        document.getElementById('shift-progress-text').innerText = "Prochain shift";
        document.getElementById('shift-end-time').innerHTML = `Début demain à ${String(SHIFTS[shiftActuel].debut.h).padStart(2, '0')}h${String(SHIFTS[shiftActuel].debut.m).padStart(2, '0')}`;
        return;
    } else {
        const totalSec = (end - start) / 1000;
        const elapsedSec = (now - start) / 1000;
        remainSec = Math.max(0, totalSec - elapsedSec);
        pourcent = Math.min(100, (elapsedSec / totalSec) * 100);
        document.getElementById('shift-countdown').innerText = formatTime(remainSec);
        document.getElementById('shift-progress-fill').style.width = pourcent + '%';
        document.getElementById('shift-progress-text').innerText = pourcent.toFixed(1) + '% du shift effectué';
        document.getElementById('shift-end-time').innerHTML = finTexte;
    }

    const countdownEl = document.getElementById('shift-countdown');
    if (remainSec === 0) countdownEl.style.color = '#C5A028';
    else if (remainSec < 3600) countdownEl.style.color = '#2ecc71';
    else countdownEl.style.color = '#ffffff';

    majTimerRepas();
}

function formatTime(sec) {
    if (sec < 0) sec = 0;
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = Math.floor(sec % 60);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function chargerRepas() {
    const actif = storageGet('repas-actif', 'false') === 'true';
    const heure = storageGet('repas-heure', '12:00');
    document.getElementById('repas-actif').checked = actif;
    document.getElementById('repas-heure').value = heure;
    document.getElementById('repas-config').classList.toggle('visible', actif);
    majTimerRepas();
}

function toggleRepas() {
    const actif = document.getElementById('repas-actif').checked;
    storageSet('repas-actif', actif);
    document.getElementById('repas-config').classList.toggle('visible', actif);
    majTimerRepas();
}

function sauverHeureRepas() {
    storageSet('repas-heure', document.getElementById('repas-heure').value);
    majTimerRepas();
}

function majTimerRepas() {
    const actif = document.getElementById('repas-actif').checked;
    if (!actif) return;
    const heure = document.getElementById('repas-heure').value;
    if (!heure) return;
    const [h, m] = heure.split(':').map(Number);
    const now = new Date();
    const repas = new Date(now);
    repas.setHours(h, m, 0, 0);
    const diff = (repas - now) / 1000;
    const el = document.getElementById('repas-countdown');
    const lbl = document.getElementById('repas-label');
    if (diff > 0) {
        el.innerText = formatTime(diff);
        el.classList.remove('passe');
        lbl.innerText = 'avant la pause 🍴';
    } else {
        const passe = Math.abs(diff);
        el.innerText = formatTime(passe);
        el.classList.add('passe');
        lbl.innerText = 'depuis la pause ✅';
    }
}

// ========== À ANTICIPER : ÉCHÉANCES HORAIRES ==========
// Regroupe ce qui arrive bientôt (contrôle qualité, pause, repas, fin du
// shift), le plus proche en premier, en tête du bloc « À anticiper ».
// Aucune nouvelle donnée : tout vient des modules existants.

let anticiperInterval = null;

function heureCourte(date) {
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

function dansMinutes(min) {
    min = Math.max(0, Math.round(min));
    if (min < 60) return `dans ${min} min`;
    return `dans ${Math.floor(min / 60)}h${String(min % 60).padStart(2, '0')}`;
}

// Renvoie [{ icone, label, valeur, minutes, urgent }] trié par minutes croissantes.
function echeancesAnticiper(ligne, now) {
    const items = [];

    const periode = calculerPeriodeControle(ligne, now);
    if (periode) {
        const min = (periode.prochaineEcheance - now) / 60000;
        if (estControleFait(ligne, periode.periodeDebut)) {
            items.push({ icone: '✅', label: 'Contrôle qualité fait', valeur: 'prochain à ' + heureCourte(periode.prochaineEcheance), minutes: min });
        } else {
            items.push({ icone: '🔍', label: 'Contrôle qualité à faire', valeur: dansMinutes(min), minutes: min, urgent: min <= 10 });
        }
    }

    const pause = getPause();
    if (pause) {
        const libre = pause.duree === 0;
        items.push({
            icone: '☕', label: 'Pause en cours', minutes: libre ? 0 : pause.resteSec / 60,
            valeur: libre ? `depuis ${Math.floor(pause.ecouleSec / 60)} min` : pause.resteSec > 0 ? 'fin ' + dansMinutes(pause.resteSec / 60) : 'dépassée',
            urgent: !libre && pause.resteSec <= 0
        });
    }

    const heureRepas = storageGet('repas-heure', '');
    if (storageGet('repas-actif', 'false') === 'true' && heureRepas) {
        const [h, m] = heureRepas.split(':').map(Number);
        const repas = new Date(now);
        repas.setHours(h, m, 0, 0);
        if (repas > now) items.push({ icone: '🍴', label: 'Pause repas à ' + heureCourte(repas), valeur: dansMinutes((repas - now) / 60000), minutes: (repas - now) / 60000 });
    }

    const shift = getShiftWindow(detecterShiftAuto(), now);
    if (shift.status === 'pendant') {
        items.push({ icone: '🏁', label: 'Fin du shift à ' + heureCourte(shift.end), valeur: dansMinutes((shift.end - now) / 60000), minutes: (shift.end - now) / 60000 });
    }

    return items.sort((a, b) => a.minutes - b.minutes);
}

function majAnticiper() {
    const now = new Date();
    Object.keys(LIGNES).forEach(ligne => {
        const div = document.getElementById('anticiper-temps-' + ligne);
        if (!div) return;
        div.innerHTML = echeancesAnticiper(ligne, now).map(it => `
            <div class="apprevoir-ligne${it.urgent ? ' anticiper-urgent' : ''}">
                <span class="apprevoir-icone">${it.icone}</span>
                <span class="apprevoir-label">${it.label}</span>
                <span class="apprevoir-valeur">${it.valeur}</span>
            </div>`).join('');
    });
}

function initAnticiper() {
    majAnticiper();
    if (anticiperInterval) clearInterval(anticiperInterval);
    anticiperInterval = setInterval(majAnticiper, 15000);
}

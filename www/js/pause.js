// ========== CHRONO DE PAUSE ==========
// Minuteur de pause (durée au choix, voir PAUSES_PRESETS) ou chrono libre
// (durée 0). L'heure de début est mémorisée : la pause continue de tourner
// si l'app est fermée ou mise en arrière-plan. Pendant une pause, le bouton
// ⏱️ affiche le temps restant ; une fois la durée dépassée, il passe en rouge
// et affiche le dépassement. Pas de notification système (hors périmètre) :
// seulement une vibration + un message si l'app est ouverte à ce moment-là.

let pauseInterval = null;

function getPause() {
    const debut = parseInt(storageGet('pause-debut', ''));
    if (isNaN(debut)) return null;
    const duree = parseInt(storageGet('pause-duree', '0')) || 0;
    const ecouleSec = Math.max(0, (Date.now() - debut) / 1000);
    return { debut, duree, ecouleSec, resteSec: duree * 60 - ecouleSec };
}

function lancerPause(minutes) {
    storageSet('pause-debut', Date.now());
    storageSet('pause-duree', minutes);
    storageRemove('pause-alerte');
    majPause();
    majAnticiper();
}

function arreterPause() {
    storageRemove('pause-debut');
    storageRemove('pause-duree');
    storageRemove('pause-alerte');
    majPause();
    majAnticiper();
}

function formatMinSec(sec) {
    sec = Math.floor(Math.abs(sec));
    return `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`;
}

function majPause() {
    const pause = getPause();
    const fab = document.getElementById('fab-timer');
    const blocInactif = document.getElementById('pause-inactive');
    const blocActif = document.getElementById('pause-active');

    if (!pause) {
        fab.innerText = '⏱️';
        fab.classList.remove('fab-pause', 'fab-pause-depassee');
        blocInactif.style.display = '';
        blocActif.style.display = 'none';
        return;
    }

    blocInactif.style.display = 'none';
    blocActif.style.display = '';
    const countdown = document.getElementById('pause-countdown');
    const label = document.getElementById('pause-label');
    const fill = document.getElementById('pause-progress-fill');
    const barre = fill.parentElement;

    let texte, depasse = false;
    if (pause.duree === 0) {
        texte = formatMinSec(pause.ecouleSec);
        label.innerText = 'de pause écoulées (chrono libre)';
        barre.style.display = 'none';
    } else if (pause.resteSec > 0) {
        texte = formatMinSec(pause.resteSec);
        label.innerText = `restantes sur ${pause.duree} min de pause`;
        barre.style.display = '';
        fill.style.width = Math.min(100, (pause.ecouleSec / (pause.duree * 60)) * 100) + '%';
    } else {
        depasse = true;
        texte = '+' + formatMinSec(pause.resteSec);
        label.innerText = `de dépassement (pause de ${pause.duree} min)`;
        barre.style.display = '';
        fill.style.width = '100%';
        if (storageGet('pause-alerte', null) !== '1') {
            storageSet('pause-alerte', '1');
            if (navigator.vibrate) navigator.vibrate([300, 150, 300]);
            afficherAlerteTemporaire('☕ Fin de la pause !');
        }
    }

    countdown.innerText = texte;
    countdown.classList.toggle('depasse', depasse);
    fab.innerText = texte;
    fab.classList.add('fab-pause');
    fab.classList.toggle('fab-pause-depassee', depasse);
}

function initPause() {
    document.getElementById('pause-presets').innerHTML = PAUSES_PRESETS.map(min =>
        `<button class="btn btn-secondaire" onclick="lancerPause(${min})">${min === 0 ? '⏱ Chrono' : min + ' min'}</button>`
    ).join('');
    majPause();
    if (pauseInterval) clearInterval(pauseInterval);
    pauseInterval = setInterval(majPause, 1000);
}

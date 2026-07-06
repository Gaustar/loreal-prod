// ========== CONTRÔLE QUALITÉ HORAIRE ==========
// Chaque ligne a sa propre heure de référence pour le contrôle qualité,
// répété toutes les heures à partir de cette heure (ex: réglée à 08:00
// → contrôles dus à 8h, 9h, 10h...).
// Le bouton flottant "fab-controle" affiche toujours le décompte de la
// ligne actuellement affichée (onglet actif, voir ligneActiveCourante
// dans ui.js) et sert aussi à valider le contrôle d'un tap.
// Si l'heure passe sans validation, le décompte repart simplement pour
// l'échéance suivante (pas d'alerte bloquante).

let controleInterval = null;
let ligneEnCoursReglageControle = null;

function getReferenceControle(ligne) {
    const val = storageGet(`${ligne}-controle-heure`, null);
    if (!val) return null;
    const [h, m] = val.split(':').map(Number);
    return { h, m };
}

function sauverHeureControle(ligne, heure) {
    storageSet(`${ligne}-controle-heure`, heure);
}

// Calcule le début de la période de contrôle en cours et l'échéance suivante
function calculerPeriodeControle(ligne, now) {
    const ref = getReferenceControle(ligne);
    if (!ref) return null;

    let ancre = new Date(now);
    ancre.setHours(ref.h, ref.m, 0, 0);

    // Recule jusqu'à la dernière échéance passée (ou égale à maintenant)
    while (ancre > now) {
        ancre = new Date(ancre.getTime() - 3600000);
    }
    // Avance jusqu'à la première échéance strictement future
    let prochaine = new Date(ancre.getTime() + 3600000);
    while (prochaine <= now) {
        ancre = prochaine;
        prochaine = new Date(prochaine.getTime() + 3600000);
    }
    return { periodeDebut: ancre, prochaineEcheance: prochaine };
}

function estControleFait(ligne, periodeDebut) {
    return storageGet(`${ligne}-controle-fait-periode`, null) === periodeDebut.toISOString();
}

function validerControle(ligne) {
    const periode = calculerPeriodeControle(ligne, new Date());
    if (!periode) return;
    storageSet(`${ligne}-controle-fait-periode`, periode.periodeDebut.toISOString());
    majFabControle();
}

function ouvrirReglageControle(ligne) {
    ligneEnCoursReglageControle = ligne;
    const ref = getReferenceControle(ligne);
    document.getElementById('modal-controle-title').innerText = '🕐 Contrôle qualité — ' + LIGNES[ligne].nom;
    document.getElementById('input-controle-heure').value =
        ref ? `${String(ref.h).padStart(2, '0')}:${String(ref.m).padStart(2, '0')}` : '';
    document.getElementById('modal-controle').classList.add('active');
}

function fermerReglageControle() {
    document.getElementById('modal-controle').classList.remove('active');
    ligneEnCoursReglageControle = null;
}

function sauverReglageControle() {
    if (!ligneEnCoursReglageControle) return;
    const val = document.getElementById('input-controle-heure').value;
    if (val) {
        sauverHeureControle(ligneEnCoursReglageControle, val);
        majFabControle();
    }
    fermerReglageControle();
}

function majFabControle() {
    const fab = document.getElementById('fab-controle');
    if (!fab) return;

    const ligne = ligneActiveCourante || Object.keys(LIGNES)[0];
    const periode = calculerPeriodeControle(ligne, new Date());

    if (!periode) {
        fab.innerText = '🕐';
        fab.title = 'Contrôle qualité non configuré — ' + LIGNES[ligne].nom;
        fab.classList.remove('fab-controle-fait');
        return;
    }

    const now = new Date();
    const remainSec = Math.max(0, (periode.prochaineEcheance - now) / 1000);
    const fait = estControleFait(ligne, periode.periodeDebut);

    const m = Math.floor(remainSec / 60);
    const s = Math.floor(remainSec % 60);
    fab.innerText = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    fab.title = (fait ? '✅ Contrôle fait — ' : '⏳ Contrôle à faire — ') + LIGNES[ligne].nom;
    fab.classList.toggle('fab-controle-fait', fait);
}

function clicFabControle() {
    const ligne = ligneActiveCourante || Object.keys(LIGNES)[0];
    const ref = getReferenceControle(ligne);
    if (!ref) {
        ouvrirReglageControle(ligne);
        return;
    }
    validerControle(ligne);
    afficherAlerteTemporaire('✅ Contrôle qualité validé — ' + LIGNES[ligne].nom);
}

function initControleQualite() {
    majFabControle();
    if (controleInterval) clearInterval(controleInterval);
    controleInterval = setInterval(majFabControle, 1000);
}

// ========== INITIALISATION ==========
function init() {
    genererTabsEtContenus();
    chargerCadences();
    chargerToutesLesDonnees();
    chargerToutesLesCuves();
    initialiserPoste();
    attacherEvenementsPoste();
    initControleQualite();

    Object.keys(LIGNES).forEach(ligne => {
        const totalInp = document.getElementById('total-' + ligne);
        const faitInp = document.getElementById('fait-' + ligne);
        if (totalInp) {
            totalInp.addEventListener('input', () => {
                sauvegarderValeur(ligne, 'total', totalInp.value);
                calculer(ligne);
            });
        }
        if (faitInp) {
            faitInp.addEventListener('input', () => {
                let val = parseInt(faitInp.value);
                if (isNaN(val)) val = 0;
                if (val < 0) val = 0;
                faitInp.value = val;
                sauvegarderValeur(ligne, 'fait', val);
                calculer(ligne);
            });
        }
        calculer(ligne);
    });

    document.getElementById('modal-cadence').addEventListener('click', (e) => {
        if (e.target.id === 'modal-cadence') fermerReglageCadence();
    });
    document.getElementById('modal-shift').addEventListener('click', (e) => {
        if (e.target.id === 'modal-shift') fermerTimerShift();
    });
    document.getElementById('modal-controle').addEventListener('click', (e) => {
        if (e.target.id === 'modal-controle') fermerReglageControle();
    });

    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js').then(reg => {
            console.log('Service Worker enregistré', reg);
        }).catch(err => {
            console.log('Erreur Service Worker :', err);
        });
    }
}

init();

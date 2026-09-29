// ========== GÉNÉRATION DYNAMIQUE DES ONGLETS ==========

// Format des nombres de pièces, indépendant de la langue du téléphone
function fmt(n) {
    return Number(n).toLocaleString('fr-FR');
}

// Texte noir ou blanc selon la clarté de la couleur de ligne (le rouge
// Color Sensation illisible en noir, l'or illisible en blanc).
function couleurTexteSur(hex) {
    const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255)
        .map(c => c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
    const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    return lum > 0.2 ? '#111111' : '#FFFFFF';
}

function poserCouleurLigne(el, couleur) {
    el.style.setProperty('--ligne', couleur);
    el.style.setProperty('--sur-ligne', couleurTexteSur(couleur));
}

function genererTabsEtContenus() {
    const tabsContainer = document.getElementById('tabs-container');
    const contentsContainer = document.getElementById('contents-container');
    tabsContainer.innerHTML = '';
    contentsContainer.innerHTML = '';

    const dernierOnglet = storageGet('dernier-onglet', null);
    ligneActiveCourante = (dernierOnglet && LIGNES[dernierOnglet]) ? dernierOnglet : Object.keys(LIGNES)[0];

    Object.keys(LIGNES).forEach(ligneId => {
        const config = LIGNES[ligneId];
        const estActive = ligneId === ligneActiveCourante;

        const tabBtn = document.createElement('button');
        tabBtn.className = `tab ${ligneId}`;
        poserCouleurLigne(tabBtn, config.couleur);
        if (estActive) tabBtn.classList.add('active');
        tabBtn.innerHTML = `<span class="tab-pastille"></span>${config.nomCourt || config.nom}`;
        tabBtn.onclick = () => switchTab(ligneId);
        tabsContainer.appendChild(tabBtn);

        const contentDiv = document.createElement('div');
        contentDiv.id = ligneId;
        contentDiv.className = 'content';
        poserCouleurLigne(contentDiv, config.couleur);
        if (estActive) contentDiv.classList.add('active');
        contentDiv.innerHTML = genererHTMLLigne(ligneId);
        contentsContainer.appendChild(contentDiv);
    });

    appliquerCouleurLigneActive();
}

function genererHTMLLigne(ligneId) {
    const config = LIGNES[ligneId];

    const posteSelectorHtml = config.hasPoste ? `
        <div class="segmente poste-selector" id="poste-selector-${ligneId}">
            <button class="poste-btn" data-poste="arriere">🔧 Arrière · Remplissage</button>
            <button class="poste-btn" data-poste="avant">📦 Avant · Qualité</button>
        </div>` : '';

    const cuveHtml = config.colorant ? `
        <div class="bloc-option">
            <label class="toggle">
                <input type="checkbox" id="check-cuve-${ligneId}" onchange="toggleCuveUI('${ligneId}')">
                <span class="toggle-switch"></span>
                <span class="toggle-label" id="label-cuve-${ligneId}">🧪 Suivre la cuve (min. ${getSeuilCuve(ligneId)} kg)</span>
            </label>
            <div id="config-cuve-${ligneId}" class="cuve-config">
                <label class="form-label" for="poids-cuve-${ligneId}">Poids actuel dans la cuve (kg)</label>
                <div class="champ-avec-action">
                    <input type="number" id="poids-cuve-${ligneId}" class="form-input" placeholder="Ex : 200" min="0" step="1" inputmode="decimal"
                           oninput="sauvegarderPoidsCuve('${ligneId}', this.value); calculer('${ligneId}')">
                    <button class="btn-icone" onclick="resetCuve('${ligneId}')" title="Réinitialiser la cuve">↺</button>
                </div>
            </div>
        </div>` : '';

    const optionnels = (config.consommables || []).filter(c => c.optionnel);
    const consoHtml = optionnels.length ? `
        <div class="bloc-option">
            ${optionnels.map(c => `
            <label class="toggle">
                <input type="checkbox" id="conso-${ligneId}-${c.id}" onchange="storageSet('${ligneId}-conso-${c.id}-actif', this.checked); calculer('${ligneId}')">
                <span class="toggle-switch"></span>
                <span class="toggle-label">${c.icone || '📦'} Utiliser : ${c.label}</span>
            </label>`).join('')}
        </div>` : '';

    return `
        <section class="hero">
            <div class="hero-entete">
                <div class="hero-nom">
                    <span class="hero-code">Ligne ${ligneId.toUpperCase()}</span>
                    <h2>${config.nom}</h2>
                </div>
                <button class="btn-icone btn-reglages" onclick="ouvrirReglagesLigne('${ligneId}')" title="Réglages">⚙️</button>
            </div>
            <div id="kpi-${ligneId}"></div>
            <div class="progression">
                <div class="progression-texte">
                    <span id="progress-qte-${ligneId}">0 / —</span>
                    <span id="progress-text-${ligneId}">0,0 %</span>
                </div>
                <div class="barre"><div id="progress-fill-${ligneId}" class="barre-fill"></div></div>
            </div>
        </section>

        <div class="palette-stepper">
            <button class="btn btn-palette-moins" onclick="modifierPalette('${ligneId}', -1)">− Palette</button>
            <button class="btn btn-palette-plus" onclick="modifierPalette('${ligneId}', 1)">+ Palette</button>
        </div>
        <div class="palette-info">1 palette = ${fmt(config.produitsParPalette)} pièces</div>

        <section class="card">
            ${posteSelectorHtml}
            <div class="saisie-grille">
                <div>
                    <label class="form-label" for="total-${ligneId}">Objectif</label>
                    <input type="number" id="total-${ligneId}" class="form-input" placeholder="Ex : 5000" min="1" step="1" inputmode="numeric">
                </div>
                <div>
                    <label class="form-label" for="fait-${ligneId}">Déjà produit</label>
                    <input type="number" id="fait-${ligneId}" class="form-input" value="0" min="0" step="1" inputmode="numeric">
                </div>
            </div>
            ${cuveHtml}
            ${consoHtml}
        </section>

        <div id="resultat-${ligneId}"></div>

        <button class="lien-discret lien-danger" onclick="demanderReinitialisation('${ligneId}')">↺ Réinitialiser la ligne ${config.nomCourt || config.nom}</button>
    `;
}

// Le libellé de la case "Suivre la cuve" reflète le seuil réellement
// configuré pour la ligne (au lieu d'un "50kg" figé en dur) — à rappeler
// chaque fois que le seuil est modifié via le menu Réglages.
function majLabelCuve(ligneId) {
    const el = document.getElementById(`label-cuve-${ligneId}`);
    if (el) el.innerText = `🧪 Suivre la cuve (min. ${getSeuilCuve(ligneId)} kg)`;
}

function switchTab(ligneId) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.content').forEach(c => c.classList.remove('active'));
    document.querySelector(`.tab.${ligneId}`).classList.add('active');
    document.getElementById(ligneId).classList.add('active');
    ligneActiveCourante = ligneId;
    storageSet('dernier-onglet', ligneId);
    appliquerCouleurLigneActive();
    if (typeof majFabControle === 'function') majFabControle();
}

// La couleur de la ligne affichée teinte le haut de l'écran : on sait
// toujours sur quelle ligne on est, même en ayant fait défiler la page.
function appliquerCouleurLigneActive() {
    const config = LIGNES[ligneActiveCourante];
    if (config) document.documentElement.style.setProperty('--ligne-active', config.couleur);
}

// ========== THÈME ==========

function appliquerTheme(theme) {
    document.documentElement.dataset.theme = theme;
    const btn = document.getElementById('btn-theme');
    if (btn) btn.innerText = theme === 'dark' ? '☀️' : '🌙';
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = theme === 'dark' ? '#0E1012' : '#F4F4F2';
}

function basculerTheme() {
    const nouveau = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    storageSet('theme', nouveau);
    appliquerTheme(nouveau);
}

// ========== NOTIFICATIONS / CONFIRMATION ==========

function afficherAlerteTemporaire(message) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerText = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2000);
}

// Remplace le confirm() natif (bloquant, non stylable) par une modale de
// l'app. onOk n'est appelé que si l'utilisateur confirme.
function demanderConfirmation({ titre, message, libelleOk, onOk }) {
    const modal = document.getElementById('modal-confirm');
    document.getElementById('confirm-titre').innerText = titre;
    document.getElementById('confirm-message').innerText = message;
    const btnOk = document.getElementById('confirm-ok');
    btnOk.innerText = libelleOk || 'OK';

    const fermer = () => modal.classList.remove('active');
    btnOk.onclick = () => { fermer(); onOk(); };
    document.getElementById('confirm-annuler').onclick = fermer;
    modal.onclick = (e) => { if (e.target === modal) fermer(); };
    modal.classList.add('active');
}

function demanderReinitialisation(ligne) {
    demanderConfirmation({
        titre: `Réinitialiser ${LIGNES[ligne].nom} ?`,
        message: "L'objectif, la quantité produite et la cuve de cette ligne seront effacés.",
        libelleOk: 'Réinitialiser',
        onOk: () => reinitialiser(ligne)
    });
}

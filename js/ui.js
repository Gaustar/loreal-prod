// ========== GÉNÉRATION DYNAMIQUE DES ONGLETS ==========

function genererTabsEtContenus() {
    const tabsContainer = document.getElementById('tabs-container');
    const contentsContainer = document.getElementById('contents-container');
    tabsContainer.innerHTML = '';
    contentsContainer.innerHTML = '';

    const dernierOnglet = storageGet('dernier-onglet', null);
    ligneActiveCourante = (dernierOnglet && LIGNES[dernierOnglet]) ? dernierOnglet : Object.keys(LIGNES)[0];

    Object.keys(LIGNES).forEach((ligneId, index) => {
        const estActive = ligneId === ligneActiveCourante;
        const tabBtn = document.createElement('button');
        tabBtn.className = `tab ${ligneId}`;
        if (estActive) tabBtn.classList.add('active');
        tabBtn.textContent = LIGNES[ligneId].nom;
        tabBtn.onclick = () => switchTab(ligneId);
        tabsContainer.appendChild(tabBtn);

        const contentDiv = document.createElement('div');
        contentDiv.id = ligneId;
        contentDiv.className = 'content';
        if (estActive) contentDiv.classList.add('active');
        contentDiv.innerHTML = genererHTMLLigne(ligneId);
        contentsContainer.appendChild(contentDiv);
    });
}

function genererHTMLLigne(ligneId) {
    const config = LIGNES[ligneId];
    let posteSelectorHtml = '';
    if (config.hasPoste) {
        posteSelectorHtml = `
            <div class="poste-selector" id="poste-selector-${ligneId}">
                <div class="poste-btn" data-poste="arriere">🔧 Arrière (Remplissage)</div>
                <div class="poste-btn" data-poste="avant">📦 Avant (Qualité)</div>
            </div>
        `;
    }
    return `
        <div class="ligne-header">
            <h2>Ligne ${config.nom}
                <span class="icon-ecrou" onclick="ouvrirReglagesLigne('${ligneId}')" title="Réglages">⚙️</span>
            </h2>
        </div>
        <div class="card">
            <div id="progress-text-${ligneId}">Progression: 0%</div>
            <div class="progress-bar"><div id="progress-fill-${ligneId}" class="progress-fill"></div></div>
        </div>
        <div class="card">
            ${posteSelectorHtml}
            <div class="form-group">
                <label class="form-label">Quantité totale à produire :</label>
                <input type="number" id="total-${ligneId}" class="form-input" placeholder="Ex: 5000" min="1" step="1">
            </div>
            <div class="form-group">
                <label class="form-label">Déjà produit :</label>
                <input type="number" id="fait-${ligneId}" class="form-input" value="0" min="0" step="1">
            </div>

            ${config.colorant ? `
            <div class="form-group" style="margin-top: 15px; border-top: 1px dashed #ccc; padding-top: 15px;">
                <label class="repas-toggle" style="justify-content: flex-start; cursor: pointer;">
                    <input type="checkbox" id="check-cuve-${ligneId}" onchange="toggleCuveUI('${ligneId}')">
                    <div class="repas-switch"></div>
                    <span style="font-weight: 600; color: #333; font-size: 14px;">🧪 Suivre la cuve (min. 50kg)</span>
                </label>
                <div id="config-cuve-${ligneId}" class="repas-config" style="margin-top: 10px;">
                    <label class="form-label" style="display:flex; align-items:center; justify-content:space-between;">
                        <span>Poids actuel dans la cuve (kg) :</span>
                        <span class="icon-ecrou" onclick="resetCuve('${ligneId}')" title="Réinitialiser la cuve">🔄</span>
                    </label>
                    <input type="number" id="poids-cuve-${ligneId}" class="form-input" placeholder="Ex: 200" min="0" step="1" oninput="sauvegarderPoidsCuve('${ligneId}', this.value); calculer('${ligneId}')" style="font-size: 18px;">
                </div>
            </div>
            ` : ''}

            ${config.consommables && config.consommables.some(c => c.optionnel) ? `
            <div class="form-group" style="margin-top: 15px; border-top: 1px dashed #ccc; padding-top: 15px;">
                ${config.consommables.filter(c => c.optionnel).map(c => `
                <label class="repas-toggle" style="justify-content: flex-start; cursor: pointer;">
                    <input type="checkbox" id="conso-${ligneId}-${c.id}" onchange="storageSet('${ligneId}-conso-${c.id}-actif', this.checked); calculer('${ligneId}')">
                    <div class="repas-switch"></div>
                    <span style="font-weight: 600; color: #333; font-size: 14px;">${c.icone || '📦'} Utiliser : ${c.label}</span>
                </label>
                `).join('')}
            </div>
            ` : ''}

            <div class="button-group">
                <button class="btn btn-retirer" onclick="modifierPalette('${ligneId}', -1)">➖ PALETTE</button>
                <button class="btn btn-ajouter" onclick="modifierPalette('${ligneId}', 1)">➕ PALETTE</button>
                <button class="btn btn-calculer" onclick="calculer('${ligneId}')">CALCULER</button>
                <button class="btn btn-reset" onclick="reinitialiser('${ligneId}')">RÉINITIALISER</button>
            </div>
        </div>
        <div id="resultat-${ligneId}"></div>
    `;
}

function switchTab(ligneId) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.content').forEach(c => c.classList.remove('active'));
    document.querySelector(`.tab.${ligneId}`).classList.add('active');
    document.getElementById(ligneId).classList.add('active');
    ligneActiveCourante = ligneId;
    storageSet('dernier-onglet', ligneId);
    if (typeof majFabControle === 'function') majFabControle();
}

function afficherAlerteTemporaire(message) {
    let toast = document.createElement('div');
    toast.innerText = message;
    toast.style.position = 'fixed';
    toast.style.bottom = '100px';
    toast.style.left = '20px';
    toast.style.right = '20px';
    toast.style.backgroundColor = '#333';
    toast.style.color = '#C5A028';
    toast.style.padding = '12px';
    toast.style.borderRadius = '40px';
    toast.style.textAlign = 'center';
    toast.style.zIndex = '3000';
    toast.style.fontWeight = 'bold';
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2000);
}

function ouvrirAvis() {
    window.open('https://docs.google.com/forms/d/e/1FAIpQLSft9tV_WZysn_8iuCZ3agsb_NX4DImhX0hkei1P39CXv7Byug/viewform?usp=dialog', '_blank');
}

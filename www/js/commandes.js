// ========== FILE D'ATTENTE DES COMMANDES ==========
// Chaque ligne a sa propre file de commandes à venir (juste une quantité),
// distincte de la production actuellement affichée à l'écran. "Commande
// suivante" prend la 1ère de la file, réinitialise la ligne (production +
// cuve, via reinitialiser() déjà existant), puis charge cette quantité.

let commandeEnEdition = null; // { ligne, id } pendant l'édition d'une ligne de la liste

function chargerCommandes(ligne) {
    try {
        const raw = storageGet(`${ligne}-commandes`, '[]');
        const liste = JSON.parse(raw);
        return Array.isArray(liste) ? liste : [];
    } catch (e) {
        return [];
    }
}

function sauvegarderCommandes(ligne, liste) {
    storageSet(`${ligne}-commandes`, JSON.stringify(liste));
}

function ajouterCommande(ligne) {
    const input = document.getElementById('input-nouvelle-commande');
    if (!input) return;
    const val = parseInt(input.value);
    if (!val || val <= 0) {
        afficherAlerteTemporaire('⚠️ Quantité invalide');
        return;
    }
    const liste = chargerCommandes(ligne);
    liste.push({ id: 'c' + Date.now() + Math.floor(Math.random() * 1000), quantite: val });
    sauvegarderCommandes(ligne, liste);
    input.value = '';
    renderListeCommandes(ligne);
}

function supprimerCommande(ligne, id) {
    let liste = chargerCommandes(ligne);
    liste = liste.filter(c => c.id !== id);
    sauvegarderCommandes(ligne, liste);
    if (commandeEnEdition && commandeEnEdition.id === id) commandeEnEdition = null;
    renderListeCommandes(ligne);
}

function deplacerCommande(ligne, id, direction) {
    const liste = chargerCommandes(ligne);
    const index = liste.findIndex(c => c.id === id);
    const cible = index + direction;
    if (index === -1 || cible < 0 || cible >= liste.length) return;
    [liste[index], liste[cible]] = [liste[cible], liste[index]];
    sauvegarderCommandes(ligne, liste);
    renderListeCommandes(ligne);
}

function modifierCommandeDemarrer(ligne, id) {
    commandeEnEdition = { ligne, id };
    renderListeCommandes(ligne);
}

function modifierCommandeValider(ligne, id) {
    const input = document.getElementById(`edit-commande-${id}`);
    if (!input) return;
    const val = parseInt(input.value);
    if (!val || val <= 0) {
        afficherAlerteTemporaire('⚠️ Quantité invalide');
        return;
    }
    const liste = chargerCommandes(ligne);
    const cmd = liste.find(c => c.id === id);
    if (cmd) cmd.quantite = val;
    sauvegarderCommandes(ligne, liste);
    commandeEnEdition = null;
    renderListeCommandes(ligne);
}

function modifierCommandeAnnuler(ligne) {
    commandeEnEdition = null;
    renderListeCommandes(ligne);
}

// Passe à la commande suivante : réinitialise la ligne (production + cuve,
// via reinitialiser() déjà existant) puis charge la quantité de la 1ère
// commande de la file. Demande confirmation si la prod actuelle n'est pas
// terminée.
function commandeSuivante(ligne) {
    const liste = chargerCommandes(ligne);
    if (liste.length === 0) {
        afficherAlerteTemporaire("📋 File d'attente vide");
        return;
    }

    const totalInput = document.getElementById('total-' + ligne);
    const faitInput = document.getElementById('fait-' + ligne);
    const total = parseInt(totalInput.value) || 0;
    const fait = parseInt(faitInput.value) || 0;
    const reste = Math.max(0, total - fait);

    if (reste > 0) {
        const ok = confirm(`La production en cours n'est pas terminée (${reste.toLocaleString()} pièces restantes).\n\nPasser à la commande suivante quand même ?`);
        if (!ok) return;
    }

    const prochaine = liste.shift();
    reinitialiser(ligne);
    totalInput.value = prochaine.quantite;
    sauvegarderValeur(ligne, 'total', prochaine.quantite);
    sauvegarderCommandes(ligne, liste);
    calculer(ligne);
    renderListeCommandes(ligne);
    afficherAlerteTemporaire('▶ Commande chargée : ' + prochaine.quantite.toLocaleString() + ' pièces');
}

// Génère le HTML de la file d'attente dans le modal réglages (appelé à
// l'ouverture du modal et après chaque action sur la liste).
function renderListeCommandes(ligne) {
    const conteneur = document.getElementById('commandes-liste');
    const compteur = document.getElementById('commandes-count');
    if (!conteneur) return;

    const liste = chargerCommandes(ligne);
    if (compteur) compteur.innerText = liste.length;

    if (liste.length === 0) {
        conteneur.innerHTML = '<div class="commandes-vide">Aucune commande en attente</div>';
        return;
    }

    let html = '';
    liste.forEach((cmd, index) => {
        const enEdition = commandeEnEdition && commandeEnEdition.id === cmd.id;
        if (enEdition) {
            html += `
                <div class="commande-ligne">
                    <input type="number" id="edit-commande-${cmd.id}" class="form-input commande-edit-input" value="${cmd.quantite}" min="1" step="1">
                    <span class="commande-action" onclick="modifierCommandeValider('${ligne}', '${cmd.id}')">✓</span>
                    <span class="commande-action" onclick="modifierCommandeAnnuler('${ligne}')">✖</span>
                </div>`;
        } else {
            html += `
                <div class="commande-ligne">
                    <span class="commande-fleches">
                        <span class="commande-action" style="${index === 0 ? 'opacity:0.25;pointer-events:none;' : ''}" onclick="deplacerCommande('${ligne}', '${cmd.id}', -1)">⬆️</span>
                        <span class="commande-action" style="${index === liste.length - 1 ? 'opacity:0.25;pointer-events:none;' : ''}" onclick="deplacerCommande('${ligne}', '${cmd.id}', 1)">⬇️</span>
                    </span>
                    <span class="commande-quantite">${cmd.quantite.toLocaleString()} pièces</span>
                    <span class="commande-action" onclick="modifierCommandeDemarrer('${ligne}', '${cmd.id}')">✏️</span>
                    <span class="commande-action" onclick="supprimerCommande('${ligne}', '${cmd.id}')">🗑️</span>
                </div>`;
        }
    });
    conteneur.innerHTML = html;
}

# Refonte du design — plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans (exécution native, l'utilisateur a délégué).

**Goal:** réorganiser l'écran d'une ligne selon la spec (bandeau poste → anneau/fin/reste → palettes → À anticiper → Commande repliée), sans changer les calculs.

**Architecture:** HTML généré dans `ui.js/genererHTMLLigne`, rendus dans `calcul-lignes.js`, styles dans `style.css`. Un nouveau `anticiper.js` produit les échéances horaires (contrôle, pause, repas, fin de shift).

**Tech Stack:** vanilla JS, scripts classiques, CSS variables, aucune dépendance.

**Spec:** `docs/superpowers/specs/2026-10-30-refonte-design-design.md`

## Global Constraints

- Mêmes clés localStorage qu'aujourd'hui (aucune migration).
- Progression en pièces « 7 200 / 19 000 », jamais en palettes.
- Incrémenter `CACHE_NAME` dans `www/sw.js` et y lister tout nouveau JS.
- Pas d'APK ; push sur `main` (GitHub Pages).

## Review Focus

1. Objectif vide (début de commande) : la zone Commande doit s'ouvrir seule et le message du héros doit y mener.
2. Production terminée / limite cuve : états du héros conservés (message, astérisque, couleur danger).
3. Lignes sans poste (CCG, Color S., L87) : pas de bandeau, rien de cassé.
4. Thème clair : bandeau de poste et anneau lisibles.
5. Rerendu fréquent (`calculer` à chaque frappe) : panneaux ouverts (réintégration, Commande) ne se referment pas.

---

### Task 1: Bandeau de poste
**Files:** `ui.js` (genererHTMLLigne), `poste.js`, `app.js`, `style.css`
- Remplacer le sélecteur segmenté par `<button class="poste-bandeau" id="poste-bandeau-l60" onclick="basculerPoste()">` placé avant le héros.
- `poste.js` : `basculerPoste()` alterne arrière/avant via `changerPoste` ; `mettreAJourBoutonsPoste()` met à jour texte + classe `poste-arriere|poste-avant`. Supprimer `attacherEvenementsPoste` et son appel.
- Variables `--poste-arriere` (#4A90E2 / clair #1F6FC7) et `--poste-avant` (#F0A04B / clair #C46A12).

### Task 2: Héros anneau
**Files:** `ui.js`, `calcul-lignes.js` (renderEnTete, majProgression, calculer), `style.css`
- Structure : `.anneau#anneau-{id}` (conic-gradient piloté par `--pct`) avec `#progress-text-{id}` au centre ; à droite `#kpi-{id}` (fin en très gros + « dans XhYY » + reste) ; dessous `#progress-qte-{id}` « 7 200 / 19 000 pièces ».
- `majProgression` pose `--pct` au lieu de la largeur de barre.
- Message « objectif manquant » = bouton qui ouvre la zone Commande et focus l'objectif.

### Task 3: À anticiper
**Files:** créer `www/js/anticiper.js` ; `ui.js`, `calcul-lignes.js` (renderAPrevoir), `index.html`, `sw.js`, `app.js`
- Carte « 🔭 À anticiper » : `#anticiper-temps-{id}` puis `#resultat-{id}` (alerte cuve + items À prévoir, sans carte propre).
- `echeancesAnticiper(ligne, now) -> [{icone, label, valeur, minutes}]` : contrôle qualité (à faire / fait), pause en cours, repas (si actif, à venir), fin du shift (si pendant) ; trié par `minutes` croissant. `majAnticiper()` rend pour chaque ligne, intervalle 15 s, lancé dans `init`.
- Self-check : `tests/anticiper.check.js` (tri, contrôle non configuré → absent).

### Task 4: Réintégration repliable + file de commandes
**Files:** `reintegration.js`, `style.css`
- Carte en `<details>` ; `summary` = « ↩️ Réintégration AC » + chiffres à renvoyer par AC ; état ouvert mémorisé en variable (`reintOuvert`) via `ontoggle`.
- `validerChangement` : si `chargerCommandes(ligne)` non vide, charge la quantité suivante comme Objectif (comme `commandeSuivante`) ; sinon Objectif vide.

### Task 5: Zone Commande repliée
**Files:** `ui.js`, `calcul-lignes.js`, `style.css`
- `<details class="card commande" id="commande-{id}">` : objectif, déjà produit, cuve, consommables optionnels, lien réinitialiser. `summary` « ⚙️ Commande · objectif X ». Ouverte automatiquement si objectif vide (dans `calculer`).

### Task 6: Vérification + publication
- `node tests/*.check.js` → OK ; navigateur local : 4 onglets, 2 postes, thème clair, objectif vide, terminé, cuve limite ; pas d'erreur console.
- `CACHE_NAME` v20, commit, push.

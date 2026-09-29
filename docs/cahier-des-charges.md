# Cahier des charges — App de suivi de production (v2.0)

## 0. Contexte

Application personnelle de suivi de production pour un opérateur travaillant sur plusieurs lignes de conditionnement (usine L'Oréal). HTML/CSS/JS vanilla, sans framework ni build, dans `www/`. Deux modes de diffusion :

- **APK Android** via Capacitor (`appId` `com.gauthier.lorealprod`) — mode principal.
- **PWA web** (même code), installable et hors-ligne via Service Worker.

Ce document est la référence fonctionnelle. Chaque formule et comportement décrits ici doivent être conservés **exactement**, y compris les cas limites. En cas de doute, le code (`www/js/`) fait foi et ce document doit être corrigé.

Historique : v1 = portage Capacitor de la PWA d'origine (août 2026). v2.0 = refonte visuelle (septembre 2026) : thèmes sombre/clair, couleur par ligne, chrono de pause, confirmations intégrées, bouton CALCULER et bulle avis supprimés.

---

## 1. Vue d'ensemble fonctionnelle

L'app suit la production sur **4 onglets** : Excellence, Casting Crème Gloss (CCG), Color Sensation, L87. Pour chaque onglet, l'opérateur renseigne une quantité totale à produire et ce qui est déjà fait ; l'app calcule automatiquement :
- le reste à produire, le temps restant et l'heure de fin prévue,
- les consommables à prévoir (palettes, boîtes, tubes, étuis, notices, colorant selon la ligne),
- une limitation automatique si le colorant dans la cuve ne suffit pas à finir la commande.

Fonctionnalités transverses : minuteur de shift avec chrono de pause et timer repas, contrôle qualité horaire par ligne, file d'attente de commandes, réglages par ligne, thème sombre/clair.

---

## 2. Configuration des lignes (données exactes)

Tout est piloté par l'objet `LIGNES` de `www/js/config.js`. **Aucune valeur propre à une ligne ne doit être codée en dur ailleurs** : ajouter une ligne = ajouter une entrée. Les cadences d'usine (`CADENCES_DEFAUT`) sont déduites de `LIGNES` avant application des cadences personnalisées.

Champs communs : `nom` (bandeau), `nomCourt` (onglet), `codes` (lignes physiques affichées dans le bandeau ; défaut = identifiant en majuscules), `couleur` (couleur d'identification, voir section 14), `produitsParPalette`, `produitsParNiveau`, `produitsParBoite`, `vitesse` (pièces/min), `colorant` (kg par palette complète, optionnel), `consommables` (optionnel), `hasPoste` (optionnel).

```
ONGLET "l60" — "Excellence"
  - regroupe les lignes physiques L60, L61, L62, L65 (mêmes données, mêmes calculs)
    → bandeau « LIGNES L60 · L61 · L62 · L65 », une seule production suivie
  - couleur : #D1B28A (bloc logo doré de l'étui)
  - produitsParPalette 720 · produitsParNiveau 120 · produitsParBoite 6
  - vitesse par défaut : 72 pièces/min
  - colorant : 35 kg par palette complète
  - particularité : poste de travail (section 6)

ONGLET "ccg" — "Casting Crème Gloss" (onglet « CCG »)
  (fusion des anciennes lignes L70/L74, qui étaient la même ligne)
  - couleur : #D82D88 (bloc fuchsia de l'étui)
  - produitsParPalette 828 · produitsParNiveau 138 · produitsParBoite 6
  - vitesse par défaut : 103,5 pièces/min  ⚠️ décimale exacte (828 ÷ 8 min)
  - colorant : 42 kg par palette complète
  - consommables :
      • Tubes   — 252 par boîte — toujours affiché
      • Étuis   — 225 par boîte — toujours affiché
      • Notices — 1 200 par paquet — optionnel (case à cocher)

ONGLET "l72" — "Color Sensation" (Garnier, onglet « Color S. »)
  - couleur : #870C27 (bloc rouge de l'étui)
  - produitsParPalette 1260 · produitsParNiveau 210 · produitsParBoite 6
  - vitesse par défaut : 100 pièces/min
  - colorant : 42 kg par palette complète
  - consommables :
      • Tubes laminés — 383 par boîte — toujours affiché
      • Étuis         — 240 par boîte — toujours affiché
      • Notices       — 500 par paquet — optionnel (case à cocher)

ONGLET "l87" — "L87"
  - couleur : #3CC48F (provisoire, gamme inconnue)
  - produitsParPalette 1920 · produitsParNiveau 384 · produitsParBoite 6
  - vitesse par défaut : 75 pièces/min
  - pas de colorant, pas de consommables (calcul générique palette/niveau/boîte)
```

Ordre des onglets : Excellence, CCG, Color S., L87 (ordre des clés de `LIGNES`).

---

## 3. Écran principal / navigation

- **Barre du haut** : « L'ORÉAL · Suivi de production » + bouton de thème (☀️/🌙). Une bande de 4 px en haut de l'écran prend la couleur de la ligne affichée.
- **Onglets** sur une seule rangée, collants en haut au défilement : pastille de couleur + nom court. L'onglet actif est rempli de la couleur de la ligne.
- **L'app rouvre au démarrage le dernier onglet consulté** (mémorisé).
- Pied de page discret : « Programme fait maison 🛠️ · Bon courage ! 💪 ».
- **Deux boutons flottants** en bas d'écran :
  - ⏱️ bas-gauche : minuteur de shift / pause (section 12). Pendant une pause, il affiche le décompte de la pause.
  - Contrôle qualité, centre : décompte de la ligne affichée (section 10), bordé de la couleur de la ligne active.
- La bulle 💬 « avis » (formulaire Google) a été **supprimée** en v2.

Structure d'un onglet, de haut en bas :
1. **Bandeau de ligne** : étiquette colorée « LIGNE(S) … », nom de la ligne en grand, bouton ⚙️ Réglages, duo Reste / Fin prévue (section 8), progression.
2. **Boutons palette** : « − Palette » (1/3) et « + Palette » (2/3, couleur de la ligne), puis « 1 palette = N pièces ».
3. **Carte de saisie** : sélecteur de poste (Excellence), Objectif et Déjà produit côte à côte, suivi de cuve, consommables optionnels.
4. **Alerte cuve** éventuelle puis **checklist « À prévoir »**.
5. Lien discret « ↺ Réinitialiser la ligne … ».

---

## 4. Suivi de production (commun à toutes les lignes)

Deux champs numériques : **Objectif** (`total`) et **Déjà produit** (`fait`). Toute saisie déclenche le recalcul (il n'y a plus de bouton CALCULER).

Règles de validation, dans cet ordre exact :
1. Si `fait < 0` → forcer `fait = 0`.
2. Si `total <= 0` → le bandeau affiche « ⚠️ Veuillez renseigner la quantité totale à produire », le champ Objectif est surligné, la progression passe à « fait / — » et 0 %. Rien d'autre n'est calculé.
3. Si `fait > total` → plafonner `fait = total` et afficher une notification temporaire « Production plafonnée à {total} pièces » (2 s). Verrou de 2 s **par ligne** pour ne pas répéter la notification en boucle.
4. `reste = max(0, total - fait)`.
5. Si `reste === 0` → le bandeau affiche « ✅ PRODUCTION TERMINÉE », rien d'autre.
6. Sinon → détail (section 8).

**Progression** : `min(100, fait/total*100)`, 1 décimale, virgule française (« 64,0 % »), avec « fait / total » à gauche. Barre de la couleur de la ligne.

**− Palette / + Palette** : retire/ajoute `produitsParPalette` à `fait`, plafonné à `[0, total]`. + Palette sans objectif renseigné → notification « Veuillez d'abord saisir la quantité totale à produire », aucune action.

**Réinitialiser** (lien en bas de l'onglet) : **demande confirmation** (« Réinitialiser {nom} ? »). Si confirmé : vide `total`, remet `fait` à 0 et, si la ligne a un colorant, décoche et vide la cuve. Les valeurs sont supprimées du stockage.

---

## 5. Système de cuve (colorant)

S'applique à **toute ligne ayant un colorant** (Excellence, CCG, Color Sensation).

- Interrupteur « 🧪 Suivre la cuve (min. {seuil} kg) » — le libellé reflète le seuil réel. Coché, il affiche « Poids actuel dans la cuve (kg) » et un bouton ↺ de réinitialisation de la cuve.
- **Seuil minimum par ligne** (réglages), 50 kg par défaut.
- Logique de limitation, à chaque recalcul :
  ```
  si (case cochée) :
      poids = poids saisi (0 si vide/invalide)
      si poids > seuil :
          pieces_possibles = floor(((poids - seuil) / colorant_kg_par_palette) * produitsParPalette)
          si pieces_possibles < reste :
              quantité_productible = pieces_possibles ; limite_active = vrai
      sinon si (0 < poids <= seuil) :
          pieces_possibles = 0 ; quantité_productible = 0 ; limite_active = vrai
  sinon :
      quantité_productible = reste
  ```
- Si `limite_active` : encart rouge « ⛔ Maximum possible avec la cuve actuelle : {pieces_possibles} pièces — Soit {reste - pieces_possibles} pièces de moins que l'objectif ».
- **Consommables, temps restant et heure de fin se basent sur `quantité_productible`**. Seul le colorant affiché reste basé sur `reste` (« ce qu'il faudrait pour finir »).
- **Mise à jour auto du poids** : ± Palette fait baisser/remonter le poids de `colorant_kg_par_palette` (minimum 0).
- ↺ cuve : vide le poids et décoche, indépendamment de Réinitialiser.
- État (case + poids) mémorisé.

---

## 6. Poste de travail (spécifique Excellence)

Sélecteur exclusif en haut de la carte de saisie :
- 🔧 **Arrière · Remplissage** → Tubes laminés (252/boîte) + Tubes plastique (690/boîte)
- 📦 **Avant · Qualité** → Paquets de notices (1 200/paquet) + Boîtes d'étuis (230/boîte)

Valeurs dans `CONDITIONNEMENT_L60` (config.js). Poste mémorisé (défaut : arrière).

---

## 7. Consommables configurables (CCG, Color Sensation)

Liste `consommables` par ligne : obligatoires (toujours affichés) et optionnels (`optionnel: true`, interrupteur « Utiliser : {libellé} » dans la carte de saisie, car cela varie selon la commande). État des interrupteurs mémorisé. **Générique** : une nouvelle ligne n'a besoin que de sa configuration.

---

## 8. Calcul et affichage des résultats

**A. Lignes sans consommables (L87)** :
```
palettes_completes = floor(quantité_productible / produitsParPalette)
reste_partiel      = quantité_productible % produitsParPalette
niveaux            = floor(reste_partiel / produitsParNiveau)
boites             = ceil((reste_partiel % produitsParNiveau) / produitsParBoite)
```
Affiché : « Palettes complètes » et « Niveaux + boîtes ».

**B. Lignes avec consommables (Excellence, CCG, Color Sensation)**, pour chaque consommable actif :
```
nb_boites = ceil(quantité_productible / quantité_par_boite)
capacité  = nb_boites * quantité_par_boite
```
Affiché : nombre de boîtes en gras, capacité réelle en petit sous le libellé.

**Colorant** : `(reste / produitsParPalette) * colorant_kg_par_palette`, 1 décimale, jamais limité par la cuve.

**Temps** :
```
minutes_totales = quantité_productible / vitesse
heures = floor(minutes_totales / 60) ; minutes = floor(minutes_totales % 60)
heure_fin = maintenant + minutes_totales
```

### Hiérarchie visuelle

1. **Dans le bandeau de ligne**, deux tuiles de même poids :
   - 🎯 Reste : nombre de pièces en grand.
   - ⏱ Fin prévue : **heure de fin en grand**, « dans XhYY » en sous-texte. Si la cuve limite : astérisque, heure en rouge, et note « * Temps et quantités limités par la cuve » sous la checklist.
2. **Encart d'alerte cuve** (si applicable), avant la checklist.
3. **Checklist « 🧰 À prévoir »** : `icône — libellé (+ détail) — quantité en gras`, visuellement secondaire. Valeurs affectées par la limitation cuve en rouge.

Nombres formatés en français (espace des milliers, virgule décimale).

---

## 9. Menu Réglages (un seul par ligne)

Icône ⚙️ du bandeau → modale titrée « ⚙️ Réglages — {nom} », soulignée de la couleur de la ligne. 4 sections :
- **Cadence** : décimales acceptées (`step 0.1`, `parseFloat` partout). « Rétablir la valeur par défaut » remplit le champ avec la cadence d'usine.
- **Seuil cuve** (lignes avec colorant) : kg.
- **Contrôle qualité** : heure HH:MM ; « Désactiver le contrôle » vide le champ.
- **File d'attente** (section 11).

Sauvegarde à deux vitesses, volontaire :
- Cadence / seuil / heure de contrôle : appliqués au tap sur **Valider** ; **Fermer** (ou tap hors de la modale) abandonne.
- File d'attente : chaque action s'applique **immédiatement**.

---

## 10. Contrôle qualité horaire

Heure de référence par ligne, contrôle **répété toutes les heures** à partir de cette heure.

```
ancre = aujourd'hui à l'heure de référence
tant que ancre > maintenant : ancre -= 1 h
prochaine = ancre + 1 h
tant que prochaine <= maintenant : ancre = prochaine ; prochaine += 1 h
```
(Si maintenant tombe pile sur une échéance, elle compte comme passée : la suivante est dans 1 h.)

**Bouton flottant central** :
- Décompte mm:ss jusqu'à la prochaine échéance de la **ligne affichée** (change avec l'onglet).
- Aucune heure réglée : icône 🕐 ; un tap ouvre les Réglages de la ligne active.
- Heure réglée : **appui long de 700 ms** pour valider (anneau qui pulse pendant le maintien, vibration ~40 ms, notification « Contrôle qualité validé — {nom} »). Relâcher avant 700 ms annule. Un tap simple n'a **aucun effet**.
- Contrôle validé pour la période : fond sombre, texte vert.

Échéance passée sans validation : le décompte repart pour la suivante, sans alerte ni historique (seule la dernière période validée est mémorisée).

---

## 11. File d'attente de commandes

Par ligne, liste de quantités **futures** (jamais la commande en cours). Actions immédiates : ajouter, modifier (édition en ligne ✓/✖), supprimer, réordonner (▲/▼).

**▶ Commande suivante** :
1. File vide → notification « File d'attente vide », aucune action.
2. Production en cours non terminée (`reste > 0`) → **modale de confirmation de l'app** (« Production pas terminée — {nom} : il reste N pièces »), plus de `confirm()` natif.
3. Confirmé (ou déjà terminée) : réinitialisation complète de la ligne (production + cuve), chargement de la 1ʳᵉ commande dans Objectif, retrait de la file, notification « Commande chargée : N pièces ».

---

## 12. Minuteur de shift, pause et repas

Modale toujours sombre (dégradé teal), ouverte par ⏱️.

**Shift** — créneaux fixes (`SHIFTS`, config.js) :
- **Matin** : 06:05 → 14:05
- **Après-midi** : 13:55 → 21:55

Shift proposé automatiquement (avant 13h55 → matin, sinon après-midi), bascule manuelle par sélecteur segmenté.
- Pendant le shift : décompte HH:MM:SS jusqu'à la fin, barre et % du shift écoulé, « Fin du shift à HHhMM ». Couleur : normale si > 1 h, verte si < 1 h, dorée à 0.
- Avant le début (aujourd'hui) : décompte avant démarrage, « Début à HHhMM », sans barre ni couleur d'alerte.
- Déjà terminé aujourd'hui : bascule sur l'occurrence du lendemain (« Début demain à HHhMM »).

**Chrono de pause** (nouveau en v2) :
- Choix : 10, 15, 20, 30 min (`PAUSES_PRESETS`) ou ⏱ Chrono libre (0 = compte le temps écoulé).
- L'heure de début est mémorisée : la pause continue si l'app est fermée ou en arrière-plan.
- Pendant la pause : décompte mm:ss, barre de progression, et le bouton ⏱️ affiche le décompte.
- Durée dépassée : affichage « +mm:ss » en rouge, bouton ⏱️ rouge clignotant, **une** vibration + notification « Fin de la pause ! » (si l'app est ouverte ; pas de notification système).
- « ■ Terminer la pause » arrête et efface.

**Timer repas** : interrupteur, heure réglable (mémorisée), décompte « avant la pause 🍴 » puis temps écoulé « depuis la pause ✅ » en vert. Il tourne quel que soit l'état du shift.

---

## 13. Stockage persistant — liste exhaustive des clés

`localStorage`, clé/valeur texte (JSON pour la file), toujours via `storage.js`. Conservé nativement dans le WebView Capacitor.

| Clé | Contenu |
|---|---|
| `{ligne}-total` | Objectif en cours |
| `{ligne}-fait` | Quantité déjà produite |
| `cadence-{ligne}` | Cadence personnalisée |
| `{ligne}-cuve-active` | Suivi de cuve coché (`"true"`/`"false"`) |
| `{ligne}-cuve-poids` | Poids actuel de la cuve |
| `{ligne}-cuve-seuil` | Seuil minimum personnalisé |
| `{ligne}-conso-{id}-actif` | Consommable optionnel coché (ex : `ccg-conso-notices-actif`) |
| `{ligne}-controle-heure` | Heure de référence du contrôle qualité (HH:MM) |
| `{ligne}-controle-fait-periode` | Horodatage ISO du début de la dernière période validée |
| `{ligne}-commandes` | File d'attente `[{id, quantite}, ...]` |
| `l60-poste` | Poste Excellence (`"arriere"`/`"avant"`) |
| `dernier-onglet` | Dernière ligne affichée |
| `repas-actif` | Timer repas activé |
| `repas-heure` | Heure du repas |
| `pause-debut` | Début de la pause en cours (ms epoch) |
| `pause-duree` | Durée de la pause en minutes (0 = chrono libre) |
| `pause-alerte` | `"1"` quand la fin de pause a déjà été signalée |
| `theme` | `"dark"` (défaut) ou `"light"` |

`{ligne}` = identifiant interne (`l60`, `ccg`, `l72`, `l87`).

---

## 14. Design / charte graphique

- **Deux thèmes** : sombre par défaut, clair au choix (bouton en haut à droite, mémorisé, appliqué avant le premier rendu pour éviter un flash).
- **Toutes les couleurs passent par des variables CSS** (`:root[data-theme=…]` dans `style.css`) : aucune couleur en dur dans le JS ou en `style=""`.
- **Couleur d'identification par ligne** (`couleur` dans la config), reprise de l'étui du produit : onglet, bande en haut de l'écran, étiquette et bord du bandeau, nom de ligne, bouton + Palette, barre de progression, interrupteurs, contour du bouton contrôle qualité. Objectif : voir d'un coup d'œil sur quelle ligne on saisit.
  - `--sur-ligne` : texte noir ou blanc choisi automatiquement selon la clarté de la couleur.
  - `--ligne-texte` : variante éclaircie (HSL, même teinte) quand la couleur est trop sombre pour du texte sur fond sombre (ex : rouge Color Sensation #870C27 → #D3133D).
- Accent **or** `--or` (validation, minuteur), **rouge** `--danger` (alertes cuve, dépassement de pause, réinitialisation), **orange** `--attention` (− Palette, objectif manquant), **vert** `--ok` (contrôle qualité, repas passé).
- Cartes à coins arrondis (20 px), chiffres tabulaires, gros boutons tactiles, `user-scalable=no`.
- Modale du minuteur de shift toujours sombre.
- Confirmations et notifications : modales et toasts de l'app (pas de `confirm()`/`alert()` natifs).
- Application entièrement en français.

---

## 15. PWA / Service Worker

- `manifest.json` : nom, icônes 192 et 512, `standalone`, portrait, fond et thème sombres.
- Service Worker (`sw.js`) : cache de tous les fichiers statiques, « réseau d'abord » pour la page, « cache d'abord » pour le reste, purge des anciens caches.
- **Incrémenter `CACHE_NAME` à chaque modification** du web, sinon les navigateurs ressortent l'ancien JS/CSS du cache.
- Dans l'APK Capacitor, le Service Worker **n'est pas enregistré** (assets déjà locaux ; éviter de resservir une version périmée).

---

## 16. Anomalies de l'ancienne PWA — toutes corrigées

1. Cadence tronquée en entier (`parseInt`) → `parseFloat` partout, `step="0.1"`.
2. Libellé « Suivre la cuve (min. 50kg) » figé → libellé dynamique.
3. `manifest.json` citant L70/L74 → description à jour.
4. `confirm()` natif pour « Commande suivante » → modale de l'app.

---

## 17. Hors périmètre (ne pas ajouter sans demande explicite)

- Historique ou traçabilité des contrôles qualité (seule la dernière période validée est retenue).
- Comptes utilisateurs, authentification, multi-utilisateur.
- Synchronisation cloud (tout est local à l'appareil).
- Notifications système / push (la fin de pause ne vibre que si l'app est ouverte).
- Impression ou export de rapports.

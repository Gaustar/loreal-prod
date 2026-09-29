# Cahier des charges — App de suivi de production (portage APK)

## 0. Contexte

Application personnelle de suivi de production pour un opérateur travaillant sur plusieurs lignes de conditionnement (usine L'Oréal). Existe aujourd'hui comme **PWA fonctionnelle** (HTML/CSS/JS vanilla, sans framework, sans build) : installable sur téléphone, fonctionne hors-ligne via Service Worker. Objectif de ce document : servir de base à une réécriture ou un portage en application native Android (APK) sans perdre ni altérer le comportement existant.

**Recommandation avant de commencer** : le PWA source (fourni séparément) est fonctionnel et testé en usage réel depuis plusieurs semaines. Le chemin le plus sûr pour obtenir un APK **sans introduire de nouvelles erreurs** est d'envelopper ce PWA existant tel quel (ex. via Capacitor, ou une Trusted Web Activity/Bubblewrap) plutôt que de tout réécrire en natif à partir de zéro. Si une réécriture native complète est malgré tout choisie, ce document sert de référence fonctionnelle exhaustive — mais chaque formule et chaque comportement décrits ci-dessous doivent être reproduits **exactement**, y compris les cas limites.

Si portage via wrapper (Capacitor ou équivalent) : le `localStorage` du WebView est conservé nativement, aucune migration de stockage n'est nécessaire. Si réécriture native complète : remplacer `localStorage` par un stockage persistant équivalent (SharedPreferences ou SQLite selon le volume), en conservant le même système de clés (voir section 15).

---

## 1. Vue d'ensemble fonctionnelle

L'app permet de suivre la production sur plusieurs **lignes** (actuellement 3 : Excellence/L60, CCG, L87), affichées sous forme d'onglets. Pour chaque ligne, l'opérateur renseigne une quantité totale à produire et ce qui est déjà fait ; l'app calcule automatiquement :
- le reste à produire et le temps restant estimé (avec heure de fin),
- les consommables à prévoir (palettes, boîtes, tubes, étuis, notices, colorant selon la ligne),
- une limitation automatique si la quantité de colorant disponible dans la cuve ne suffit pas à finir la commande.

Fonctionnalités transverses : minuteur de shift avec pause repas, contrôle qualité horaire par ligne, file d'attente de commandes à venir, réglages personnalisables par ligne.

---

## 2. Configuration des lignes (données exactes)

```
LIGNE "l60" — nom affiché : "Excellence"
  - produitsParPalette : 720
  - produitsParNiveau : 120
  - produitsParBoite : 6
  - vitesse (cadence) par défaut : 72 pièces/min
  - colorant : 35 kg par palette complète
  - particularité : poste de travail (voir section 6)

LIGNE "ccg" — nom affiché : "Casting Crème Gloss (CCG)"
  (fusion de deux anciennes lignes L70/L74, qui étaient en réalité la même ligne)
  - produitsParPalette : 828
  - produitsParNiveau : 138
  - produitsParBoite : 6
  - vitesse (cadence) par défaut : 103,5 pièces/min  ⚠️ valeur décimale exacte (828 ÷ 8 min), voir Anomalie connue #2
  - colorant : 42 kg par palette complète
  - consommables (remplacent le calcul générique palette/niveau/boîte — voir section 9) :
      • Tubes   — 252 par boîte — toujours affiché
      • Étuis   — 225 par boîte — toujours affiché
      • Notices — 1200 par paquet — affiché UNIQUEMENT si case cochée par l'opérateur

LIGNE "l87" — nom affiché : "L87"
  - produitsParPalette : 1920
  - produitsParNiveau : 384
  - produitsParBoite : 6
  - vitesse (cadence) par défaut : 75 pièces/min
  - pas de colorant, pas de consommables spéciaux (utilise le calcul générique palette/niveau/boîte)
```

L'ordre d'affichage des onglets suit cet ordre : Excellence, CCG, L87.

Architecture attendue : ces données doivent rester **entièrement pilotées par une configuration centrale** (pas de valeurs codées en dur ailleurs dans l'app pour une ligne donnée). Ajouter une 4ᵉ ligne à l'avenir ne doit demander de modifier qu'un seul endroit.

---

## 3. Écran principal / navigation

- Un onglet par ligne, en haut de l'écran. Taper un onglet affiche le contenu de cette ligne.
- **L'app rouvre au démarrage le dernier onglet consulté** (mémorisé), pas systématiquement le premier.
- Pied de page discret ("Programme fait maison 🛠️").
- Trois boutons flottants toujours visibles en bas d'écran (voir sections dédiées) :
  - ⏱️ bas-gauche : ouvre le minuteur de shift
  - 🕐/décompte, centre : contrôle qualité, contextuel à l'onglet actif
  - 💬 bas-droite : ouvre un formulaire externe de retour (lien Google Forms externe, à garder tel quel ou remplacer par un mécanisme de feedback équivalent)

---

## 4. Suivi de production (commun à toutes les lignes)

Deux champs numériques par ligne :
- **Quantité totale à produire** (`total`)
- **Déjà produit** (`fait`)

Règles de validation, dans cet ordre exact :
1. Si `fait < 0` → forcer `fait = 0`.
2. Si `total <= 0` → afficher un message d'erreur bloquant ("Veuillez renseigner la quantité totale à produire") et ne rien calculer d'autre.
3. Si `fait > total` → plafonner `fait = total`, et afficher une notification temporaire ("Production plafonnée à {total} pièces") pendant 2 secondes. Cette notification ne doit pas se redéclencher en boucle si l'utilisateur ne fait rien d'autre entre-temps (un verrou de 2 secondes empêche la répétition).
4. Calculer `reste = max(0, total - fait)`.
5. Si `reste === 0` → afficher uniquement "✅ PRODUCTION TERMINÉE", rien d'autre.
6. Sinon → afficher le détail (voir section 8).

**Barre de progression** : pourcentage = `min(100, fait/total*100)`, affiché avec 1 décimale. La valeur de `fait` s'affiche à l'intérieur de la barre uniquement si le pourcentage dépasse 15% (sinon le texte ne rentre pas visuellement).

**Bouton ➕ PALETTE / ➖ PALETTE** : ajoute ou retire `produitsParPalette` pièces à `fait` en un tap (évite de taper manuellement à chaque palette terminée). Plafonné à `[0, total]`. Si on tente d'ajouter une palette alors que `total` n'est pas renseigné, afficher une alerte et ne rien faire.

**Bouton RÉINITIALISER** : vide `total`, remet `fait` à 0, efface l'affichage des résultats et la barre de progression, et — si la ligne a un colorant configuré — décoche et vide aussi la cuve (voir section 7). Toutes les valeurs correspondantes sont supprimées du stockage persistant (pas juste vidées à l'écran).

Toute saisie dans `total` ou `fait` déclenche automatiquement un recalcul (pas besoin de bouton "Calculer" à chaque frappe, même si un bouton CALCULER existe aussi pour forcer un recalcul manuel).

---

## 5. Système de cuve (colorant)

S'applique à **toute ligne ayant un colorant configuré** (actuellement Excellence et CCG — générique, pas spécifique à une ligne nommée).

- Case à cocher "Suivre la cuve" — si cochée, affiche un champ "Poids actuel dans la cuve (kg)".
- **Seuil minimum personnalisable par ligne** (pas une constante unique globale) : quantité de colorant en kg en dessous de laquelle la cuve est considérée comme vide/inutilisable. Valeur par défaut si jamais réglée : 50 kg. Réglable dans le menu Réglages de chaque ligne (voir section 11).
- Logique de limitation, à chaque recalcul :
  ```
  si (case cochée) :
      poids = poids saisi (0 si vide/invalide)
      si poids > seuil :
          poids_utilisable = poids - seuil
          pieces_possibles = floor((poids_utilisable / colorant_kg_par_palette) * produitsParPalette)
          si pieces_possibles < reste :
              quantité_productible = pieces_possibles   (au lieu de "reste")
              limite_active = vrai
      sinon si (0 < poids <= seuil) :
          pieces_possibles = 0
          quantité_productible = 0
          limite_active = vrai
  sinon :
      quantité_productible = reste (pas de limitation)
  ```
- Si `limite_active` : afficher un encart d'alerte rouge distinct ("⛔ Maximum possible avec la cuve actuelle : {pieces_possibles} pièces — soit {reste - pieces_possibles} pièces de moins que l'objectif").
- **Important** : lorsque la cuve limite la production, **tous les calculs de consommables ET le temps restant/heure de fin doivent se baser sur `quantité_productible`, pas sur `reste`** (l'objectif complet). Seul le calcul du colorant nécessaire affiché reste basé sur l'objectif complet (`reste`), car c'est une information "ce qu'il faudrait pour finir", pas "ce qui est atteignable maintenant".
- **Mise à jour automatique du poids de cuve** : chaque fois qu'une palette est ajoutée ou retirée via le bouton ➕/➖ PALETTE (section 4), le poids de cuve saisi diminue (ajout) ou augmente (retrait) de `colorant_kg_par_palette`, automatiquement, sans action supplémentaire de l'opérateur. Plafonné à un minimum de 0.
- **Bouton de réinitialisation dédié à la cuve** (icône à côté du champ poids) : vide le poids ET décoche la case, indépendamment du bouton RÉINITIALISER général de la ligne (qui fait la même chose mais en plus de vider total/fait).
- L'état (case cochée + poids) est mémorisé et rechargé au redémarrage de l'app.

---

## 6. Poste de travail (spécifique Excellence/L60)

**Excellence est la seule ligne avec un choix de poste**, exclusif entre deux options :
- 🔧 **Arrière (Remplissage)**
- 📦 **Avant (Qualité)**

Le poste actif change l'ensemble des consommables affichés (voir section 8) :
- Poste **arrière** → Tubes laminés (252/boîte) + Tubes plastique (690/boîte)
- Poste **avant** → Paquets de notices (1200/paquet) + Boîtes d'étuis (230/boîte)

Le poste sélectionné est mémorisé et rechargé au redémarrage (par défaut : arrière si jamais réglé).

---

## 7. Consommables optionnels (spécifique CCG)

CCG a un modèle différent du poste Excellence : au lieu d'un choix exclusif, elle a **des consommables toujours nécessaires + un consommable optionnel activé par case à cocher** :
- Tubes (252/boîte) — toujours affiché
- Étuis (225/boîte) — toujours affiché
- Notices (1200/paquet) — affiché **uniquement si la case "Utiliser : Notices" est cochée**, directement dans la carte de production de la ligne (pas dans les réglages, car ça varie selon la commande, pas de façon permanente)

L'état de cette case est mémorisé et rechargé au redémarrage.

**Ce mécanisme doit être générique et réutilisable** : une future ligne pourrait avoir sa propre liste de consommables (obligatoires et/ou optionnels) sans code spécifique à cette ligne — juste une nouvelle entrée de configuration.

---

## 8. Calcul et affichage des résultats

Deux façons de présenter les consommables selon la ligne :

**A. Lignes sans consommables spéciaux (L87, et toute ligne sans config particulière)** :
```
palettes_completes = floor(quantité_productible / produitsParPalette)
reste_partiel = quantité_productible % produitsParPalette
niveaux = floor(reste_partiel / produitsParNiveau)
boites = ceil((reste_partiel % produitsParNiveau) / produitsParBoite)
```
Affiché comme deux lignes : "Palettes complètes" et "Niveaux + boîtes".

**B. Lignes avec consommables dédiés (Excellence, CCG)** : pour chaque consommable actif (voir sections 6 et 7) :
```
nb_boites = ceil(quantité_productible / quantité_par_boite)
capacité = nb_boites * quantité_par_boite
```
Affiché en boîtes nécessaires + capacité réelle entre parenthèses (ex : "20 boîtes (5 040 tubes)").

**Colorant** (si la ligne en a un) : toujours calculé sur l'objectif complet, jamais sur la quantité limitée :
```
colorant_necessaire_kg = (reste / produitsParPalette) * colorant_kg_par_palette
```
Arrondi à 1 décimale.

**Temps restant et heure de fin** :
```
minutes_totales = quantité_productible / vitesse
heures = floor(minutes_totales / 60)
minutes = floor(minutes_totales % 60)
heure_fin = heure_actuelle + minutes_totales
```

### Hiérarchie visuelle attendue

L'affichage n'est **pas** une liste plate de blocs identiques. Structure en deux niveaux :

1. **En-tête, deux colonnes de même poids visuel côte à côte** :
   - 🎯 Reste (nombre de pièces)
   - ⏱ Temps restant (heures + minutes, avec heure de fin en sous-texte)
   
   Si la cuve limite la production, un astérisque discret apparaît sur "Temps restant" avec une note en bas de carte précisant que le temps est limité par la cuve.

2. **Encart d'alerte cuve** (si applicable — section 5), positionné juste après l'en-tête, avant la liste.

3. **Checklist "🧰 À prévoir"** : une ligne par consommable, format `icône — libellé — quantité en gras`, avec le détail (capacité réelle) en petit texte gris sous la ligne si pertinent. Pas de gros blocs répétés à poids visuel égal — cette checklist doit visuellement se lire comme une liste secondaire par rapport au duo reste/temps du haut.

Quand un consommable est affecté par la limitation cuve, sa valeur affichée passe en rouge (même couleur que l'alerte cuve).

---

## 9. Menu Réglages (unifié, un seul par ligne)

**Un seul point d'entrée par ligne** (icône ⚙️ dans l'en-tête de chaque ligne) ouvrant un panneau à 4 sections. Ne pas fragmenter en plusieurs écrans/icônes séparés.

**Section Cadence**
- Champ numérique (pièces/minute). **Doit accepter les décimales** (ex: 103,5 pour CCG — voir Anomalie connue #2, à ne pas reproduire).
- Bouton "Rétablir la valeur par défaut" (recharge la cadence d'usine de la ligne, sans fermer le panneau).

**Section Seuil cuve** — visible uniquement si la ligne a un colorant configuré.
- Champ numérique (kg).

**Section Contrôle qualité** (voir section 10 pour le détail fonctionnel)
- Champ heure (HH:MM).
- Bouton "Désactiver le contrôle" (efface le réglage, retour à l'état "non configuré").

**Section File d'attente** (voir section 11 pour le détail fonctionnel)

**Comportement de sauvegarde à deux vitesses, volontaire** :
- Cadence / Seuil cuve / Heure contrôle qualité : modifications "à froid", appliquées seulement au tap sur **Valider** (un tap sur **Fermer**/Annuler abandonne les changements non validés).
- File d'attente : chaque action (ajouter/modifier/supprimer/réordonner/passer à la suivante) s'applique **immédiatement**, indépendamment du bouton Valider — ce sont des actions de gestion de flux, pas des réglages qu'on annule.

---

## 10. Contrôle qualité horaire

Chaque ligne a sa propre heure de référence pour un contrôle qualité **répété toutes les heures** à partir de cette heure (ex : réglée à 08:00 → contrôles dus à 8h, 9h, 10h, 11h...).

**Calcul de la période en cours**, à un instant donné :
```
ancre = aujourd'hui à l'heure de référence réglée
tant que ancre > maintenant : reculer ancre de 1 heure
prochaine_echeance = ancre + 1 heure
tant que prochaine_echeance <= maintenant :
    ancre = prochaine_echeance
    prochaine_echeance = prochaine_echeance + 1 heure
```
(Ce calcul gère correctement le changement de jour. Cas limite testé et validé : si l'heure actuelle tombe pile sur une échéance, celle-ci compte comme "passée" et la suivante est dans 1h pile, pas 0.)

**Bouton flottant (FAB) toujours visible**, centre bas d'écran :
- Affiche en permanence le décompte (mm:ss) jusqu'à la prochaine échéance de la ligne **actuellement affichée à l'écran** (change automatiquement quand on change d'onglet — pas un décompte global toutes lignes confondues).
- Si aucune heure n'est configurée pour la ligne active : affiche une icône statique (🕐) au lieu d'un décompte.
- Couleur/style différents si le contrôle de la période en cours a déjà été validé.

**Validation par appui long (700 ms), pas par simple tap** — décision volontaire pour éviter qu'un tap accidentel valide un contrôle qui n'a pas réellement été fait. Comportement exact :
- Si aucune heure n'est configurée : un tap (court ou long, peu importe) ouvre directement le menu Réglages de la ligne active.
- Si une heure est configurée : il faut maintenir l'appui 700 ms pour valider. Un relâchement avant les 700 ms annule sans effet. Un retour haptique léger (vibration ~40ms) confirme la validation si le matériel le permet. Un indicateur visuel progressif doit montrer que l'appui est en cours de maintien.
- Un tap simple (sans maintenir) quand une heure EST configurée ne doit avoir strictement aucun effet (ni ouverture de menu, ni validation).

Si l'heure d'échéance passe sans validation, le décompte repart simplement pour l'échéance suivante — **aucune alerte bloquante, aucun historique conservé**. Seule la dernière période validée est mémorisée (pas de journal/traçabilité — hors périmètre, volontairement, outil personnel).

---

## 11. File d'attente de commandes

Chaque ligne a sa propre file de commandes à venir (une liste de quantités simples). **Distincte de la production actuellement affichée à l'écran** — la file ne contient que les commandes futures, jamais la commande en cours de production.

Actions disponibles, toutes appliquées immédiatement (pas de bouton "Valider" à part) :
- **Ajouter** une quantité à la fin de la file.
- **Modifier** une quantité existante (édition en ligne).
- **Supprimer** une entrée.
- **Réordonner** avec des flèches haut/bas (pas de glisser-déposer).
- **Passer à la commande suivante** :
  1. Si la file est vide → notification, aucune action.
  2. Si la production actuellement affichée n'est **pas terminée** (`reste > 0`) → demander confirmation explicite avant de continuer (dialogue de confirmation, pas d'action silencieuse).
  3. Si confirmé (ou déjà terminée) : réinitialiser entièrement la ligne (production ET cuve, mêmes règles que le bouton RÉINITIALISER de la section 4), puis charger la quantité de la première commande de la file dans le champ "Quantité totale à produire", puis retirer cette commande de la file.

---

## 12. Minuteur de shift

Deux créneaux fixes, non modifiables par l'utilisateur dans l'app (valeurs à coder) :
- **Matin** : 06:05 → 14:05
- **Après-midi** : 13:55 → 21:55

Le minuteur affiché s'ouvre sur le shift détecté automatiquement selon l'heure actuelle (avant 13h55 → matin proposé, sinon après-midi), mais l'opérateur peut basculer manuellement entre les deux via deux boutons.

Affichage : décompte (HH:MM:SS) jusqu'à la fin du shift sélectionné, barre de progression (% du shift déjà écoulé), heure de fin affichée en toutes lettres. États particuliers à gérer :
- Shift pas encore commencé (heure actuelle avant le début) : afficher le décompte avant démarrage, pas de barre de progression.
- Shift déjà terminé pour aujourd'hui : basculer automatiquement sur l'occurrence du lendemain.
- Couleur du décompte : doré/normal si > 1h restante, vert si < 1h restante, couleur d'accent si à 0.

**Minuteur de pause repas**, intégré dans le même écran :
- Case à cocher pour activer/désactiver.
- Heure de pause réglable (HH:MM), mémorisée.
- Affiche un décompte avant l'heure de pause, puis bascule en "temps écoulé depuis la pause" une fois l'heure passée (mise en forme visuelle différente pour indiquer que c'est passé).

---

## 13. Stockage persistant — liste exhaustive des clés

Toutes les données sont actuellement stockées en `localStorage`, clé/valeur texte simple (les objets complexes comme la file de commandes sont sérialisés en JSON). Dans un portage natif, chaque clé ci-dessous doit avoir un équivalent :

| Clé | Contenu |
|---|---|
| `{ligne}-total` | Quantité totale à produire en cours |
| `{ligne}-fait` | Quantité déjà produite en cours |
| `cadence-{ligne}` | Cadence personnalisée (si différente du défaut) |
| `{ligne}-cuve-active` | Case "Suivre la cuve" cochée ou non (`"true"`/`"false"`) |
| `{ligne}-cuve-poids` | Poids actuel saisi dans la cuve |
| `{ligne}-cuve-seuil` | Seuil minimum personnalisé de la cuve |
| `{ligne}-conso-{id}-actif` | État d'une case de consommable optionnel (ex: `ccg-conso-notices-actif`) |
| `{ligne}-controle-heure` | Heure de référence du contrôle qualité (HH:MM) |
| `{ligne}-controle-fait-periode` | Horodatage ISO du début de la dernière période validée |
| `{ligne}-commandes` | File d'attente, tableau JSON `[{id, quantite}, ...]` |
| `l60-poste` | Poste actif pour Excellence (`"arriere"` ou `"avant"`) |
| `dernier-onglet` | Dernière ligne affichée (pour rouvrir au démarrage) |
| `repas-actif` | Minuteur repas activé ou non |
| `repas-heure` | Heure de pause réglée |

`{ligne}` désigne l'identifiant interne de la ligne (`l60`, `ccg`, `l87`).

---

## 14. Design / charte graphique

- **Couleur d'accent principale** : doré `#C5A028` (boutons de validation, éléments actifs, branding).
- **Noir/gris foncé** `#000000` / `#1a1a1a` : en-têtes, boutons d'action principaux, texte fort.
- **Rouge** `#e74c3c` : erreurs, alertes de limitation cuve.
- **Orange** `#e67e22` : bouton "retirer palette".
- **Vert** `#2ecc71` : validations positives, contrôle qualité effectué.
- Fond général clair (`#f8f8f8`/blanc), cartes blanches à coins arrondis avec ombre légère.
- Modal du minuteur de shift : fond dégradé sombre (teal foncé `#1e2a2a` → `#0f1a1a`), contraste avec le reste de l'app en thème clair.
- Boutons flottants (FAB) circulaires, ancrés en bas d'écran.
- Interface pensée pour un usage tactile en usine : gros boutons, `user-scalable=no`, pas de zoom accidentel.
- Application entièrement en français.

---

## 15. PWA / comportement hors-ligne (si portage wrapper)

- `manifest.json` : nom, icônes 192×192 et 512×512, mode `standalone`, orientation portrait forcée.
- Service Worker : mise en cache de tous les fichiers statiques à l'installation, stratégie "réseau d'abord" pour `index.html` (toujours essayer la version la plus récente en ligne, retomber sur le cache si hors-ligne), "cache d'abord" pour le reste. Nettoyage automatique des anciens caches à chaque mise à jour de version.
- Dans un APK natif, cette couche n'a plus de raison d'être (l'app est installée nativement) — sauf si l'app doit aussi rester accessible en version web.

---

## 16. Anomalies connues dans le PWA source — à NE PAS reproduire

1. **Cadence tronquée en entier à plusieurs endroits** (`parseInt` au lieu de `parseFloat`) : au chargement de l'app et lors de la validation du menu Réglages. Comme CCG a une cadence par défaut décimale (103,5), rouvrir et valider ses réglages sans même changer la valeur la tronque silencieusement à 103. **La réécriture doit traiter la cadence comme un nombre décimal partout**, y compris le champ de saisie (`step="0.1"` plutôt que `step="1"`).
2. Le libellé de la case "Suivre la cuve (min. 50kg)" est un texte figé qui ne reflète plus le seuil réel une fois celui-ci personnalisé. Le libellé doit être dynamique (ou générique, sans chiffre en dur).
3. `manifest.json` mentionne encore "L60, L70, L74, L87" dans sa description, alors que L70/L74 ont été fusionnées en CCG.
4. La confirmation avant "Commande suivante" utilise le `confirm()` natif du navigateur. Dans une app native sans WebView navigateur, prévoir l'équivalent (AlertDialog natif ou composant UI équivalent).

---

## 17. Hors périmètre (volontairement absent, ne pas ajouter sans demande explicite)

- Historique ou traçabilité des contrôles qualité (seule la dernière période validée est retenue).
- Comptes utilisateurs / authentification / multi-utilisateur (outil personnel mono-utilisateur).
- Synchronisation cloud (tout est local à l'appareil).
- Notifications système / push.
- Impression ou export de rapports.

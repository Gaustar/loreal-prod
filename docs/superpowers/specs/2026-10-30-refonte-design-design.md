# Refonte du design — écran d'une ligne

Date : 2026-10-30 · Appli « Suivi Production L'Oréal » (www/, vanilla JS, Capacitor + GitHub Pages)

## Pourquoi

En pleine production, les informations sont « désordonnées, peu visibles ». L'opérateur n'a pas le temps de chercher : il jette un coup d'œil, touche « + Palette », et veut anticiper au maximum (changement de référence, erreurs). Il ne doit jamais se tromper de poste (avant / arrière).

## Objectifs

1. Lire d'un coup d'œil, à bout de bras : progression, quantité restante, heure de fin.
2. Ajouter / retirer une palette sans viser.
3. Voir venir ce qui arrive (« À anticiper ») sans le chercher.
4. Poste avant / arrière impossible à confondre.

## Non-objectifs

- Pas de nouvelle fonctionnalité de calcul : la logique actuelle (calculer, cuve, À prévoir, réintégration AC, contrôle qualité, pause, shift, file de commandes) reste telle quelle ; on réorganise et on restyle.
- Pas d'APK (seulement sur demande) ; publication web via GitHub Pages.

## Anti-objectifs (échec même si « ça marche »)

- Afficher la progression en palettes (« 10 / 27 ») : refusé, garder les pièces « 7 200 / 19 000 ».
- Un poste qui ne se voit que dans un petit sélecteur.
- Perdre une donnée sauvegardée (localStorage : mêmes clés qu'aujourd'hui).

## Ordre de l'écran (validé)

1. **Bandeau de poste** (lignes à poste seulement, aujourd'hui Excellence) tout en haut sous les onglets : « 🔧 ARRIÈRE · REMPLISSAGE » en bleu, « 📦 AVANT · QUALITÉ » en orange, bordure pleine ; toucher le bandeau bascule le poste (remplace le sélecteur segmenté dans la carte).
2. **Héros « direction C »** (choisi parmi 3) : anneau de progression avec le pourcentage au centre ; à droite l'heure de fin en très gros (« 13:49 », « dans 2h44 ») et le reste en dessous ; sous l'anneau « 7 200 / 19 000 pièces ». États existants conservés : objectif manquant, production terminée, limite cuve (astérisque / couleur).
3. **« − Palette » (discret) / « + Palette » (gros, couleur de ligne)**, côte à côte comme aujourd'hui (1 : 2).
4. **Bloc « À anticiper »** : une liste courte, ligne par élément, regroupant ce que l'appli calcule déjà :
   - prochain contrôle qualité (si réglé) et pause/repas (si actifs), avec « dans X min » ;
   - « À prévoir » actuel (AC du poste, colorant) ;
   - réintégration AC du poste (« renvoyer 5 544 ») — le détail et les boutons Complète/Entamée restent accessibles en touchant la ligne ;
   - cuve si suivie.
5. **« ⚙️ Commande »** replié : objectif, déjà produit, cuve (poids, reset), cases consommables optionnels, changement de commande, réinitialisation.

Lignes sans poste (CCG, Color Sensation, L87) : même écran sans bandeau de poste.

## Constantes à garder

Thèmes sombre et clair, couleur propre à chaque ligne (onglet, anneau, bouton +), onglets en haut, boutons flottants minuteur / contrôle.

## Laissé au constructeur (mes choix, à vérifier)

- Bleu / orange des postes : choisis pour ne ressembler à aucune couleur de ligne ; versions claires à dériver pour le thème clair.
- Anneau en CSS `conic-gradient`, pas de bibliothèque.
- Ordre interne de « À anticiper » : le plus urgent (temps le plus court) en premier.
- Typographie, espacements, rayons : cohérents avec style.css actuel ; chiffres en `font-variant-numeric: tabular-nums`.
- Maquettes de référence : .superpowers/brainstorm/657490-1793314992/content/direction-c-v2.html.

# Suivi Production L'Oréal

Outil personnel de suivi de production sur les lignes de conditionnement
(Excellence, Casting Crème Gloss, Color Sensation, L87).

- **Version web** : https://gaustar.github.io/loreal-prod/ (publiée depuis `www/`)
- **App Android** : Capacitor, `npx cap sync android && cd android && ./gradlew assembleDebug`
- **Référence fonctionnelle** : [docs/cahier-des-charges.md](docs/cahier-des-charges.md)

Code HTML/CSS/JS vanilla, sans build, dans `www/`. Après toute modification
du web, incrémenter `CACHE_NAME` dans `www/sw.js`.

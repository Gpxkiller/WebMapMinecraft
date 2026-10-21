# Validation 0.1.0

Version initiale expérimentale, pas une garantie d’absence de bug.

- Compilation Java `--release 25` contre Paper API 26.2 ; démarrage réel isolé Paper 26.3-175, plugin chargé, export de snapshots réel vérifié.
- Test HTTP isolé : 401 sans connexion, état authentifié, aucun joueur sans opt-in, aucune seed dans l’état, dossiers privés et chemins interdits refusés, POST refusé, PNG et trois ressources web accessibles.
- Calcul C compilé sous Debian avec les sources vendues et `-Wl,-z,defs`. Test seed synthétique 1234 : Overworld, Nether, End ; PNG, conservation du cache, aucune création de chunks Minecraft.
- Cache navigateur autonome testé dans quatre contextes JS indépendants, 180 cycles virtuels avec changement de monde/zoom, erreurs et renouvellements ; saturation du cache testée. Ce n’est pas 180 minutes de navigation humaine.
- La carte privée d’origine a aussi été exercée dans trois vrais onglets pendant plus de 10 minutes, avec actualisations, profils, zooms et changements de dimension ; correctif de saturation livré sans redémarrage de service Minecraft.
- Le calcul numérique dérive du moteur précédemment comparé avec des échantillonneurs officiels 26.3 sur des points choisis. Cela ne prouve pas une égalité globale des surfaces/blocs réels : arbres, constructions et historique restent distincts.

Commandes de test :
```
node tests/cache.cjs
node --check src/main/resources/web/app.js
python3 tests/seed_smoke.py seed/build/libgpxbiomes.so
```
`tests/http.cjs` attend uniquement un laboratoire local sur le port 29127 avec le mot de passe factice indiqué dans le test. Ne pas l’utiliser contre un serveur réel. Aucun mot de passe de production n’est inclus.

Le JAR autonome n’est pas installé sur le serveur de production existant : son intégration privée reste en place. Les sources publiées ne contiennent aucune donnée de cette installation.

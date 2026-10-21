# Validation 0.1.2

Version initiale expérimentale, pas une garantie d’absence de bug.

## Audit 0.1.2 (21 octobre 2026)

- Quinze scénarios navigateur évaluent le script complet : priorité terrain réel, absence de requêtes preview désactivées, reprise après erreur/timeout, refus d’accès et réponses tardives, DOM stable pendant clics, révisions dans la même minute, retrait du dernier monde, JSON invalide, URL de dimension, isolation onglets, réel peint après les previews et requêtes non superposées. Onze cas échouaient sur 0.1.1 avant correction ; l’isolation simple des onglets passait déjà.
- Quatre contextes indépendants, 180 cycles virtuels chacun : zooms, dimensions, erreurs, retries et saturation. Ce n’est pas 180 minutes physiques d’essai.
- Trois vrais onglets sur le serveur de fixture local (données inventées) : Overworld/Nether/End distincts, rechargement et reconnexion conservant le Nether, refus d’accès masquant les trois cartes et les noms, retour réseau, terrain réel modifié au-dessus du fond calculé. Les boutons du laboratoire ne sont pas inclus dans les pages du plugin.
- Worker : démarrage sans export et JSON transitoire ne terminent plus la boucle de surveillance ; récupération vérifiée, avertissement borné sans données privées. Le test Windows simule run() et ne prétend pas tester flock ; CI Linux exerce le worker natif et le verrou avec le smoke test.
- HTTP Paper isolé : tests précédents conservés, mauvais mot de passe refusé, vingt clients parallèles, indicateur previewEnabled explicite. Pas d’installation ni redémarrage du serveur de production pour cette livraison GitHub.

Tests complémentaires : `node tests/refresh.cjs`, `python3 tests/worker_reconnect.py`.
Laboratoire navigateur facultatif : `node tests/browser-fixture.cjs`, puis ouvrir http://127.0.0.1:29129 dans plusieurs onglets. Uniquement des données fictives, écoute loopback, aucun compte du serveur réel.

## Historique de la version initiale

Correction 0.1.1 : bouton de sortie du plein écran déplacé dans la carte pour rester visible. Entrée et sortie réellement cliquées dans le navigateur, zoom et sélection de monde exercés sur la fixture locale ; aucun joueur réel utilisé.

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

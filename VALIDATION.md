# Validation 0.1.5

Version initiale expérimentale, pas une garantie d’absence de bug.

## Audit 0.1.5 (21 octobre 2026)

- Blocage reproduit sur 0.1.4 dans trois tests avant correction : déplacement et zoom au sein d’une dimension gardaient les douze places occupées par des images hors écran. Une ancienne réponse pouvait donc encore être acceptée après le déplacement. Les demandes obsolètes sont maintenant annulées, sans supprimer les images décodées.
- `node tests/viewport-network.cjs` : déplacement, zoom, cache préservé et anciens callbacks ignorés. Les trente régressions précédentes passent ; quatre contextes de 180 cycles et quatre contextes de 24 heures virtuelles passent également.
- `node tests/rapid-soak.cjs` : six contextes, 72 heures **virtuelles** chacun, 4320 pas d’une minute, doubles changements de dimension, déplacements/zooms, pannes, cache de navigation, 401/503 et reprise finale. 19656 relevés servis, 412232 callbacks d’images différés, 147496 chargements simulés réussis, au plus douze requêtes pendantes, 120 entrées de cache et quatorze temporisations dans cette fixture. Ce n’est ni 72 heures physiques ni une mesure mémoire réelle du navigateur.
- Les compteurs du laboratoire ont d’abord révélé une fixture qui laissait expirer toutes les images avant réponse : corrigée pour exercer aussi des chargements réussis ; aucune conclusion sur le plugin tirée de ce défaut de fixture.
- Calcul de terrain, priorité réel/aperçu et permissions inchangés. Aucune donnée de production ni modification du VPS.

## Audit 0.1.4 (21 octobre 2026)

- Deux défauts reproduits sur 0.1.3 avant correction : les douze téléchargements bloqués d’une dimension retenaient les places lors d’un changement de monde ou d’un clic joueur ; un geste de déplacement restait actif après une coupure réseau.
- Trois régressions dans `node tests/navigation-network.cjs` vérifient ces chemins, la conservation des images décodées et le compteur de requêtes borné.
- Les douze tests de session et quinze tests de rafraîchissement précédents passent, avec quatre contextes de 180 cycles et quatre contextes de 24 heures virtuelles (8640 pas chacun). Ce ne sont pas 24 heures physiques, ni une mesure mémoire d’un navigateur réel.
- Aucun changement au calcul du terrain, à sa priorité sur l’aperçu, aux permissions ou au serveur de production. Publication GitHub uniquement.

## Audit 0.1.3 (21 octobre 2026)

- Huit régressions reproduites sur 0.1.2 puis corrigées : recul de l’horloge, travail réseau hors ligne, reprise réseau/retour onglet non immédiats, statuts verts pendant panne/export figé, absence d’espacement des échecs et ancienne page en cache non masquée avant nouveau contrôle.
- Douze nouveaux scénarios (`node tests/long-session.cjs`), incluant corps JSON tardif, absence de prompts répétés, retry manuel et accès LAN malgré indice navigateur hors ligne. Les quinze scénarios précédents et les quatre contextes de 180 cycles sont conservés ; le test de timeout attend désormais le nouveau délai de reprise, et le test de réauthentification déclenche explicitement la reconnexion.
- `node tests/soak.cjs` : quatre contextes pendant 24 heures **virtuelles** chacun, 8640 pas de 10 secondes, intervalles de l’application actifs, changements de monde/zoom, coupures d’une heure, pannes prolongées, refus d’accès et retour de cache. 25472 réponses traitées, 5760 pas hors ligne, au plus quatre temporisations et six images sur cette fixture (limite générale 8192 toujours testée séparément). Ce ne sont pas 24 heures physiques de navigateur ni un profilage de mémoire du navigateur.
- Les fixtures ne contiennent ni seed, ni compte, ni coordonnées d’un vrai serveur. Aucun déploiement VPS pour cette livraison GitHub.
- Essai réel avec trois onglets : après trois minutes d’export volontairement figé, statuts non actualisés observés dans les trois dimensions. Le serveur Node local a ensuite été réellement arrêté (connexion refusée, pas seulement un code 503) ; le dernier terrain est resté visible, avec avertissement, pastille orange et bouton de nouvelle tentative. Le contrôle Paper isolé et ses vingt lecteurs simultanés passe aussi avec le JAR 0.1.3.
- Coupure réelle du serveur Node local de plus de deux minutes : reprise manuelle sans rechargement sur un onglet, reprise automatique sans intervention sur les deux autres, dimensions conservées. Ce contrôle réel ne correspond pas à 24 heures physiques et n’implique pas un arrêt réseau du PC ou du VPS.

Commandes nouvelles : `node tests/long-session.cjs`, `node tests/soak.cjs`.

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

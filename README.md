# WebMapMinecraft

Carte web privée et en lecture seule pour serveur **Paper Minecraft 26.3 / Java 25+**.
Version initiale expérimentale 0.1.0, licence MIT. Pas de dépendance à un hébergeur web tiers.

- Terrain réel exporté depuis les chunks **déjà chargés**, sans en charger ni en générer.
- Aperçu facultatif par seed : relief/côtes Overworld, biomes Nether/End, par calcul numérique sans démarrer Minecraft.
- Le terrain réel est toujours dessiné au-dessus de l’aperçu calculé.
- Zoom molette, déplacement, plein écran et plusieurs onglets indépendants.
- Aucune commande de modification, aucun inventaire, message privé ou historique de chat exporté.
- Positions des joueurs masquées par défaut. L’administrateur décide de les activer.

## Installer

1. Compiler avec Maven et un JDK 25+ : `mvn package`.
2. Copier `target/webmap-minecraft-0.1.0.jar` dans `plugins/`.
3. Définir `WEBMAP_PASSWORD` (au moins 16 caractères) dans l’environnement du processus serveur. Ne pas le mettre dans un dépôt, une URL ou une commande partagée. Nom de connexion par défaut : `admin`.
4. Redémarrer officiellement **lorsque le serveur est vide**. Aucun reload forcé.
5. Mettre un reverse proxy HTTPS devant `127.0.0.1:9127`. L’accès HTTP local est protégé par authentification Basic ; **ne jamais l’exposer directement sur Internet sans TLS**. Voir `deploy/nginx.conf.example`.

Le plugin n’accorde aucun rôle et ne change aucune permission Minecraft.
Sans mot de passe valide le serveur web reste désactivé. Pas de secret imprimé dans les journaux.

## Aperçu arithmétique facultatif (Linux)

Uniquement pour la génération vanilla **26.3** normale ou grands biomes. Les datapacks personnalisés, anciennes versions et zones importées peuvent différer : laisser `seed-preview: false` dans ces cas.

```
cmake -S seed -B seed/build
cmake --build seed/build --parallel 2
python3 seed/worker.py --export /chemin/serveur/plugins/WebMapMinecraft/export --library seed/build/libgpxbiomes.so --watch
```

Activer explicitement `seed-preview: true` dans la configuration du plugin, puis redémarrer à vide. Le worker utilise uniquement l’export privé et écrit des PNG, jamais les fichiers du monde. Il continue lorsque la page est fermée, sur un domaine fini : rayon 4096 blocs autour du spawn Overworld, 1024 blocs autres dimensions, 512 blocs autour des joueurs visibles. Priorité au centre du spawn. Un lot est limité à 256 tâches/30 secondes et un verrou empêche les doublons. Utiliser un service Linux avec limites CPU/mémoire pour une exécution permanente.

Les arbres, bâtiments, modifications, carving/aquifères historiques ne sont pas prédits. L’aperçu n’est pas une carte exacte de tous les blocs. Le terrain réel du Nether représente sa surface accessible jusqu’à Y=110, pas le toit.

## Sécurité et données

`export/private/generation.json` contient la seed : **privé**, jamais servi par HTTP. Ne jamais publier le dossier `export`. Aucun monde ni donnée d’un serveur réel ne fait partie de ce dépôt.
Le serveur HTTP n’accepte que GET et une liste fermée de ressources. Pas de console distante, pas de CORS, chemins et liens symboliques refusés. Les joueurs invisibles via métadonnée `vanished` sont exclus ; vérifier l’intégration avec votre plugin de vanish avant d’activer les positions. Cette version ne garde pas les positions hors ligne.

Les images sont conservées pendant leur remplacement, même après erreur réseau. Cache et téléchargements bornés, caches séparés entre onglets et mondes. Les anciens mondes doivent avoir des UUID différents après un wipe pour ne pas réutiliser des tuiles périmées.

## Limites de la version initiale

Seuls les chunks visités/chargés depuis l’installation sont exportés. Aucun balayage forcé de monde. Plafond configurable de tuiles réelles ; une nouvelle zone au-delà du plafond reste non cartographiée. Le calcul d’aperçu est limité aux zones automatiques décrites ci-dessus (pas de file de génération infinie à la demande).
Ne pas présenter les tests simulés comme une longue partie humaine. Voir `VALIDATION.md` pour les vérifications réellement réalisées.

## English

Private read-only browser map for Paper 26.3 / Java 25+. Exports only already-loaded chunk snapshots. Optional arithmetic-only seed previews; real terrain always wins. Loopback HTTP with mandatory authentication, HTTPS reverse proxy required for remote use. No private chat, inventory or server data included. Experimental initial release. MIT; Cubiomes attribution in `seed/THIRD_PARTY.md`.

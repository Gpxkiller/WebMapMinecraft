# Changements

## 0.1.2 — 21 octobre 2026

- Terrain réel prioritaire aussi pour les téléchargements : un aperçu absent ou bloqué ne monopolise plus toutes les places.
- Délais de 15 secondes et reprise après erreur pour les images et relevés ; les anciennes images restent visibles pendant un simple incident réseau.
- Refus d’accès : effacement immédiat des données privées de l’onglet et panneau de reconnexion. Les anciennes réponses ne peuvent pas rétablir les images.
- Menus et boutons conservés pendant l’actualisation ; cliquer sur un joueur utilise ses dernières coordonnées reçues.
- Dimension conservée dans l’URL de chaque onglet après rechargement/reconnexion.
- Nouvel export réel pris en compte même dans la même minute ; les aperçus restent immuables par monde.
- Suppression d’un monde et relevé invalide traités sans afficher un ancien monde comme courant.
- Aperçus désactivés ou hors de la zone calculée : pas de téléchargements inutiles.
- Worker arithmétique tolérant l’absence temporaire de l’export au démarrage/redémarrage.
- Suites de régression complètes et laboratoire navigateur reproductible, sans données réelles.

## 0.1.1

- Bouton de sortie du plein écran rendu accessible dans la carte.

## 0.1.0

- Version autonome initiale, export sans chargement de chunks, navigateur privé et calcul facultatif depuis la seed.

# Changements

## 0.1.4 — 21 octobre 2026

- Un changement de dimension ou un clic sur un joueur libère les téléchargements encore bloqués de l’ancienne dimension, sans supprimer le terrain déjà décodé.
- Une interruption réseau termine le geste de déplacement en cours : la carte ne continue plus à glisser avec un ancien clic.
- Trois nouveaux tests de régression et reprise de la simulation multi-onglets de 24 heures virtuelles, des coupures, des refus d’accès et des reconnexions.

## 0.1.3 — 21 octobre 2026

- Statuts non actualisés et pastilles orange pendant une panne ou après trois minutes sans nouvel export observé.
- Pause des téléchargements hors ligne ; tentatives espacées jusqu’à 60 secondes pendant une panne prolongée, sans vider le terrain déjà affiché.
- Reprise immédiate au retour réseau, au retour sur un onglet ou avec le bouton « Réessayer maintenant ».
- Temporisations monotones : un changement d’heure du PC ne bloque plus les relances d’images.
- Requêtes précédentes annulées et réponses tardives ignorées lors d’une reprise.
- Données privées effacées avant mise en cache de navigation ; accès revérifié au retour. Pas de demandes d’authentification répétées après refus d’accès.
- Douze nouveaux scénarios, simulation de 24 heures sur quatre onglets et vrais essais de coupure/reconnexion sur laboratoire local. La reprise manuelle reste possible pour un serveur local/LAN malgré un faux indice « hors ligne » du navigateur.
- Notice MIT incluse dans le JAR, en plus des sources du dépôt.

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

# Notes de version — PIVOT UI

## [Unreleased]

### Expiration de session
- Lorsque votre session expire, vous êtes automatiquement déconnecté et redirigé vers la page de connexion
- Un message vous informe de l'expiration : « Session expirée, veuillez vous reconnecter » — ou « Votre session longue a expiré » si vous aviez coché « Se souvenir de moi »
- Si plusieurs onglets PIVOT sont ouverts, la déconnexion s'applique à tous les onglets simultanément
- La page sur laquelle vous étiez au moment de l'expiration est mémorisée afin de vous y ramener après reconnexion

### Système de modules
- Intégration de l'API de modules : la liste des modules disponibles est désormais chargée dynamiquement selon les droits de votre organisation

---

## [0.5.0] — 1 juillet 2026

### Page de contact
- Nouvelle page de contact avec formulaire fonctionnel (email + message)
- Un e-mail de confirmation est envoyé automatiquement après soumission, dans la langue active (français ou anglais)
- La page s'intègre dans la navigation principale (barre de navigation et pied de page)
- Tous les textes du formulaire (labels, bouton, messages d'erreur, confirmation) sont traduits en français et en anglais

### Pages légales
- Les pages Mentions légales, Politique de confidentialité et CGU affichent désormais la barre de navigation et le pied de page lorsque l'utilisateur est connecté
- Le bouton « Retour » navigue vers la page précédente (adapté au contexte : application ou page de connexion)
- Une notice informe les utilisateurs anglophones que la version française est la seule version juridiquement opposable

### Signalement de bug
- Le bouton de signalement de bug génère un e-mail pré-rempli avec un formulaire structuré (description, étapes de reproduction, comportement attendu/observé, environnement)
- Le modèle s'adapte automatiquement à la langue sélectionnée (français ou anglais)

## [0.4.0] — 1 juillet 2026

### Page d'accueil
- Nouvelle page d'accueil après connexion : message de bienvenue personnalisé et grille des modules disponibles
- Chaque module affiche son icône, son nom et une courte description
- Section "Modules à venir" pour les outils en préparation
- État vide clair avec message explicatif si aucun module n'est encore activé pour votre organisation

---

## [0.3.0] — 28 juin 2026

### Navigation & interface principale
- Barre de navigation repensée : liens **Accueil**, **Modules**, **Mes équipes** avec indicateur de page active
- Basculeur de thème clair/sombre en un clic (lune / soleil)
- Sélecteur de langue **FR | EN** en forme de pilule, avec langue active mise en évidence
- Bouton **?** (aide) et bouton **bug** pour remonter un problème par email
- Menu utilisateur enrichi : avatar coloré, nom, email, raccourcis vers Profil / Préférences / Sécurité / Mes données (bientôt disponibles) et déconnexion
- Identité visuelle brand : navbar et footer en dégradé indigo → violet (thème clair) ou noir premium teinté violet (thème sombre)
- Footer complet : copyright, liens légaux, accessibilité, contact, FAQ, plan du site

### Internationalisation
- Interface disponible en français et en anglais — la langue est mémorisée entre les sessions
- Toutes les sections de l'application (navigation, tableau de bord, footer, pages à venir) respectent la langue choisie

### Thèmes visuels
- Thème **clair** : dégradé indigo → violet sur la navbar et le footer, contenu sur fond gris clair
- Thème **sombre** : fond noir premium (#09090b), navbar et footer en dégradé noir teinté violet

---

## [0.2.0] — 28 juin 2026

### Thèmes visuels
- Deux thèmes disponibles : Clair et Sombre
- Le thème est mémorisé entre les sessions et respecte automatiquement la préférence système (clair/sombre)

---

## [0.1.0] — 28 juin 2026

### Interface d'authentification

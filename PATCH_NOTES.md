# Notes de version — PIVOT UI

## [0.9.0] — 3 juillet 2026

### Administration des modules
- Les administrateurs disposent désormais d'une page dédiée (`/admin/modules`) pour activer ou désactiver les modules PIVOT de leur organisation
- Chaque module affiche clairement son statut (Actif / Inactif) et un bouton pour basculer son activation
- La désactivation d'un module demande une confirmation, car les utilisateurs connectés seront bloqués
- Un message clair s'affiche si un module n'est pas inclus dans le plan de l'organisation
- Des notifications confirment le succès ou l'échec de chaque action

---

## [0.8.0] — 3 juillet 2026

### Sécurité des mots de passe
- Un indicateur de force s'affiche désormais en temps réel sous le champ mot de passe (inscription et réinitialisation), avec un niveau clairement indiqué : « Faible », « Moyen » ou « Fort »
- Une liste de critères se coche au fur et à mesure de la saisie (longueur, majuscule, chiffre, caractère spécial)
- Le bouton d'inscription reste désactivé tant que le mot de passe ne respecte pas l'ensemble des critères
- L'erreur « Les mots de passe ne correspondent pas » s'affiche désormais uniquement après avoir quitté le champ de confirmation, pas à chaque frappe
- Indicateur et checklist entièrement accessibles : niveaux annoncés aux lecteurs d'écran, critères identifiables sans dépendre de la couleur

---

## [0.7.0] — 3 juillet 2026

### Connexion
- Après connexion, vous retrouvez directement la page que vous tentiez d'ouvrir avant d'être renvoyé à l'écran de connexion (votre contexte de navigation est préservé, y compris après une vérification d'appareil)
- Sans page d'origine, la connexion vous amène désormais sur la page d'accueil
- Sécurité renforcée : toute tentative de redirection vers un site externe après connexion est bloquée
- Une adresse inconnue saisie dans le navigateur vous ramène à la page d'accueil lorsque vous êtes connecté

### Interface
- Un indicateur de chargement accessible (annoncé aux lecteurs d'écran) s'affiche lorsque l'ouverture d'une page prend plus d'une demi-seconde

---

## [0.6.0] — 3 juillet 2026

### Expiration de session
- Lorsque votre session expire, vous êtes automatiquement déconnecté et redirigé vers la page de connexion
- Un message vous informe de l'expiration : « Session expirée, veuillez vous reconnecter » — ou « Votre session longue a expiré » si vous aviez coché « Se souvenir de moi »
- Si plusieurs onglets PIVOT sont ouverts, la déconnexion s'applique à tous les onglets simultanément
- La page sur laquelle vous étiez au moment de l'expiration est mémorisée afin de vous y ramener après reconnexion

### Système de modules
- Intégration de l'API de modules : la liste des modules disponibles est désormais chargée dynamiquement selon les droits de votre organisation
- **Protection d'accès aux modules** : si un module est désactivé pour votre organisation, l'accès à sa page est désormais bloqué automatiquement — vous êtes redirigé vers l'accueil avec un message explicatif ("Module non disponible"), et les administrateurs voient un lien direct vers la gestion des modules
- Un indicateur de chargement s'affiche brièvement pendant la vérification de l'accès à un module, pour éviter tout affichage incomplet
- Le contenu (code) d'un module désactivé n'est jamais téléchargé par votre navigateur

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

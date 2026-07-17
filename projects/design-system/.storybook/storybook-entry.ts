/*
 * Point d'entrée factice pour la cible de build Angular « storybook » (angular.json).
 *
 * Ce dépôt est une librairie ng-packagr : il n'a pas d'application bootstrappée.
 * Depuis Storybook 10, `@storybook/angular` exige une cible de build Angular explicite
 * (angularBrowserTarget) déclarée dans angular.json — la config « standalone » sans
 * angular.json n'est plus supportée (migration « Angular: drop support for calling
 * Storybook directly »).
 *
 * Storybook ne BOOTSTRAPPE jamais ce fichier : il lit uniquement les *options de build*
 * de la cible (tsConfig, styles, assets, polyfills) pour composer sa config webpack.
 * Ce fichier n'existe donc que pour satisfaire le champ obligatoire `main` du schéma
 * du builder `@angular-devkit/build-angular:browser`. Volontairement vide.
 */
export {};

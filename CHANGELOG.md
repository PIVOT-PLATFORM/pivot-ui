# [0.29.0](https://github.com/PIVOT-PLATFORM/pivot-ui/compare/v0.28.0...v0.29.0) (2026-07-13)


### Bug Fixes

* **a11y:** auth error banners announce to screen readers ([#149](https://github.com/PIVOT-PLATFORM/pivot-ui/issues/149)) ([d7bab50](https://github.com/PIVOT-PLATFORM/pivot-ui/commit/d7bab50e5310f1f804b4d04a2f70812ece2474c1)), closes [#135](https://github.com/PIVOT-PLATFORM/pivot-ui/issues/135) [#135](https://github.com/PIVOT-PLATFORM/pivot-ui/issues/135)
* add ChangeDetectionStrategy.OnPush to sidebar.component.ts ([#150](https://github.com/PIVOT-PLATFORM/pivot-ui/issues/150)) ([f776707](https://github.com/PIVOT-PLATFORM/pivot-ui/commit/f776707c15bae2c31d7c60b0390f431472d9dc6f)), closes [#137](https://github.com/PIVOT-PLATFORM/pivot-ui/issues/137)
* **ci:** packages: read pour le build deploy-dev (deps [@pivot-platform](https://github.com/pivot-platform)) ([#193](https://github.com/PIVOT-PLATFORM/pivot-ui/issues/193)) ([5ff95bf](https://github.com/PIVOT-PLATFORM/pivot-ui/commit/5ff95bf4799f5ed217d7d8fd1268862932b8366d))
* **ci:** publish npm ui-core inline in release.yml, not on dead tag trigger ([#164](https://github.com/PIVOT-PLATFORM/pivot-ui/issues/164)) ([260ebca](https://github.com/PIVOT-PLATFORM/pivot-ui/commit/260ebca9f0e14c0b99312780c1a54ed69608d967)), closes [#163](https://github.com/PIVOT-PLATFORM/pivot-ui/issues/163)
* **ci:** stop pushing mutable 'latest' Docker tag ([#148](https://github.com/PIVOT-PLATFORM/pivot-ui/issues/148)) ([40348a7](https://github.com/PIVOT-PLATFORM/pivot-ui/commit/40348a7466ad21683450551e51b985ba6a2fe007)), closes [#146](https://github.com/PIVOT-PLATFORM/pivot-ui/issues/146) [#146](https://github.com/PIVOT-PLATFORM/pivot-ui/issues/146)
* **i18n:** sync lockfile to module packages ^0.3.0 ([#184](https://github.com/PIVOT-PLATFORM/pivot-ui/issues/184)) ([9c9a78f](https://github.com/PIVOT-PLATFORM/pivot-ui/commit/9c9a78f2b1c4f5f5d5f764a30db47f81924387a9)), closes [#183](https://github.com/PIVOT-PLATFORM/pivot-ui/issues/183)
* pivot-core /api/ location uses stale-DNS-prone static upstream, causing 502 ([#155](https://github.com/PIVOT-PLATFORM/pivot-ui/issues/155)) ([4c903e6](https://github.com/PIVOT-PLATFORM/pivot-ui/commit/4c903e66ec1926a55700166e6653c9c305d90761)), closes [#154](https://github.com/PIVOT-PLATFORM/pivot-ui/issues/154)
* **ui:** EN17.10 — 2 clés Transloco whiteboard manquantes dans le catalogue shell ([#156](https://github.com/PIVOT-PLATFORM/pivot-ui/issues/156)) ([bf4a70e](https://github.com/PIVOT-PLATFORM/pivot-ui/commit/bf4a70ee41b51db6d1bf5d7c6aa30be6ea36d6f4))
* **whiteboard:** vignettes de templates (assets manquants) ([#161](https://github.com/PIVOT-PLATFORM/pivot-ui/issues/161)) ([6b1c85f](https://github.com/PIVOT-PLATFORM/pivot-ui/commit/6b1c85f509fe777a3e0237433a6e5633fafc183a))
* **ws:** upgrade le handshake WebSocket whiteboard (/api/collaboratif/ws/) ([#159](https://github.com/PIVOT-PLATFORM/pivot-ui/issues/159)) ([c455c5d](https://github.com/PIVOT-PLATFORM/pivot-ui/commit/c455c5dd221e81cc8ec21a400e30a9d68ef4a435)), closes [#157](https://github.com/PIVOT-PLATFORM/pivot-ui/issues/157)


### Features

* **ci:** implement deploy.yml (EN07.5) — was a TODO placeholder ([#132](https://github.com/PIVOT-PLATFORM/pivot-ui/issues/132)) ([7111723](https://github.com/PIVOT-PLATFORM/pivot-ui/commit/7111723531cae634b641be439010b1bbef9abd26))
* **edge:** variante nginx Cloud Run pour l'edge managed-min ([#189](https://github.com/PIVOT-PLATFORM/pivot-ui/issues/189)) ([6a647e2](https://github.com/PIVOT-PLATFORM/pivot-ui/commit/6a647e2d3c3696160a07658e65595f53ce3ec4f1))
* **i18n:** merge module catalogues from packages at build ([#183](https://github.com/PIVOT-PLATFORM/pivot-ui/issues/183)) ([7d28eb6](https://github.com/PIVOT-PLATFORM/pivot-ui/commit/7d28eb6269d7fbae1df7deee904fb7421c573968))
* **ui:** expose les pages admin/superadmin dans le menu utilisateur de la navbar ([#160](https://github.com/PIVOT-PLATFORM/pivot-ui/issues/160)) ([e57ccc2](https://github.com/PIVOT-PLATFORM/pivot-ui/commit/e57ccc2197251944a2439ee59f99d7e10b413506)), closes [pivot-ui#158](https://github.com/pivot-ui/issues/158) [#158](https://github.com/PIVOT-PLATFORM/pivot-ui/issues/158)

# [0.28.0](https://github.com/PIVOT-PLATFORM/pivot-ui/compare/v0.27.1...v0.28.0) (2026-07-09)


### Bug Fixes

* **ci:** ajout nginx.dev.conf — variante HTTP dev sans TLS ([#117](https://github.com/PIVOT-PLATFORM/pivot-ui/issues/117)) ([316fefa](https://github.com/PIVOT-PLATFORM/pivot-ui/commit/316fefa069d3f2a1fa4c5392b755587040020083)), closes [#116](https://github.com/PIVOT-PLATFORM/pivot-ui/issues/116)
* **ci:** GHCR image path doubled the repo segment, add semver tag ([#128](https://github.com/PIVOT-PLATFORM/pivot-ui/issues/128)) ([ef7001e](https://github.com/PIVOT-PLATFORM/pivot-ui/commit/ef7001e1dcf7c260ae9c6e1e363370e65fc9f124))
* **ci:** NODE_AUTH_TOKEN missing on release.yml prepare job's npm install ([#130](https://github.com/PIVOT-PLATFORM/pivot-ui/issues/130)) ([520f534](https://github.com/PIVOT-PLATFORM/pivot-ui/commit/520f53472269983debb51682d45c0770403337aa))
* **ci:** npm publish ./dist/ui-core — fix GitHub shorthand misinterpretation (EN17.3) ([#115](https://github.com/PIVOT-PLATFORM/pivot-ui/issues/115)) ([c05bbe3](https://github.com/PIVOT-PLATFORM/pivot-ui/commit/c05bbe377a118226bf051141094a0035c2edd184))
* **ci:** prepare job missing packages:read permission for npm auth ([#131](https://github.com/PIVOT-PLATFORM/pivot-ui/issues/131)) ([c582dc7](https://github.com/PIVOT-PLATFORM/pivot-ui/commit/c582dc7f1778c4c9d3261cc3d248e79125b95ee0))
* **ci:** publish-ui-core — missing npm auth + republish-on-every-push bug ([#125](https://github.com/PIVOT-PLATFORM/pivot-ui/issues/125)) ([5ffcdaf](https://github.com/PIVOT-PLATFORM/pivot-ui/commit/5ffcdaf00675ad03dc0a6ee7b48c6c980bbae9a6)), closes [#121](https://github.com/PIVOT-PLATFORM/pivot-ui/issues/121)
* **ci:** require exact-line match for the release trigger, not substring ([#106](https://github.com/PIVOT-PLATFORM/pivot-ui/issues/106)) ([d38d18c](https://github.com/PIVOT-PLATFORM/pivot-ui/commit/d38d18cbe970b0449e40e215ca6fcc6599a1baf2))
* **modules:** comingSoon modules disappear once backend registers them ([#118](https://github.com/PIVOT-PLATFORM/pivot-ui/issues/118)) ([364c9d0](https://github.com/PIVOT-PLATFORM/pivot-ui/commit/364c9d0fb67fc087dfdb1838e8fa57e3444a44b4)), closes [pivot-core#178](https://github.com/pivot-core/issues/178) [pivot-core#178](https://github.com/pivot-core/issues/178)
* **ui:** home page ignores language switch — strings hardcoded in French ([#108](https://github.com/PIVOT-PLATFORM/pivot-ui/issues/108)) ([63ffa75](https://github.com/PIVOT-PLATFORM/pivot-ui/commit/63ffa75d196b47838cc872645bbfde859cdef71e))
* **ui:** US02.2.4 — bannière de suppression figée après expiration du délai de grâce ([#97](https://github.com/PIVOT-PLATFORM/pivot-ui/issues/97)) ([835b28c](https://github.com/PIVOT-PLATFORM/pivot-ui/commit/835b28c29f9c21a16c50ea2a6136b936634efe01)), closes [#83](https://github.com/PIVOT-PLATFORM/pivot-ui/issues/83)


### Features

* **design-system:** EN17.8 — incubation Angular workspace library dans pivot-ui ([#111](https://github.com/PIVOT-PLATFORM/pivot-ui/issues/111)) ([5d6fb78](https://github.com/PIVOT-PLATFORM/pivot-ui/commit/5d6fb7890ac0acf169947dcf153f3bb0bd676664))
* **infra:** EN17.7 — nginx API Gateway multi-module routing ([#114](https://github.com/PIVOT-PLATFORM/pivot-ui/issues/114)) ([beba556](https://github.com/PIVOT-PLATFORM/pivot-ui/commit/beba556db46d85c1c46aa904ce286065797ea1da))
* **modules:** EN17.10 — câble /whiteboard sur @pivot-platform/collaboratif-ui ([#121](https://github.com/PIVOT-PLATFORM/pivot-ui/issues/121)) ([5ab4611](https://github.com/PIVOT-PLATFORM/pivot-ui/commit/5ab46116757549f309314972945cb4a894f62a68))
* **modules:** EN17.9 — câblage shell route /whiteboard vers @pivot-platform/collaboratif-ui ([#122](https://github.com/PIVOT-PLATFORM/pivot-ui/issues/122)) ([f540a69](https://github.com/PIVOT-PLATFORM/pivot-ui/commit/f540a69c10f75bdb6f9751e64527f3228a6886b5)), closes [pivot-collaboratif-ui#36](https://github.com/pivot-collaboratif-ui/issues/36)
* **ui-core:** publish @pivot-platform/ui-core library — EN17.3 ([#112](https://github.com/PIVOT-PLATFORM/pivot-ui/issues/112)) ([b88545a](https://github.com/PIVOT-PLATFORM/pivot-ui/commit/b88545ad2a89460d7fe24c97bb15c98933efb34e))

## [0.27.1](https://github.com/PIVOT-PLATFORM/pivot-ui/compare/v0.27.0...v0.27.1) (2026-07-06)


### Bug Fixes

* **ui:** toast succès rôle/statut omet le nom de l'utilisateur (dédup incorrecte) ([#98](https://github.com/PIVOT-PLATFORM/pivot-ui/issues/98)) ([556600a](https://github.com/PIVOT-PLATFORM/pivot-ui/commit/556600a82a9fd16c65cc4c92204d927e1ead7984)), closes [#84](https://github.com/PIVOT-PLATFORM/pivot-ui/issues/84)

# [0.27.0](https://github.com/PIVOT-PLATFORM/pivot-ui/compare/v0.26.0...v0.27.0) (2026-07-06)


### Features

* **ui:** EN04.4 — nginx upstream passive health check ([#104](https://github.com/PIVOT-PLATFORM/pivot-ui/issues/104)) ([423ea14](https://github.com/PIVOT-PLATFORM/pivot-ui/commit/423ea149016e4c082fc7e9c11ec7de66feaffb3c))

# [0.26.0](https://github.com/PIVOT-PLATFORM/pivot-ui/compare/v0.25.0...v0.26.0) (2026-07-06)


### Features

* **US03.3.3:** badge distinct pour modules activés par override SUPER_ADMIN ([#102](https://github.com/PIVOT-PLATFORM/pivot-ui/issues/102)) ([3225f1f](https://github.com/PIVOT-PLATFORM/pivot-ui/commit/3225f1fb46527bc54b32ddb6699845ed6902f8be))

# [0.25.0](https://github.com/PIVOT-PLATFORM/pivot-ui/compare/v0.24.0...v0.25.0) (2026-07-06)


### Features

* **ui:** badge de notifications non lues dans la navbar (US16.1.3) ([#103](https://github.com/PIVOT-PLATFORM/pivot-ui/issues/103)) ([1c08093](https://github.com/PIVOT-PLATFORM/pivot-ui/commit/1c08093786403d6f99309f58ab888fa07a5216b6)), closes [#160](https://github.com/PIVOT-PLATFORM/pivot-ui/issues/160) [#160](https://github.com/PIVOT-PLATFORM/pivot-ui/issues/160)

# [0.24.0](https://github.com/PIVOT-PLATFORM/pivot-ui/compare/v0.23.0...v0.24.0) (2026-07-06)


### Features

* **ui:** gestion des appareils de confiance (US01.4.2) ([#100](https://github.com/PIVOT-PLATFORM/pivot-ui/issues/100)) ([e57bc7b](https://github.com/PIVOT-PLATFORM/pivot-ui/commit/e57bc7b30c12819f85528f2c424427c7eb079d30)), closes [#152](https://github.com/PIVOT-PLATFORM/pivot-ui/issues/152)

# [0.23.0](https://github.com/PIVOT-PLATFORM/pivot-ui/compare/v0.22.1...v0.23.0) (2026-07-06)


### Features

* **ui:** superadmin plan/module configuration screen (US03.3.1) ([#101](https://github.com/PIVOT-PLATFORM/pivot-ui/issues/101)) ([1359e3d](https://github.com/PIVOT-PLATFORM/pivot-ui/commit/1359e3d5239bccf9bf94da633adec232d1f81739))

## [0.22.1](https://github.com/PIVOT-PLATFORM/pivot-ui/compare/v0.22.0...v0.22.1) (2026-07-06)


### Bug Fixes

* **docs:** étend l'Autoloop PR à toutes les branches, pas seulement feat/{us-id} ([#96](https://github.com/PIVOT-PLATFORM/pivot-ui/issues/96)) ([2eced1e](https://github.com/PIVOT-PLATFORM/pivot-ui/commit/2eced1edd75aff4875b7220d6273167d37955828)), closes [#147](https://github.com/PIVOT-PLATFORM/pivot-ui/issues/147)

# [0.22.0](https://github.com/PIVOT-PLATFORM/pivot-ui/compare/v0.21.0...v0.22.0) (2026-07-06)


### Features

* **ui:** US02.2.4 — Suppression de compte (RGPD Art.17), frontend ([#83](https://github.com/PIVOT-PLATFORM/pivot-ui/issues/83)) ([010c724](https://github.com/PIVOT-PLATFORM/pivot-ui/commit/010c72451a80858e0b0f5be3b78e7d311a58f0be)), closes [#140](https://github.com/PIVOT-PLATFORM/pivot-ui/issues/140)

# [0.21.0](https://github.com/PIVOT-PLATFORM/pivot-ui/compare/v0.20.0...v0.21.0) (2026-07-06)


### Features

* **ui:** US06.1.4/US06.1.5 - admin désactive/réactive un compte utilisateur ([#85](https://github.com/PIVOT-PLATFORM/pivot-ui/issues/85)) ([7fc919b](https://github.com/PIVOT-PLATFORM/pivot-ui/commit/7fc919b55cb834bb5ccd3d06dd5a8a7480b03f6d)), closes [#142](https://github.com/PIVOT-PLATFORM/pivot-ui/issues/142)

# [0.20.0](https://github.com/PIVOT-PLATFORM/pivot-ui/compare/v0.19.0...v0.20.0) (2026-07-06)


### Features

* **ui:** US06.1.3 - admin modifie le rôle d'un utilisateur ([#84](https://github.com/PIVOT-PLATFORM/pivot-ui/issues/84)) ([ceba5ff](https://github.com/PIVOT-PLATFORM/pivot-ui/commit/ceba5ffe9aca6b9135eb42c30a4b07274b365c7b))

# [0.19.0](https://github.com/PIVOT-PLATFORM/pivot-ui/compare/v0.18.0...v0.19.0) (2026-07-06)


### Features

* **ui:** US06.1.2 - admin liste les utilisateurs de son tenant ([#82](https://github.com/PIVOT-PLATFORM/pivot-ui/issues/82)) ([2d7a918](https://github.com/PIVOT-PLATFORM/pivot-ui/commit/2d7a918b93fc942c2796a2ff4172c26ddd0237bb)), closes [#127](https://github.com/PIVOT-PLATFORM/pivot-ui/issues/127) [#D97706](https://github.com/PIVOT-PLATFORM/pivot-ui/issues/D97706) [#FEF3C7](https://github.com/PIVOT-PLATFORM/pivot-ui/issues/FEF3C7) [#92400E](https://github.com/PIVOT-PLATFORM/pivot-ui/issues/92400E)

# [0.18.0](https://github.com/PIVOT-PLATFORM/pivot-ui/compare/v0.17.0...v0.18.0) (2026-07-06)


### Features

* **ui:** US06.2.1 - super admin crée un tenant ([#76](https://github.com/PIVOT-PLATFORM/pivot-ui/issues/76)) ([bdd0b72](https://github.com/PIVOT-PLATFORM/pivot-ui/commit/bdd0b7240bd4801dca4a11507cfaeb5b7d8b8ba8)), closes [#134](https://github.com/PIVOT-PLATFORM/pivot-ui/issues/134) [#059669](https://github.com/PIVOT-PLATFORM/pivot-ui/issues/059669)

# [0.17.0](https://github.com/PIVOT-PLATFORM/pivot-ui/compare/v0.16.0...v0.17.0) (2026-07-06)


### Features

* **ui:** US02.1.2 — Préférence de langue ([#72](https://github.com/PIVOT-PLATFORM/pivot-ui/issues/72)) ([c307b2b](https://github.com/PIVOT-PLATFORM/pivot-ui/commit/c307b2b16c3b0fb9db180c0568c67a6d759e1aca)), closes [#130](https://github.com/PIVOT-PLATFORM/pivot-ui/issues/130)

# [0.16.0](https://github.com/PIVOT-PLATFORM/pivot-ui/compare/v0.15.0...v0.16.0) (2026-07-06)


### Features

* **ui:** US02.3.1 — Export de ses données personnelles (RGPD Art.20) ([#75](https://github.com/PIVOT-PLATFORM/pivot-ui/issues/75)) ([2734cea](https://github.com/PIVOT-PLATFORM/pivot-ui/commit/2734cea88c1e69079891a94b35ed14fb25ee6094)), closes [#133](https://github.com/PIVOT-PLATFORM/pivot-ui/issues/133) [#133](https://github.com/PIVOT-PLATFORM/pivot-ui/issues/133)

# [0.15.0](https://github.com/PIVOT-PLATFORM/pivot-ui/compare/v0.14.0...v0.15.0) (2026-07-06)


### Features

* **account:** sessions actives — voir et révoquer (US02.2.3) ([#74](https://github.com/PIVOT-PLATFORM/pivot-ui/issues/74)) ([7a639ae](https://github.com/PIVOT-PLATFORM/pivot-ui/commit/7a639ae6c46641b2070435c1aeab43c43dd3310f))

# [0.14.0](https://github.com/PIVOT-PLATFORM/pivot-ui/compare/v0.13.0...v0.14.0) (2026-07-06)


### Features

* **ui:** US02.2.2 - Changer son e-mail ([#73](https://github.com/PIVOT-PLATFORM/pivot-ui/issues/73)) ([b98ce3b](https://github.com/PIVOT-PLATFORM/pivot-ui/commit/b98ce3b2599f7e7a15c54958e7860d6d0032ffa3)), closes [#70](https://github.com/PIVOT-PLATFORM/pivot-ui/issues/70) [#70](https://github.com/PIVOT-PLATFORM/pivot-ui/issues/70) [#131](https://github.com/PIVOT-PLATFORM/pivot-ui/issues/131) [#1](https://github.com/PIVOT-PLATFORM/pivot-ui/issues/1)

# [0.13.0](https://github.com/PIVOT-PLATFORM/pivot-ui/compare/v0.12.0...v0.13.0) (2026-07-06)


### Features

* **ui:** US02.1.1 — Voir et éditer son profil ([#71](https://github.com/PIVOT-PLATFORM/pivot-ui/issues/71)) ([1605d1d](https://github.com/PIVOT-PLATFORM/pivot-ui/commit/1605d1ddb9bbdc1937a06e57de3e2df11a9ac697)), closes [#129](https://github.com/PIVOT-PLATFORM/pivot-ui/issues/129) [pivot-core#129](https://github.com/pivot-core/issues/129)

# [0.12.0](https://github.com/PIVOT-PLATFORM/pivot-ui/compare/v0.11.0...v0.12.0) (2026-07-06)


### Features

* **auth:** US02.2.1 - Changer son mot de passe ([#70](https://github.com/PIVOT-PLATFORM/pivot-ui/issues/70)) ([678c4f0](https://github.com/PIVOT-PLATFORM/pivot-ui/commit/678c4f03d5bda6af21a57bd560db870aeee48d8a)), closes [pivot-core#128](https://github.com/pivot-core/issues/128)

# [0.11.0](https://github.com/PIVOT-PLATFORM/pivot-ui/compare/v0.10.1...v0.11.0) (2026-07-06)


### Features

* **ui:** US06.2.3 - super admin liste tous les tenants ([#69](https://github.com/PIVOT-PLATFORM/pivot-ui/issues/69)) ([8202aa5](https://github.com/PIVOT-PLATFORM/pivot-ui/commit/8202aa5fa09befd1ab7f7ff0beb860312044aa4f)), closes [#2](https://github.com/PIVOT-PLATFORM/pivot-ui/issues/2)

## [0.10.1](https://github.com/PIVOT-PLATFORM/pivot-ui/compare/v0.10.0...v0.10.1) (2026-07-05)


### Bug Fixes

* **claude:** clarifie que pivot-design-system n'est pas encore créé ([#79](https://github.com/PIVOT-PLATFORM/pivot-ui/issues/79)) ([8688a9a](https://github.com/PIVOT-PLATFORM/pivot-ui/commit/8688a9a1c28b7f1e714e2a25d0b4dc2a1c628d2a))

# [0.10.0](https://github.com/PIVOT-PLATFORM/pivot-ui/compare/v0.9.0...v0.10.0) (2026-07-03)


### Features

* **modules:** EN03.2/US03.2.2 - moduleGuard bloque accès module désactivé ([#67](https://github.com/PIVOT-PLATFORM/pivot-ui/issues/67)) ([19bacf5](https://github.com/PIVOT-PLATFORM/pivot-ui/commit/19bacf5b22b659876082df280ce13bc7703832f1))

# [0.9.0](https://github.com/PIVOT-PLATFORM/pivot-ui/compare/v0.8.0...v0.9.0) (2026-07-03)


### Features

* **ui:** admin module activation UI (US03.1.1/US03.1.2/US03.2.1) ([#66](https://github.com/PIVOT-PLATFORM/pivot-ui/issues/66)) ([bb15b2d](https://github.com/PIVOT-PLATFORM/pivot-ui/commit/bb15b2dcdcef02ffe9d746018f2e65be708d7fa4))

# [0.8.0](https://github.com/PIVOT-PLATFORM/pivot-ui/compare/v0.7.0...v0.8.0) (2026-07-03)


### Features

* **ui:** PasswordStrengthComponent — indicateur de robustesse du mot de passe (US01.2.4) ([#65](https://github.com/PIVOT-PLATFORM/pivot-ui/issues/65)) ([16c6de8](https://github.com/PIVOT-PLATFORM/pivot-ui/commit/16c6de835a51d4b4900a51ca70bc6f6e69b19936)), closes [#125](https://github.com/PIVOT-PLATFORM/pivot-ui/issues/125)

# [0.7.0](https://github.com/PIVOT-PLATFORM/pivot-ui/compare/v0.6.0...v0.7.0) (2026-07-03)


### Features

* **auth:** US01.1.4 — Redirection post-login ([#64](https://github.com/PIVOT-PLATFORM/pivot-ui/issues/64)) ([6093214](https://github.com/PIVOT-PLATFORM/pivot-ui/commit/6093214e11a24d5655f51f17fdcd9eea1c261217)), closes [#125](https://github.com/PIVOT-PLATFORM/pivot-ui/issues/125)

# [0.6.0](https://github.com/PIVOT-PLATFORM/pivot-ui/compare/v0.5.0...v0.6.0) (2026-07-03)


### Features

* **auth:** US01.1.5 — Expiration de session (front) + auto-logout ([#63](https://github.com/PIVOT-PLATFORM/pivot-ui/issues/63)) ([ef0374a](https://github.com/PIVOT-PLATFORM/pivot-ui/commit/ef0374a92a06f522af69f086f04f50f8481d8830))

# [0.5.0](https://github.com/PIVOT-PLATFORM/pivot-ui/compare/v0.4.0...v0.5.0) (2026-07-01)


### Features

* **ui:** ContactComponent — contact cards, form validation, public route ([#48](https://github.com/PIVOT-PLATFORM/pivot-ui/issues/48)) ([db8648d](https://github.com/PIVOT-PLATFORM/pivot-ui/commit/db8648d2b95b91594c16552cb5fe8ec41c039a33)), closes [#7C3AED](https://github.com/PIVOT-PLATFORM/pivot-ui/issues/7C3AED) [#4338ca](https://github.com/PIVOT-PLATFORM/pivot-ui/issues/4338ca)

# [0.4.0](https://github.com/PIVOT-PLATFORM/pivot-ui/compare/v0.3.0...v0.4.0) (2026-07-01)


### Features

* **ui:** HomeComponent — module grid, coming-soon cards, module registry ([#47](https://github.com/PIVOT-PLATFORM/pivot-ui/issues/47)) ([762a4ac](https://github.com/PIVOT-PLATFORM/pivot-ui/commit/762a4ac7b71aee3f6ed8baa9cb513d462591615e))

# [0.3.0](https://github.com/PIVOT-PLATFORM/pivot-ui/compare/v0.2.0...v0.3.0) (2026-06-28)


### Features

* **ui:** redesign shell and navbar — top-nav layout, theme toggle, user menu ([#49](https://github.com/PIVOT-PLATFORM/pivot-ui/issues/49)) ([f63d423](https://github.com/PIVOT-PLATFORM/pivot-ui/commit/f63d423cbd53d2bc385c2d4884123590e1caf3e8)), closes [#4338ca](https://github.com/PIVOT-PLATFORM/pivot-ui/issues/4338ca) [#7c3aed](https://github.com/PIVOT-PLATFORM/pivot-ui/issues/7c3aed) [#09090b](https://github.com/PIVOT-PLATFORM/pivot-ui/issues/09090b)

# [0.2.0](https://github.com/PIVOT-PLATFORM/pivot-ui/compare/v0.1.0...v0.2.0) (2026-06-28)


### Features

* **ui:** ThemeService — light/dark/ocean themes with CSS token overrides ([#46](https://github.com/PIVOT-PLATFORM/pivot-ui/issues/46)) ([1e1171b](https://github.com/PIVOT-PLATFORM/pivot-ui/commit/1e1171be1755c9ed31d5187c8b3cfdcf2f3c38c2))

# [0.1.0](https://github.com/PIVOT-PLATFORM/pivot-ui/compare/v0.0.0...v0.1.0) (2026-06-28)


### Bug Fixes

* remove duplicate root CODEOWNERS — .github/CODEOWNERS takes effect ([d757e81](https://github.com/PIVOT-PLATFORM/pivot-ui/commit/d757e81b0a9ac19a6375d8e53b8b89a0c5162228))
* **ui:** i18n pipe on error signal + tokenState guard in reset-password submit ([80920d1](https://github.com/PIVOT-PLATFORM/pivot-ui/commit/80920d1100619f8a14063b03a78793ce5cc6a127))
* **ui:** remove dead error signal, add tokenState guard test ([b6e5980](https://github.com/PIVOT-PLATFORM/pivot-ui/commit/b6e5980f4de3fd61e60f9627db480c6ea4f08af9))


### Features

* **a11y:** add aria-busy on submit buttons; test double-submit on error ([7bcecca](https://github.com/PIVOT-PLATFORM/pivot-ui/commit/7bceccada851fac53bc710b1e15be739ff294036))
* **a11y:** aria-describedby on password field, role=alert on error span ([0e2ac31](https://github.com/PIVOT-PLATFORM/pivot-ui/commit/0e2ac31642f843af77543598c7fc00e1efe49ea6)), closes [input#newPassword](https://github.com/input/issues/newPassword)
* **a11y:** replace aria-busy with role=status live region; add DOM test ([cdb06c8](https://github.com/PIVOT-PLATFORM/pivot-ui/commit/cdb06c8f0170e446d30be99fe7a5fb79efb70164))
* **ci:** add DAST workflows (baseline + full scan avec pivot-core GHCR) ([e62eb09](https://github.com/PIVOT-PLATFORM/pivot-ui/commit/e62eb09258c085c209097a86adc3f01e0d7d3013))
* **docker:** add docker-compose.yml (cohérence avec pivot-core) ([d3d3a02](https://github.com/PIVOT-PLATFORM/pivot-ui/commit/d3d3a0230ada012b9b4842b69f3e704dd4783b37))
* migrate Angular source code from pivot-core/frontend/ ([91ec06c](https://github.com/PIVOT-PLATFORM/pivot-ui/commit/91ec06cc63c8e066231eeaa53f275917b859f922))
* **modules:** PivotModuleDto, PivotModuleUi, ModuleRegistryService ([#45](https://github.com/PIVOT-PLATFORM/pivot-ui/issues/45)) ([27d108e](https://github.com/PIVOT-PLATFORM/pivot-ui/commit/27d108e1266298979f10d01c7624b72795ca52ba))
* **ui:** auth pages MVP — E01 ([#39](https://github.com/PIVOT-PLATFORM/pivot-ui/issues/39)) ([8b73c94](https://github.com/PIVOT-PLATFORM/pivot-ui/commit/8b73c94f787f434ce421668901d4960ac1b91151)), closes [#19](https://github.com/PIVOT-PLATFORM/pivot-ui/issues/19) [CA#6](https://github.com/CA/issues/6) [CA#6](https://github.com/CA/issues/6) [CA#7](https://github.com/CA/issues/7)

# Changelog

All notable changes to PIVOT UI are documented in this file.

**Versioning :** [Semantic Versioning](https://semver.org/spec/v2.0.0.html) — automated via [Semantic Release](https://github.com/semantic-release/semantic-release) on push to `main`.

---

## [0.0.0] - 2026-06-28

### Features

* **auth:** login, register, verify-email, resend-verification, forgot-password, reset-password, device-confirm pages
* **auth:** OIDC PKCE S256 client via `angular-oauth2-oidc`
* **auth:** opaque token session — in-memory only, never localStorage
* **auth:** anti-enumeration — resend-verification always shows success screen regardless of server response
* **auth:** token validation guard on reset-password — blocks submit if token expired/invalid
* **i18n:** Transloco (fr/en) on all auth pages
* **a11y:** WCAG 2.1 AA — `role="status"` live regions on loading states, `aria-describedby` + `role="alert"` on errors, `.sr-only`, focus management, keyboard navigation
* **ui:** Angular 22, TypeScript strict, `ChangeDetectionStrategy.OnPush`, Signals, RxJS
* **ui:** SCSS design system — tokens CSS, BEM, responsive, dark-mode ready
* **infra:** Docker nginx production image
* **ci:** GitHub Actions — build, lint (ESLint), TypeScript strict, tests (Vitest + coverage), SonarCloud
* **ci:** DAST (ZAP baseline monthly + full scan manual), SCA (Trivy + npm audit + Dependabot), SBOM CycloneDX, secret scanning (Gitleaks), SAST (CodeQL + Semgrep), SLSA L3, OpenSSF Scorecard, Lighthouse accessibility, Playwright E2E, Plumber compliance

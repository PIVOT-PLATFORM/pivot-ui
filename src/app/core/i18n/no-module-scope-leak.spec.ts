import fr from '../../../../public/assets/i18n/fr.json';
import en from '../../../../public/assets/i18n/en.json';

// Namespaces de modules : ownés par les libs de module via leur scope Transloco,
// jamais recopiés dans le catalogue global du shell.
const MODULE_SCOPES = ['whiteboard', 'pilotage', 'agilite', 'collaboratif'];

describe('catalogue i18n global du shell', () => {
  for (const catalog of [{ name: 'fr', data: fr }, { name: 'en', data: en }]) {
    for (const scope of MODULE_SCOPES) {
      it(`${catalog.name}.json ne contient pas le namespace de module "${scope}"`, () => {
        expect((catalog.data as Record<string, unknown>)[scope]).toBeUndefined();
      });
    }
  }
});

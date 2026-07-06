import { slugify } from './create-tenant.model';

describe('slugify', () => {
  it('lowercases and hyphenates a simple name', () => {
    expect(slugify('Acme Corp')).toBe('acme-corp');
  });

  it('strips accents (French tenant names)', () => {
    expect(slugify('Société Générale')).toBe('societe-generale');
  });

  it('collapses runs of non alphanumeric characters into a single hyphen', () => {
    expect(slugify('Acme   Corp !!  --  Ltd')).toBe('acme-corp-ltd');
  });

  it('trims leading and trailing hyphens', () => {
    expect(slugify('  --Acme Corp--  ')).toBe('acme-corp');
  });

  it('truncates to 50 characters (backend max length)', () => {
    const longName = 'a'.repeat(80);
    expect(slugify(longName)).toHaveLength(50);
  });

  it('returns an empty string for an empty/blank name', () => {
    expect(slugify('')).toBe('');
    expect(slugify('   ')).toBe('');
  });

  it('is idempotent on an already-valid slug', () => {
    expect(slugify('acme-corp-42')).toBe('acme-corp-42');
  });
});

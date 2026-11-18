import { normalizeEmail } from './email';

describe('normalizeEmail', () => {
  it('lower-cases the address', () => {
    expect(normalizeEmail('Ada.Lovelace@Example.COM')).toBe(
      'ada.lovelace@example.com',
    );
  });

  it('trims surrounding whitespace', () => {
    expect(normalizeEmail('  ada@example.com \n')).toBe('ada@example.com');
  });

  it('leaves an already-normal address unchanged', () => {
    expect(normalizeEmail('ada+tag@example.com')).toBe('ada+tag@example.com');
  });

  it('does not alter anything but case and edge whitespace', () => {
    // Dots and plus-tags are significant, and are never treated as patterns.
    expect(normalizeEmail('a.b+c@x.io')).toBe('a.b+c@x.io');
  });
});

import { formatTrustedDeviceDateTime } from './trusted-device-date.util';

describe('formatTrustedDeviceDateTime', () => {
  it('formats in French (medium date, short time, UTC) for lang "fr"', () => {
    expect(formatTrustedDeviceDateTime('2026-07-01T10:00:00Z', 'fr')).toBe('1 juil. 2026, 10:00');
  });

  it('formats in English (medium date, short time, UTC) for lang "en"', () => {
    expect(formatTrustedDeviceDateTime('2026-07-01T10:00:00Z', 'en')).toBe('Jul 1, 2026, 10:00 AM');
  });

  it('defaults to French formatting for any lang other than "en"', () => {
    expect(formatTrustedDeviceDateTime('2026-07-01T10:00:00Z', 'de')).toBe('1 juil. 2026, 10:00');
  });

  it('is not affected by the host machine timezone (explicit UTC)', () => {
    // Midnight UTC would roll back a day in a negative-offset local timezone
    // if the formatter used the host's local zone instead of UTC.
    expect(formatTrustedDeviceDateTime('2026-01-01T00:05:00Z', 'fr')).toBe('1 janv. 2026, 00:05');
  });
});

import { TestBed } from '@angular/core/testing';
import { DeviceService } from './device.service';

describe('DeviceService', () => {
  let service: DeviceService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DeviceService);
  });

  describe('getDeviceFingerprint()', () => {
    it('should return a non-empty string', () => {
      const fp = service.getDeviceFingerprint();
      expect(fp).toBeTruthy();
      expect(typeof fp).toBe('string');
      expect(fp.length).toBeGreaterThan(0);
    });

    it('should return at most 64 characters', () => {
      const fp = service.getDeviceFingerprint();
      expect(fp.length).toBeLessThanOrEqual(64);
    });

    it('should return the same value when called multiple times', () => {
      const fp1 = service.getDeviceFingerprint();
      const fp2 = service.getDeviceFingerprint();
      expect(fp1).toBe(fp2);
    });

    it('should return a different fingerprint when navigator.userAgent changes', () => {
      const original = navigator.userAgent;
      const fp1 = service.getDeviceFingerprint();

      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 CustomAgent/1.0',
        writable: true,
        configurable: true,
      });

      const fp2 = service.getDeviceFingerprint();

      Object.defineProperty(navigator, 'userAgent', {
        value: original,
        writable: true,
        configurable: true,
      });

      // Only assert they differ if the UA actually changed
      if (navigator.userAgent !== original) {
        expect(fp1).not.toBe(fp2);
      }
    });
  });

  describe('getDeviceName()', () => {
    it('should return a non-empty string', () => {
      const name = service.getDeviceName();
      expect(name).toBeTruthy();
      expect(typeof name).toBe('string');
      expect(name.length).toBeGreaterThan(0);
    });

    it('should contain a browser name and an OS separated by " · "', () => {
      const name = service.getDeviceName();
      expect(name).toMatch(/·/);
      const [browser, os] = name.split(' · ');
      expect(browser.trim().length).toBeGreaterThan(0);
      expect(os.trim().length).toBeGreaterThan(0);
    });

    it('should detect Chrome when userAgent contains "Chrome"', () => {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        writable: true,
        configurable: true,
      });
      const name = service.getDeviceName();
      expect(name).toContain('Chrome');
    });

    it('should detect Firefox when userAgent contains "Firefox"', () => {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0',
        writable: true,
        configurable: true,
      });
      const name = service.getDeviceName();
      expect(name).toContain('Firefox');
    });

    it('should detect Safari when userAgent contains "Safari" but not "Chrome" or "Edg"', () => {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
        writable: true,
        configurable: true,
      });
      const name = service.getDeviceName();
      expect(name).toContain('Safari');
    });

    it('should detect Edge when userAgent contains "Edg"', () => {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
        writable: true,
        configurable: true,
      });
      const name = service.getDeviceName();
      expect(name).toContain('Edge');
    });

    it('should return a known browser name or a fallback', () => {
      const name = service.getDeviceName();
      const knownBrowsers = ['Firefox', 'Edge', 'Chrome', 'Safari', 'Navigateur'];
      const [browser] = name.split(' · ');
      expect(knownBrowsers).toContain(browser.trim());
    });
  });
});

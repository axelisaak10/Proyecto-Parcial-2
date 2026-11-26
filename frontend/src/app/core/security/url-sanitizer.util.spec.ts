import { FormControl } from '@angular/forms';
import {
  safeImageUrlValidator,
  sanitizeImageUrl,
  sanitizeReturnUrl,
} from './url-sanitizer.util';

describe('url-sanitizer.util', () => {
  describe('sanitizeReturnUrl', () => {
    it('allows valid internal paths', () => {
      expect(sanitizeReturnUrl('/products')).toBe('/products');
      expect(sanitizeReturnUrl('/users?page=2')).toBe('/users?page=2');
    });

    it('blocks protocol-relative, external, and malformed redirect targets', () => {
      expect(sanitizeReturnUrl('//evil.com')).toBe('/dashboard');
      expect(sanitizeReturnUrl('https://evil.com/phish')).toBe('/dashboard');
      expect(sanitizeReturnUrl('javascript:alert(1)')).toBe('/dashboard');
      expect(sanitizeReturnUrl('/\\evil.com')).toBe('/dashboard');
      expect(sanitizeReturnUrl(null)).toBe('/dashboard');
    });
  });

  describe('sanitizeImageUrl', () => {
    it('allows https URLs and single-slash relative asset paths', () => {
      expect(sanitizeImageUrl('https://cdn.toystore.com/toy.png')).toBe(
        'https://cdn.toystore.com/toy.png'
      );
      expect(sanitizeImageUrl('/assets/shoe.png')).toBe('/assets/shoe.png');
    });

    it('rejects javascript:, data:, insecure http:, and protocol-relative URLs', () => {
      expect(sanitizeImageUrl('javascript:alert(1)')).toBeNull();
      expect(sanitizeImageUrl('data:text/html,<script>alert(1)</script>')).toBeNull();
      expect(sanitizeImageUrl('http://insecure.example.com/img.png')).toBeNull();
      expect(sanitizeImageUrl('//cdn.evil.com/img.png')).toBeNull();
      expect(sanitizeImageUrl('')).toBeNull();
    });
  });

  describe('safeImageUrlValidator', () => {
    it('validates reactive form control values properly', () => {
      const validator = safeImageUrlValidator();
      expect(validator(new FormControl(''))).toBeNull();
      expect(validator(new FormControl('https://cdn.example.com/a.webp'))).toBeNull();
      expect(validator(new FormControl('javascript:alert(1)'))).toEqual({
        unsafeImageUrl: true,
      });
    });
  });
});

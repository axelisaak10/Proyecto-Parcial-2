import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/**
 * Validates and restricts internal redirect URLs to prevent Open Redirect attacks.
 */
export function sanitizeReturnUrl(raw: string | null | undefined, fallback = '/dashboard'): string {
  if (!raw) return fallback;
  const trimmed = raw.trim();
  if (
    !trimmed.startsWith('/') ||
    trimmed.startsWith('//') ||
    trimmed.startsWith('/\\') ||
    trimmed.includes('://') ||
    /[\r\n\t]/.test(trimmed)
  ) {
    return fallback;
  }
  return trimmed;
}

/**
 * Allows only relative local asset paths ('/...') or strict HTTPS URLs.
 * Blocks javascript:, data:, vbscript:, and insecure http: URIs.
 */
export function sanitizeImageUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) {
    return trimmed;
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'https:') {
      return parsed.toString();
    }
  } catch {
    return null;
  }

  return null;
}

export function safeImageUrlValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value as string | null | undefined;
    if (!value || !value.trim()) {
      return null;
    }
    return sanitizeImageUrl(value) ? null : { unsafeImageUrl: true };
  };
}

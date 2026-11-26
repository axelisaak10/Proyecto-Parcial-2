import type { Response } from 'express';
import type { ZodType } from 'zod';
import { apiError } from '../types/api-response';

export function parsePositiveIntParam(raw: string | string[] | undefined): number | null {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value || !/^\d+$/.test(value)) {
    return null;
  }
  const num = Number.parseInt(value, 10);
  return Number.isSafeInteger(num) && num > 0 ? num : null;
}

export function getQueryString(raw: unknown): string | null {
  if (typeof raw === 'string') return raw;
  if (Array.isArray(raw) && typeof raw[0] === 'string') return raw[0];
  return null;
}

export function getQueryInt(raw: unknown, fallback: number): number {
  const str = getQueryString(raw);
  if (!str) return fallback;
  const parsed = Number.parseInt(str, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function getQueryBool(raw: unknown): boolean | null {
  const str = getQueryString(raw)?.trim().toLowerCase();
  if (str === 'true') return true;
  if (str === 'false') return false;
  return null;
}

export function parseBody<T>(
  schema: ZodType<T>,
  body: unknown,
  res: Response
): T | null {
  const result = schema.safeParse(body);
  if (!result.success) {
    const firstIssue = result.error.issues[0];
    res.status(400).json(apiError(firstIssue?.message || 'Validation failed', 400));
    return null;
  }
  return result.data;
}

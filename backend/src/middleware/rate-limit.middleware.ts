import rateLimit from 'express-rate-limit';
import { apiError } from '../types/api-response';

export function createAuthRateLimiter(isTest: boolean) {
  return rateLimit({
    windowMs: 60_000,
    limit: isTest ? 10_000 : 20,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (_req, res) => {
      res.status(429).json(apiError('Too many requests, please try again later', 429));
    },
  });
}

/** Evaluate whether a request Origin is allowed. Health checks and curl omit Origin. */
export function evaluateCorsOrigin(
  origin: string | undefined,
  allowedOrigins: string[],
  nodeEnv: string,
): { allowed: boolean; error?: string } {
  if (nodeEnv === 'production' && allowedOrigins.length === 0) {
    return { allowed: false, error: 'CORS is not configured for production' };
  }
  if (allowedOrigins.length === 0) return { allowed: true };
  if (!origin) {
    return { allowed: false, error: 'CORS: Origin header required' };
  }
  if (allowedOrigins.includes(origin)) return { allowed: true };
  return { allowed: false, error: 'Not allowed by CORS' };
}

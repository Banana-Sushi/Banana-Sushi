/**
 * In-memory rate limiter for login endpoints.
 * Works well for single-server / VPS deployments.
 * For serverless (Vercel), swap the store with Upstash Redis.
 */

const IP_WINDOW_MS   = 15 * 60 * 1000; // 15-minute window
const IP_MAX         = 10;              // max failures per IP
const IP_BLOCK_MS    = 15 * 60 * 1000; // block for 15 min

const EMAIL_WINDOW_MS = 60 * 60 * 1000; // 1-hour window
const EMAIL_MAX       = 10;             // max failures per email
const EMAIL_BLOCK_MS  = 30 * 60 * 1000; // block for 30 min

interface Entry {
  failures: number;
  windowStart: number;
  blockedUntil: number | null;
}

const store = new Map<string, Entry>();

function prune() {
  const now = Date.now();
  for (const [key, e] of store.entries()) {
    const unblocked = !e.blockedUntil || now > e.blockedUntil;
    const windowExpired = now - e.windowStart > Math.max(IP_WINDOW_MS, EMAIL_WINDOW_MS);
    if (unblocked && windowExpired) store.delete(key);
  }
}

export interface RateLimitResult {
  blocked: boolean;
  retryAfterSecs: number;
  remaining: number;
}

function check(key: string, maxFailures: number, windowMs: number, blockMs: number): RateLimitResult {
  const now = Date.now();
  if (store.size > 20_000) prune();

  const entry = store.get(key);

  if (!entry) {
    return { blocked: false, retryAfterSecs: 0, remaining: maxFailures };
  }

  // Hard-blocked
  if (entry.blockedUntil && now < entry.blockedUntil) {
    return {
      blocked: true,
      retryAfterSecs: Math.ceil((entry.blockedUntil - now) / 1000),
      remaining: 0,
    };
  }

  // Window expired → treat as fresh
  if (now - entry.windowStart > windowMs) {
    return { blocked: false, retryAfterSecs: 0, remaining: maxFailures };
  }

  const remaining = Math.max(0, maxFailures - entry.failures);
  return { blocked: false, retryAfterSecs: 0, remaining };
}

function record(key: string, maxFailures: number, windowMs: number, blockMs: number) {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now - entry.windowStart > windowMs) {
    store.set(key, { failures: 1, windowStart: now, blockedUntil: null });
    return;
  }

  // Already hard-blocked — don't touch
  if (entry.blockedUntil && now < entry.blockedUntil) return;

  entry.failures += 1;
  if (entry.failures >= maxFailures) {
    entry.blockedUntil = now + blockMs;
  }
  store.set(key, entry);
}

// ─── Public API ───────────────────────────────────────────────────────────────

/** Check if the IP is rate-limited (does NOT increment the counter). */
export function checkIp(ip: string): RateLimitResult {
  return check(`ip:${ip}`, IP_MAX, IP_WINDOW_MS, IP_BLOCK_MS);
}

/** Check if the email is rate-limited (does NOT increment the counter). */
export function checkEmail(email: string): RateLimitResult {
  return check(`email:${email}`, EMAIL_MAX, EMAIL_WINDOW_MS, EMAIL_BLOCK_MS);
}

/** Record a failed attempt for this IP. Call after a failed auth check. */
export function recordIpFailure(ip: string) {
  record(`ip:${ip}`, IP_MAX, IP_WINDOW_MS, IP_BLOCK_MS);
}

/** Record a failed attempt for this email. Call after a failed auth check. */
export function recordEmailFailure(email: string) {
  record(`email:${email}`, EMAIL_MAX, EMAIL_WINDOW_MS, EMAIL_BLOCK_MS);
}

/** Clear all rate-limit state for this IP + email on successful login. */
export function resetOnSuccess(ip: string, email: string) {
  store.delete(`ip:${ip}`);
  store.delete(`email:${email}`);
}

/** Extract client IP from a Next.js request. */
export function getIp(req: Request): string {
  const xff = (req as any).headers?.get?.('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  const xri = (req as any).headers?.get?.('x-real-ip');
  if (xri) return xri.trim();
  return '127.0.0.1';
}

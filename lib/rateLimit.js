// Simple protection against password guessing:
// too many wrong attempts => blocked for 15 minutes.
// NOTE: this lives in the server's memory. It is fine while you build, but it
// resets when the server restarts. Before selling, move it to a shared store (e.g. Upstash Redis).
const buckets = new Map(); // key -> { count, resetAt }
const WINDOW_MS = 15 * 60 * 1000;

// Returns 0 if allowed, or the number of seconds to wait if blocked.
export function retryAfterSeconds(key, max) {
  const b = buckets.get(key);
  if (!b) return 0;
  const now = Date.now();
  if (now > b.resetAt) {
    buckets.delete(key);
    return 0;
  }
  return b.count >= max ? Math.ceil((b.resetAt - now) / 1000) : 0;
}

export function recordFailure(key) {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || now > b.resetAt) buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
  else b.count += 1;

  if (buckets.size > 5000) {
    for (const [k, v] of buckets) if (now > v.resetAt) buckets.delete(k);
  }
}

export function clearFailures(key) {
  buckets.delete(key);
}

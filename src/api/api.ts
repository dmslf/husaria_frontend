// frontend/src/api/api.ts
export async function apiFetch<T = any>(path: string, opts: RequestInit = {}): Promise<T> {
  const base = ''; // jeżeli używasz BASE w valuation API, to tam dopisujemy (w valuations.ts)
  const res = await fetch(path.startsWith('http') || path.startsWith('/') ? path : base + path, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(opts.headers || {}),
    },
    ...opts,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API error ${res.status}: ${text}`);
  }
  return (await res.json()) as T;
}

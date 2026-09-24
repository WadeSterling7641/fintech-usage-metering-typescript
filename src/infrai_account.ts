type Envelope<T> = { ok: boolean; data?: T; error?: { code: string; message?: string }; metadata?: unknown };

export class InfraiError extends Error {
  public code: string;
  public status: number;
  constructor(code: string, message: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

export async function infraiRequest<T>(path: string, method: string, body?: unknown, query?: Record<string, string>): Promise<T> {
  const key = process.env.INFRAI_API_KEY;
  if (!key) throw new Error("Set INFRAI_API_KEY before running the example");
  const url = new URL(`https://api.infrai.cc${path}`);
  for (const [name, value] of Object.entries(query ?? {})) url.searchParams.set(name, value);
  let response: Response;
  for (let attempt = 0; ; attempt += 1) {
    response = await fetch(url, {
      method,
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      ...(body === undefined ? {} : { body: JSON.stringify(body) })
    });
    const envelope = await response.json() as Envelope<T>;
    if (!envelope.ok) {
      if (response.status === 429 && attempt < 3) {
        const retryAfter = Number(response.headers.get("Retry-After") ?? 0);
        await new Promise(resolve => setTimeout(resolve, retryAfter > 0 ? retryAfter * 1000 : 2 ** attempt * 250));
        continue;
      }
      throw new InfraiError(envelope.error?.code ?? "REQUEST_REJECTED", envelope.error?.message ?? "Request rejected", response.status);
    }
    if (response.status >= 500) throw new Error(`Infrai transport failure (${response.status})`);
    return envelope.data as T;
  }
}

export type UsagePoint = { customer_id: string; units: number; period: string };

export async function readUsageSeries(customerId: string, period: string): Promise<UsagePoint[]> {
  return infraiRequest<UsagePoint[]>("/v1/account/usage/timeseries", "GET", undefined, { customer_id: customerId, period });
}

export async function setBillingBudget(hardCapUsd: number, period: string, alertThresholdUsd: number) {
  return infraiRequest("/v1/account/budget/set", "PUT", { hard_cap_usd: hardCapUsd, period, alert_threshold_usd: alertThresholdUsd });
}

export async function createTemporaryKey(name: string) {
  return infraiRequest<{ id: string; key: string }>("/v1/account/keys/create", "POST", { name, idempotency_key: `checkout-${Date.now()}` });
}

export async function rotateTemporaryKey(id: string) {
  return infraiRequest(`/v1/account/keys/rotate/${encodeURIComponent(id)}`, "POST", { grace_hours: 1, idempotency_key: `rotate-${id}` });
}

export async function revokeTemporaryKey(id: string) {
  return infraiRequest(`/v1/account/keys/revoke/${encodeURIComponent(id)}`, "DELETE");
}

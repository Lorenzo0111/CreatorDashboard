const USER_AGENT = "creator-dashboard/0.1"

export async function request(url: string, init?: RequestInit): Promise<Response> {
  const response = await fetch(url, {
    ...init,
    headers: {
      Accept: "application/json",
      "User-Agent": USER_AGENT,
      ...init?.headers,
    },
  })

  if (!response.ok) {
    const body = await response.text().catch(() => "")
    throw new Error(`${response.status} ${response.statusText}${body ? `: ${describe(body)}` : ""}`)
  }

  return response
}

/** Pulls the human-readable part out of an error body, which most of these APIs send as JSON. */
function describe(body: string) {
  try {
    const parsed = JSON.parse(body)
    const message = parsed.message ?? parsed.description ?? parsed.errorMessage ?? parsed.error?.message ?? parsed.error
    if (typeof message === "string" && message) return message.slice(0, 200)
  } catch {
    // Not JSON: fall through to the raw text.
  }
  return body.slice(0, 200)
}

export async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await request(url, init)
  return response.json() as Promise<T>
}

export function sendJson<T>(url: string, method: string, body: unknown, headers?: HeadersInit): Promise<T> {
  return fetchJson<T>(url, {
    method,
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json", ...headers },
  })
}

export function asDate(value: unknown) {
  if (!value || typeof value !== "string") return undefined
  const date = new Date(value)
  return Number.isNaN(date.valueOf()) ? undefined : date
}

export function requireKey(key: string | undefined, message: string) {
  if (!key) throw new Error(message)
  return key
}

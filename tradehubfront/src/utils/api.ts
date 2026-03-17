import { getBaseUrl } from './url'

const BASE_URL = import.meta.env.VITE_API_URL || ''

function getCsrfToken(): string {
  return document.cookie
    .split('; ')
    .find(row => row.startsWith('csrf_token='))
    ?.split('=')[1] || 'Guest';
}

/** Extract a human-readable error message from a Frappe JSON error body. */
function extractFrappeError(raw: string): string {
  try {
    const body = JSON.parse(raw)
    if (body._server_messages) {
      const msgs = JSON.parse(body._server_messages)
      const first = typeof msgs[0] === 'string' ? JSON.parse(msgs[0]) : msgs[0]
      if (first.message) return first.message
    }
    if (body.message) return body.message
  } catch { /* not JSON or unexpected structure */ }
  return ''
}

export async function api<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'X-Frappe-CSRF-Token': getCsrfToken(),
      ...options.headers,
    },
  })

  if (res.status === 401 || res.status === 403) {
    window.location.href = `${getBaseUrl()}pages/auth/login.html`
    throw new Error('Unauthorized')
  }

  if (res.status === 429) {
    throw new Error('RATE_LIMIT')
  }

  if (!res.ok) {
    const raw = await res.text()
    const msg = extractFrappeError(raw)
    throw new Error(msg || `HTTP ${res.status}`)
  }

  return res.json()
}

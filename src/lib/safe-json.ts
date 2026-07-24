/**
 * Parse a fetch Response as JSON without throwing on empty or invalid bodies.
 * Every vendor/client page should use this instead of res.json() directly.
 */
export async function parseJsonResponse<T = Record<string, unknown>>(
  res: Response
): Promise<{ ok: boolean; status: number; data: T }> {
  const text = await res.text()
  if (!text.trim()) {
    return {
      ok: false,
      status: res.status,
      data: { error: 'Empty response from server' } as T,
    }
  }
  try {
    return { ok: res.ok, status: res.status, data: JSON.parse(text) as T }
  } catch {
    return {
      ok: false,
      status: res.status,
      data: { error: 'Invalid JSON response from server' } as T,
    }
  }
}

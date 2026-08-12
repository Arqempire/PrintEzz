/**
 * Safe fetch helper that handles non-200 responses and non-JSON (e.g. HTML 500 error pages)
 * preventing "Unexpected token 'I', 'Internal S'..." SyntaxError crashes.
 */
export async function safeFetchJson<T = any>(
  url: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(url, options);

  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    const text = await res.text();
    throw new Error(
      `Server returned non-JSON response (${res.status}): ${text.substring(0, 100)}...`
    );
  }

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || `HTTP error ${res.status}`);
  }

  return data as T;
}

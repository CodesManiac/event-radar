/**
 * Minimal HTTP plumbing shared by provider adapters.
 *
 * Providers are called from server code only. Errors are typed so the service
 * layer can distinguish rate limiting from general failures, and raw upstream
 * details never reach the client.
 */

export class ProviderHttpError extends Error {
  constructor(
    readonly source: string,
    readonly status: number,
  ) {
    super(`${source} responded with HTTP ${status}`);
    this.name = "ProviderHttpError";
  }
}

export class ProviderNetworkError extends Error {
  constructor(source: string, options?: { cause?: unknown }) {
    super(`${source} request failed`, options);
    this.name = "ProviderNetworkError";
  }
}

export class ProviderResponseError extends Error {
  constructor(source: string, detail: string) {
    super(`${source} returned an unexpected payload: ${detail}`);
    this.name = "ProviderResponseError";
  }
}

export function isRateLimitError(error: unknown): boolean {
  return error instanceof ProviderHttpError && error.status === 429;
}

interface FetchOptions {
  /** Cache TTL in seconds, honoring the provider's documented cache window. */
  revalidateSeconds: number;
}

export async function fetchJson<T>(source: string, url: string, options: FetchOptions): Promise<T> {
  let response: Response;

  try {
    response = await fetch(url, {
      headers: { accept: "application/json" },
      next: { revalidate: options.revalidateSeconds },
      signal: AbortSignal.timeout(10_000),
    });
  } catch (cause) {
    throw new ProviderNetworkError(source, { cause });
  }

  if (response.status === 429) {
    throw new ProviderHttpError(source, 429);
  }
  if (!response.ok) {
    throw new ProviderHttpError(source, response.status);
  }

  try {
    return (await response.json()) as T;
  } catch {
    throw new ProviderResponseError(source, "response was not valid JSON");
  }
}

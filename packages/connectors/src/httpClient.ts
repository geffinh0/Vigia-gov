/**
 * Cliente HTTP simples com timeout e novas tentativas, usado por todos os
 * conectores para chamar APIs públicas oficiais. Mantido deliberadamente
 * mínimo (sem dependências externas de HTTP) para reduzir superfície de
 * manutenção — troque por undici/axios se o projeto crescer.
 */

export interface FetchJsonOptions {
  timeoutMs?: number;
  retries?: number;
  headers?: Record<string, string>;
}

export class HttpError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly url: string,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

async function withTimeout<T>(ms: number, fn: (signal: AbortSignal) => Promise<T>): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fn(controller.signal);
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchJson<T>(url: string, opts: FetchJsonOptions = {}): Promise<T> {
  const { timeoutMs = 20_000, retries = 2, headers = {} } = opts;
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await withTimeout(timeoutMs, async (signal) => {
        const res = await fetch(url, {
          signal,
          headers: { Accept: "application/json", ...headers },
        });
        if (!res.ok) {
          throw new HttpError(`GET ${url} -> ${res.status}`, res.status, url);
        }
        return (await res.json()) as T;
      });
    } catch (err) {
      lastError = err;
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, 500 * 2 ** attempt));
      }
    }
  }
  throw lastError;
}

export async function fetchBuffer(url: string, opts: FetchJsonOptions = {}): Promise<Buffer> {
  const { timeoutMs = 60_000, retries = 2, headers = {} } = opts;
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await withTimeout(timeoutMs, async (signal) => {
        const res = await fetch(url, { signal, headers });
        if (!res.ok) {
          throw new HttpError(`GET ${url} -> ${res.status}`, res.status, url);
        }
        const arrayBuffer = await res.arrayBuffer();
        return Buffer.from(arrayBuffer);
      });
    } catch (err) {
      lastError = err;
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, 500 * 2 ** attempt));
      }
    }
  }
  throw lastError;
}

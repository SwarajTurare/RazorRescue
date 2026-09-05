const API_BASE = (
  import.meta.env.VITE_API_BASE_URL ||
  'http://localhost:4000/api'
).replace(/\/$/, '');

async function request(
  path,
  options = {}
) {
  const controller =
    new AbortController();

  const timeout = setTimeout(
    () =>
      controller.abort(),
    options.timeoutMs ||
      30000
  );

  try {
    const {
      timeoutMs,
      ...fetchOptions
    } = options;

    const response =
      await fetch(
        `${API_BASE}${path}`,
        {
          headers: {
            'Content-Type':
              'application/json',
            ...(fetchOptions.headers ||
              {}),
          },
          ...fetchOptions,
          signal:
            controller.signal,
        }
      );

    if (!response.ok) {
      let payload = {};

      try {
        payload =
          await response.json();
      } catch {
        // ignore
      }

      throw new Error(
        payload.message ||
          payload.detail ||
          `Request failed (${response.status})`
      );
    }

    const type =
      response.headers.get(
        'content-type'
      ) || '';

    if (
      type.includes(
        'application/pdf'
      )
    ) {
      return response.blob();
    }

    return response.json();
  } catch (error) {
    if (
      error?.name ===
      'AbortError'
    ) {
      throw new Error(
        'Backend request timed out. Check that the Node API is running on port 4000.'
      );
    }

    if (
      error instanceof TypeError
    ) {
      throw new Error(
        'Cannot reach the RazorRescue backend. Start Node.js API on http://localhost:4000.'
      );
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export const api = {
  health: () =>
    request('/health'),

  dashboard: () =>
    request(
      '/dashboard/metrics'
    ),

  transactions: (
    q = ''
  ) =>
    request(
      `/transactions${
        q
          ? `?q=${encodeURIComponent(
              q
            )}`
          : ''
      }`
    ),

  transaction: (id) =>
    request(
      `/transactions/${encodeURIComponent(
        id
      )}`
    ),

  triage: (body) =>
    request(
      '/recovery/triage',
      {
        method: 'POST',
        body: JSON.stringify(
          body
        ),
        timeoutMs: 60000,
      }
    ),

  communication: (body) =>
    request(
      '/recovery/communication',
      {
        method: 'POST',
        body: JSON.stringify(
          body
        ),
        timeoutMs: 60000,
      }
    ),

  batch: (body) =>
    request(
      '/recovery/batch',
      {
        method: 'POST',
        body: JSON.stringify(
          body
        ),
        timeoutMs: 120000,
      }
    ),

  monteCarlo: () =>
    request(
      '/analytics/monte-carlo',
      {
        method: 'POST',
        body: JSON.stringify(
          {}
        ),
      }
    ),

  benchmark: (
    includeHitl
  ) =>
    request(
      '/analytics/benchmark',
      {
        method: 'POST',
        body: JSON.stringify({
          includeHitl,
        }),
      }
    ),

  analyzePtp: (
    body
  ) =>
    request(
      '/ptp/analyze',
      {
        method: 'POST',
        body: JSON.stringify(
          body
        ),
      }
    ),

  ptpEvents: () =>
    request(
      '/ptp/events'
    ),

  compliance: (
    body
  ) =>
    request(
      '/compliance/evaluate',
      {
        method: 'POST',
        body: JSON.stringify(
          body
        ),
      }
    ),

  suppress: (
    body
  ) =>
    request(
      '/compliance/suppress',
      {
        method: 'POST',
        body: JSON.stringify(
          body
        ),
      }
    ),

  suppressionList: () =>
    request(
      '/compliance/suppression-list'
    ),

  audit: () =>
    request('/audit'),

  auditQuery: (
    sql
  ) =>
    request(
      '/audit/query',
      {
        method: 'POST',
        body: JSON.stringify({
          sql,
        }),
      }
    ),

  report: () =>
    request(
      '/audit/report',
      {
        method: 'POST',
        body: JSON.stringify(
          {}
        ),
        timeoutMs: 30000,
      }
    ),

  voice: (body) =>
    request(
      '/voice/synthesize',
      {
        method: 'POST',
        body: JSON.stringify(
          body
        ),
        timeoutMs: 60000,
      }
    ),

  roi: (body) =>
    request(
      '/roi/calculate',
      {
        method: 'POST',
        body: JSON.stringify(
          body
        ),
      }
    ),
};
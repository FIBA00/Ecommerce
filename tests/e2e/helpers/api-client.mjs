// tests/e2e/helpers/api-client.mjs
import assert from 'node:assert/strict';
import { API_BASE_URL, DEFAULT_TIMEOUT_MS } from './env.mjs';

// Factory for isolated API client instances
export function createApiClient(options = {}) {
  const baseUrl = (options.baseUrl || API_BASE_URL).replace(/\/+$/, '');
  let authToken = options.token || null;
  const timeoutMs = options.timeout || DEFAULT_TIMEOUT_MS;

  function setToken(token) {
    authToken = token;
  }

  function getToken() {
    return authToken;
  }

  async function request(path, reqOptions = {}) {
    const url = path.startsWith('http') ? path : `${baseUrl}/${path.replace(/^\/+/, '')}`;
    const headers = {
      Accept: 'application/json',
      ...reqOptions.headers,
    };

    const token = reqOptions.token !== undefined ? reqOptions.token : authToken;
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    let body = reqOptions.body;
    if (body !== undefined && typeof body === 'object') {
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify(body);
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), reqOptions.timeout || timeoutMs);

    try {
      const response = await fetch(url, {
        method: reqOptions.method || 'GET',
        headers,
        body,
        signal: controller.signal,
      });

      const contentType = response.headers.get('content-type') || '';
      let data = null;
      let raw = null;

      if (contentType.includes('application/json')) {
        try {
          data = await response.json();
        } catch {
          data = null;
        }
      } else {
        raw = await response.text();
        data = raw;
      }

      return {
        status: response.status,
        ok: response.ok,
        headers: response.headers,
        data,
        raw,
      };
    } finally {
      clearTimeout(timer);
    }
  }

  return {
    setToken,
    getToken,
    request,
    get: (path, opt = {}) => request(path, { ...opt, method: 'GET' }),
    post: (path, body, opt = {}) => request(path, { ...opt, method: 'POST', body }),
    patch: (path, body, opt = {}) => request(path, { ...opt, method: 'PATCH', body }),
    put: (path, body, opt = {}) => request(path, { ...opt, method: 'PUT', body }),
    delete: (path, opt = {}) => request(path, { ...opt, method: 'DELETE' }),
  };
}

// Default singleton client
export const api = createApiClient();

// Assert exact response status with helpful diagnostic output
export function expectStatus(res, expectedStatus, message = '') {
  if (res.status !== expectedStatus) {
    const detail = res.data ? JSON.stringify(res.data) : (res.raw || 'no body');
    const msg = message ? `${message} - ` : '';
    assert.strictEqual(
      res.status,
      expectedStatus,
      `${msg}Expected status ${expectedStatus} but got ${res.status}. Response: ${detail}`
    );
  }
}

// Assert response body satisfies predicate or matches property subsets
export function expectBody(res, predicateOrSubset, message = '') {
  assert.notStrictEqual(res.data, null, `${message} - Response data is null`);
  if (typeof predicateOrSubset === 'function') {
    const pass = predicateOrSubset(res.data);
    assert.ok(pass, message || `Response body failed predicate test: ${JSON.stringify(res.data)}`);
  } else if (typeof predicateOrSubset === 'object') {
    for (const [key, expectedVal] of Object.entries(predicateOrSubset)) {
      assert.strictEqual(
        res.data[key],
        expectedVal,
        `${message} - Property "${key}" expected "${expectedVal}" but got "${res.data?.[key]}"`
      );
    }
  } else {
    assert.strictEqual(res.data, predicateOrSubset, message);
  }
}

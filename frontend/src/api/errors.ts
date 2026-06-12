export function formatApiError(error: unknown, fallback = 'Request failed') {
  if (typeof error === 'string' && error.trim()) {
    return error;
  }

  if (error && typeof error === 'object') {
    const maybeError = error as { code?: unknown; message?: unknown };
    const message = typeof maybeError.message === 'string' ? maybeError.message : '';
    const code = typeof maybeError.code === 'string' ? maybeError.code : '';

    if (code && message) {
      return `${code}: ${message}`;
    }

    if (message) {
      return message;
    }
  }

  return fallback;
}

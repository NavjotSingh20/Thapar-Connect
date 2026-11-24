/**
 * Resolves image URLs for marketplace listings and user avatars.
 * - Leaves absolute URLs (http, https, blob, data) untouched.
 * - Converts relative paths (e.g. /api/v1/storage/...) to absolute URLs pointing to the backend.
 */
export function getFullImageUrl(url?: string | null): string {
  if (!url) return '';
  if (
    url.startsWith('http://') ||
    url.startsWith('https://') ||
    url.startsWith('blob:') ||
    url.startsWith('data:')
  ) {
    return url;
  }

  const apiBase = import.meta.env.VITE_API_BASE_URL;
  if (apiBase && apiBase.startsWith('http')) {
    try {
      const origin = new URL(apiBase).origin;
      return `${origin}${url.startsWith('/') ? url : `/${url}`}`;
    } catch {
      // Ignore and proceed to fallback
    }
  }

  if (typeof window !== 'undefined' && window.location.hostname.includes('vercel.app')) {
    return `https://thapar-connect-backend.onrender.com${url.startsWith('/') ? url : `/${url}`}`;
  }

  return url;
}

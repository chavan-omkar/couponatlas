const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

async function apiFetch(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    next: { revalidate: 300 }, // ISR: revalidate every 5 minutes
    ...options,
  });
  if (!res.ok) throw new Error(`API error ${res.status}: ${path}`);
  return res.json();
}

export async function getCoupons(params = {}) {
  const qs = new URLSearchParams(
    Object.fromEntries(Object.entries(params).filter(([, v]) => v != null))
  ).toString();
  return apiFetch(`/api/coupons${qs ? `?${qs}` : ''}`);
}

export async function getCoupon(id) {
  return apiFetch(`/api/coupons/${id}`);
}

export async function getMerchants() {
  return apiFetch('/api/merchants');
}

export async function getMerchant(slug) {
  return apiFetch(`/api/merchants/${slug}`);
}

export async function getCategories() {
  return apiFetch('/api/merchants/categories/all');
}

export async function trackClick(couponId) {
  return fetch(`${API_BASE}/api/coupons/${couponId}/click`, { method: 'POST' });
}

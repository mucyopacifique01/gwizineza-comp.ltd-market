const KEY = 'gwizineza-cart-id';

function createCartId() {
  const bytes = new Uint8Array(12);
  window.crypto.getRandomValues(bytes);
  return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
}

/** Same storage key and 24-hex ObjectId format as the previous storefront, so existing carts survive. */
export function getCartId() {
  const existing = window.localStorage.getItem(KEY);
  if (existing && /^[a-f0-9]{24}$/i.test(existing)) return existing;
  const id = createCartId();
  window.localStorage.setItem(KEY, id);
  return id;
}

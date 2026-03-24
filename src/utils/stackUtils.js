/**
 * Guru Master — Stack (LIFO) utilities
 * All lists are stored newest-first (index 0 = latest).
 * Max size = 6. The 7th oldest item is auto-removed.
 */

export const MAX_STACK = 6;

/**
 * Push a new item to the top of a LIFO stack (localStorage key).
 * If the stack exceeds MAX_STACK after push, the oldest (last) item is removed.
 * @param {string} key - localStorage key
 * @param {object} item - item to push to the top
 * @returns {array} new stack array
 */
export function stackPush(key, item) {
  const current = JSON.parse(localStorage.getItem(key) || '[]');
  // Avoid duplicates: remove existing item with same ID if it exists
  const filtered = current.filter(existing => existing.id !== item.id);
  const next = [item, ...filtered].slice(0, MAX_STACK);
  localStorage.setItem(key, JSON.stringify(next));
  return next;
}

/**
 * Read the current stack for a given key.
 */
export function stackRead(key) {
  return JSON.parse(localStorage.getItem(key) || '[]');
}

/**
 * Remove an item by id from a stack.
 */
export function stackRemove(key, id) {
  const current = JSON.parse(localStorage.getItem(key) || '[]');
  const next = current.filter(item => item.id !== id);
  localStorage.setItem(key, JSON.stringify(next));
  return next;
}

/**
 * Replace the entire stack (write) — enforces max.
 */
export function stackWrite(key, items) {
  const next = items.slice(0, MAX_STACK);
  localStorage.setItem(key, JSON.stringify(next));
  return next;
}

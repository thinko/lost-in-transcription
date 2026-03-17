/**
 * i18n helper — resolves data-i18n attributes in HTML and provides t() shorthand.
 *
 * Usage in HTML:
 *   <span data-i18n="key_name"></span>           → sets textContent
 *   <input data-i18n-placeholder="key_name">     → sets placeholder
 *   <button data-i18n-title="key_name">          → sets title
 *
 * Usage in JS:
 *   t('key_name')                                → chrome.i18n.getMessage('key_name')
 *   t('status_models_loaded', ['42'])             → substitution
 */

function t(key, substitutions) {
  return chrome.i18n.getMessage(key, substitutions) || key;
}

function applyI18n(root) {
  const base = root || document;

  base.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n');
    if (key) el.textContent = t(key);
  });

  base.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
    const key = el.getAttribute('data-i18n-placeholder');
    if (key) el.placeholder = t(key);
  });

  base.querySelectorAll('[data-i18n-title]').forEach((el) => {
    const key = el.getAttribute('data-i18n-title');
    if (key) el.title = t(key);
  });

  base.querySelectorAll('[data-i18n-html]').forEach((el) => {
    const key = el.getAttribute('data-i18n-html');
    if (key) el.innerHTML = t(key);
  });
}

if (typeof window !== 'undefined') {
  window.t = t;
  window.applyI18n = applyI18n;
}

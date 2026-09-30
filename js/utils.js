import { LOCALE, CURRENCY, CURRENCY_DECIMALS } from './config.js';
const moneyFormatter = new Intl.NumberFormat( LOCALE, {
  style: 'currency',
  currency: CURRENCY,
  minimumFractionDigits:
  CURRENCY_DECIMALS,
  maximumFractionDigits:
  CURRENCY_DECIMALS
});
const dateTimeFormatter = new Intl.DateTimeFormat(LOCALE, {
  dateStyle: 'short',
  timeStyle: 'short'
});
const dateFormatter = new Intl.DateTimeFormat(LOCALE, {
  dateStyle: 'short'
});
export function uid() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  } return `${
    Date.now().toString(36)
  }-${
    Math.random().toString(36).slice(2, 10)
  }`;
}
export function money(value) {
  const numericValue = Number(value);
  return moneyFormatter.format(
    Number.isFinite(numericValue) ? numericValue : 0
  );
}
export function dateTime(value) {
  const date = toValidDate(value);
  if (!date) {
    return 'Fecha no disponible';
  } return dateTimeFormatter.format(date);
}
export function dateOnly(value) {
  const date = toValidDate(value);
  if (!date) {
    return 'Fecha no disponible';
  } return dateFormatter.format(date);
}
export function localDateTimeValue(value = new Date()) {
  const date = toValidDate(value) || new Date();
  const timezoneOffset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - timezoneOffset * 60000);
  return localDate.toISOString().slice(0, 16);
}
export function escapeHtml(value) {
  const characters = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;'
  };
  return String(value ?? '').replace(/[&<>'"]/g, character => characters[character]);
}
export function cleanPhone(value) {
  let phone = String(value || '').replace(/\D/g, '');
  /* Convierte el prefijo internacional 00 en el formato utilizado por wa.me. Ejemplo: 00549223... → 549223... */
  if (phone.startsWith('00')) {
    phone = phone.slice(2);
  }
  /* Quitamos ceros iniciales. No agregamos automáticamente ningún país, porque Ctrl+C es una aplicación genérica. */
  phone = phone.replace(/^0+/, '');
  return phone;
}
export function normalizeText(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase(LOCALE).trim();
}
export function positiveNumber(value, fallback = 0) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return fallback;
  } return Math.max(0, number);
}
export function wholeNumber(value, fallback = 0) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return fallback;
  } return Math.round(number);
}
export function positiveWholeNumber(value, fallback = 0) {
  return Math.max(0, wholeNumber(value, fallback));
}
export function clamp(value, minimum, maximum) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return minimum;
  } return Math.max(minimum, Math.min(maximum, number));
}
export function plural(quantity, singular, pluralWord = `${singular}s`) {
  return Number(quantity) === 1 ? singular : pluralWord;
}
export function safeFileName(value, fallback = 'archivo') {
  const normalizedName = String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase(LOCALE)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return normalizedName || fallback;
}
export function isValidImageData(value) {
  return (typeof value === 'string' && value.startsWith('data:image/'));
}
export function toValidDate(value) {
  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  } return date;
}
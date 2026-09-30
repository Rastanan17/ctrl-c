import { STORAGE_KEY, DEFAULTS, DEFAULT_BRAND } from './config.js';
/* Los demás módulos reciben una referencia viva de esta variable mediante los imports de ES Modules. */
export let state = structuredClone(DEFAULTS);
export function initializeState() {
  state = loadState();
  return state;
}
export function loadState() {
  try {
    const storedText = localStorage.getItem(STORAGE_KEY);
    if (!storedText) { return structuredClone(DEFAULTS); }
    const storedData = JSON.parse(storedText);
    if (!isValidState(storedData)) {
      console.warn('Los datos guardados no tienen una estructura válida.');
      return structuredClone(DEFAULTS);
    } return migrateState(storedData);
  } catch (error) {
    console.warn('No se pudo leer el almacenamiento:', error);
    return structuredClone(DEFAULTS);
  }
}
export function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch (error) {
    console.error('No se pudieron guardar los datos:', error);
    return false;
  }
}
export function updateState(newState) {
  if (!isValidState(newState)) {
    throw new Error('El nuevo estado no tiene una estructura válida');
  }
  state = migrateState(structuredClone(newState));
  return state;
}
export function resetState() {
  state = structuredClone(DEFAULTS);
  return saveState();
}
export function getStateSnapshot() {
  return structuredClone(state);
}
export function clientById(clientId) {
  return state.clients.find(client => client.id === clientId);
}
export function productById(productId) {
  return state.products.find(product => product.id === productId);
}
export function deliveryById(deliveryId) {
  return state.deliveries.find(delivery => delivery.id === deliveryId);
}
function isValidState(data) {
  return Boolean(
    data && typeof data === 'object' &&
    Array.isArray(data.clients) &&
    Array.isArray(data.products) &&
    Array.isArray(data.deliveries)
  );
}
function migrateState(data) {
  const migratedState = {
    settings: normalizeSettings(data.settings),
    clients: data.clients.map(normalizeClient),
    products: data.products.map(normalizeProduct),
    deliveries: []
  };
  migratedState.deliveries = data.deliveries.map(delivery => {
    return normalizeDelivery(delivery, migratedState);
  });
  return migratedState;
}
function normalizeSettings(settings) {
  return { businessName: String(settings?.businessName || '').trim() };
}
function normalizeClient(client) {
  return {
    ...client,
    id: String(client?.id || ''),
    name: String(client?.name || '').trim(),
    contact: String(client?.contact || '').trim(),
    phone: String(client?.phone || '').replace(/\D/g, ''),
    address: String(client?.address || '').trim(),
    commission: limitCommission(client?.commission),
    notes: String(client?.notes || '').trim()
  };
}
function normalizeProduct(product) {
  const storedImage = String(product?.image || '');
  return {
    ...product,
    id: String(product?.id || ''),
    name: String(product?.name || '').trim(),
    presentation: String(product?.presentation || '').trim(),
    price: positiveNumber(product?.price),
    cost: positiveNumber(product?.cost),
    brand: String(product?.brand || DEFAULT_BRAND).trim() || DEFAULT_BRAND,
    /*
     * La versión genérica solamente acepta
     * imágenes cargadas por el usuario.
     * Las rutas antiguas como images/oreo.png
     * no se conservan.
     */
    image: storedImage.startsWith('data:image/') ? storedImage : ''
  };
}
function normalizeDelivery(delivery, migratedState) {
  const client = migratedState.clients.find(currentClient => {
    return currentClient.id === delivery?.clientId;
  });
  const items = Array.isArray(delivery?.items) ? delivery.items : [];
  const payments = Array.isArray(delivery?.payments) ? delivery.payments : [];
  return {
    ...delivery,
    id: String(delivery?.id || ''),
    clientId: String(delivery?.clientId || ''),
    date: validDateString(delivery?.date),
    createdAt: validDateString(delivery?.createdAt || delivery?.date),
    updatedAt: delivery?.updatedAt ? validDateString(delivery.updatedAt) : '',
    notes: String(delivery?.notes || '').trim(),
    commission: Number.isFinite(Number(delivery?.commission))
      ? limitCommission(delivery.commission)
      : limitCommission(client?.commission),
    items: items.map(item => normalizeDeliveryItem(item, migratedState)),
    payments: payments.map(normalizePayment)
  };
}
function normalizeDeliveryItem(item, migratedState) {
  const product = migratedState.products.find(currentProduct => {
    return currentProduct.id === item?.productId;
  });
  const quantity = Math.max(1, wholeNumber(item?.quantity, 1));
  const sold = Math.min(quantity, positiveWholeNumber(item?.sold));
  const maximumReturned = Math.max(0, quantity - sold);
  const returned = Math.min(maximumReturned, positiveWholeNumber(item?.returned));
  const normalizedItem = {
    ...item,
    productId: String(item?.productId || ''),
    name: String(item?.name || product?.name || 'Producto').trim(),
    presentation: String(item?.presentation || product?.presentation || '').trim(),
    price: positiveNumber(item?.price),
    cost: Number.isFinite(Number(item?.cost))
      ? positiveNumber(item.cost)
      : positiveNumber(product?.cost),
    brand: String(item?.brand || product?.brand || DEFAULT_BRAND).trim() || DEFAULT_BRAND,
    quantity,
    sold,
    returned
  };
  /*
   * No guardamos otra copia de la imagen
   * dentro de cada entrega.
   */
  delete normalizedItem.image;
  return normalizedItem;
}
function normalizePayment(payment) {
  return {
    ...payment,
    id: String(payment?.id || ''),
    amount: positiveNumber(payment?.amount),
    date: validDateString(payment?.date)
  };
}
function positiveNumber(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.max(0, number);
}
function positiveWholeNumber(value) {
  return Math.max(0, wholeNumber(value, 0));
}
function wholeNumber(value, fallback = 0) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.round(number);
}
function limitCommission(value) {
  const commission = Number(value);
  if (!Number.isFinite(commission)) return 0;
  return Math.max(0, Math.min(100, commission));
}
function validDateString(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) { return new Date().toISOString(); }
  return date.toISOString();
}
/* Configuración general de Ctrl+C */
export const APP_NAME = 'Ctrl+C - Control de Consignaciones';
export const APP_SHORT_NAME = 'Ctrl+C';
export const APP_VERSION = '1.0.0';
/* No cambiar esta clave en futuras actualizaciones. Si se cambia, el navegador no encontrará los datos que el usuario ya tenía guardados. */
export const STORAGE_KEY = 'ctrlCConsignaciones_v1';
export const BACKUP_TYPE = 'ctrl-c';
export const BACKUP_VERSION = 1;
/* Configuración regional y monetaria. */
export const LOCALE = 'es-AR';
export const CURRENCY = 'ARS';
export const CURRENCY_DECIMALS = 0;
/* Valores generales de productos y operaciones. */
export const DEFAULT_BRAND = 'General';
export const PRICE_STEP = 100;
export const PAYMENT_STEP = 100;
export const MINIMUM_QUANTITY = 1;
export const MAXIMUM_COMMISSION = 100;
/* Configuración para las imágenes cargadas por cada usuario. */
export const IMAGE_CONFIG = { maximumDimension: 720, quality: 0.76, mimeType: 'image/jpeg',
  /* Tamaño aproximado máximo del texto base64. Ayuda a no llenar localStorage demasiado rápido. */
  maximumDataLength: 420000
};
/* Títulos de las diferentes secciones. */
export const ROUTE_TITLES = { inicio: 'Mi reparto', clientes: 'Clientes', productos: 'Productos', entrega: 'Nueva entrega', historial: 'Historial' };
/* Estado inicial para una instalación nueva. La aplicación comienza vacía para que cada usuario cargue su propio emprendimiento, clientes y productos. */
export const DEFAULTS = { settings: { businessName: '' }, clients: [], products: [], deliveries: [] };
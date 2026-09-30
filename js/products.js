import { state, productById, saveState } from './state.js';
import { DEFAULT_BRAND, PRICE_STEP, IMAGE_CONFIG } from './config.js';
import { uid, escapeHtml } from './utils.js';
import { openModal, closeModal, render, toast } from './ui.js';
let productsInitialized = false;
export function initializeProducts() {
  if (productsInitialized) return;
  productsInitialized = true;
  document.addEventListener('click', handleProductButton);
}
function handleProductButton(event) {
  const newProductButton = event.target.closest('[data-action="new-product"]');
  if (newProductButton) { event.preventDefault(); openProductModal(); return; }
  const editProductButton = event.target.closest('[data-edit-product]');
  if (editProductButton) { event.preventDefault(); openProductModal(editProductButton.dataset.editProduct); }
}
export function openProductModal(productId = '') {
  const existingProduct = productId ? productById(productId) : null;
  if (productId && !existingProduct) { toast('No encontramos el producto'); return; }
  const product = existingProduct || {
    name: '',
    presentation: '',
    price: '',
    cost: '',
    brand: DEFAULT_BRAND,
    image: ''
  };
  let selectedImage = validStoredImage(product.image) ? product.image : '';
  let processingImage = false;
  const existingBrands = getExistingBrands();
  openModal(`
    <div class="modal-head">
      <h2>${productId ? 'Editar' : 'Nuevo'} producto</h2>
      <button type="button" class="close-modal" aria-label="Cerrar">×</button>
    </div>
    <form id="product-form">
      <div class="image-picker-preview">
        <img id="product-image-preview" src="${selectedImage || 'images/ctrl-icon.png'}" alt="Vista previa del producto">
      </div>
      <div class="field">
        <label for="product-image">Imagen del producto</label>
        <input id="product-image" name="imageFile" type="file" accept="image/png,image/jpeg,image/webp">
        <div class="muted small">La imagen se comprimirá y quedará guardada solamente en este dispositivo.</div>
      </div>
      <button type="button" class="button ghost full" id="remove-product-image" ${selectedImage ? '' : 'disabled'}>Quitar imagen</button>
      <div class="field">
        <label for="product-name">Producto</label>
        <input id="product-name" name="name" maxlength="100" required autocomplete="off" placeholder="Ej.: Budín de chocolate" value="${escapeHtml(product.name)}">
      </div>
      <div class="field">
        <label for="product-presentation">Presentación</label>
        <input id="product-presentation" name="presentation" maxlength="80" required autocomplete="off" placeholder="Ej.: 500 g o 10 unidades" value="${escapeHtml(product.presentation)}">
      </div>
      <div class="form-grid">
        <div class="field">
          <label for="product-price">Precio de venta</label>
          <input id="product-price" name="price" type="number" inputmode="decimal" min="0" step="${PRICE_STEP}" required value="${Number(product.price) || ''}">
        </div>
        <div class="field">
          <label for="product-cost">Costo por unidad</label>
          <input id="product-cost" name="cost" type="number" inputmode="decimal" min="0" step="${PRICE_STEP}" required value="${Number(product.cost) || 0}">
        </div>
      </div>
      <div class="field">
        <label for="product-brand">Marca o categoría</label>
        <input id="product-brand" name="brand" maxlength="60" required autocomplete="off" list="product-brand-list" placeholder="Ej.: Panificados" value="${escapeHtml(product.brand || DEFAULT_BRAND)}">
        <datalist id="product-brand-list">
          ${existingBrands.map(brand => `<option value="${escapeHtml(brand)}">`).join('')}
        </datalist>
        <div class="muted small">Podés escribir una marca nueva o elegir una que ya hayas utilizado.</div>
      </div>
      <button class="button dark full" type="submit" id="save-product-button">Guardar producto</button>
      ${productId ? `
        <div class="danger-zone">
          <button type="button" class="button danger full" id="delete-product">Eliminar producto</button>
        </div>
      ` : ''}
    </form>
  `);
  const form = document.querySelector('#product-form');
  const imageInput = document.querySelector('#product-image');
  const imagePreview = document.querySelector('#product-image-preview');
  const removeImageButton = document.querySelector('#remove-product-image');
  const saveButton = document.querySelector('#save-product-button');
  imageInput?.addEventListener('change', async event => {
    const [file] = event.target.files;
    if (!file) return;
    processingImage = true;
    if (saveButton) {
      saveButton.disabled = true;
      saveButton.textContent = 'Procesando imagen...';
    } try {
      selectedImage = await compressProductImage(file);
      if (imagePreview) { imagePreview.src = selectedImage; }
      if (removeImageButton) { removeImageButton.disabled = false; }
      toast('Imagen preparada');
    } catch (error) {
      console.error('No se pudo procesar la imagen:', error);
      event.target.value = '';
      toast(error.message || 'No se pudo procesar la imagen');
    } finally {
      processingImage = false;
      if (saveButton) {
        saveButton.disabled = false;
        saveButton.textContent = 'Guardar producto';
      }
    }
  });
  removeImageButton?.addEventListener('click', () => {
    selectedImage = '';
    if (imagePreview) { imagePreview.src = 'images/ctrl-icon.png'; }
    if (imageInput) { imageInput.value = ''; }
    removeImageButton.disabled = true;
    toast('Imagen quitada');
  });
  form?.addEventListener('submit', event => {
    event.preventDefault();
    if (processingImage) { toast('Esperá a que termine de procesarse la imagen'); return; }
    saveProduct(event.currentTarget, productId, selectedImage);
  });
  document.querySelector('#delete-product')?.addEventListener('click', () => deleteProduct(productId));
  window.setTimeout(() => {
    document.querySelector('#product-name')?.focus();
  }, 50);
}
function saveProduct(form, productId, selectedImage) {
  const formData = new FormData(form);
  const name = String(formData.get('name') || '').trim();
  const presentation = String(formData.get('presentation') || '').trim();
  const brand = String(formData.get('brand') || DEFAULT_BRAND).trim() || DEFAULT_BRAND;
  const price = Math.max(0, Number(formData.get('price')) || 0);
  const cost = Math.max(0, Number(formData.get('cost')) || 0);
  if (!name) { toast('Escribí el nombre del producto'); return; }
  if (!presentation) { toast('Escribí la presentación del producto'); return; }
  const productData = {
    id: productId || uid(),
    name,
    presentation,
    price,
    cost,
    brand,
    image: validStoredImage(selectedImage) ? selectedImage : ''
  };
  if (productId) {
    updateExistingProduct(productId, productData);
  } else {
    createProduct(productData);
  }
}
function createProduct(productData) {
  state.products.push(productData);
  if (!saveState()) {
    state.products = state.products.filter(product => product.id !== productData.id);
    toast('No hay espacio suficiente para guardar el producto');
    return;
  }
  closeModal();
  render();
  toast('Producto guardado');
}
function updateExistingProduct(productId, productData) {
  const product = productById(productId);
  if (!product) { toast('No encontramos el producto'); return; }
  const previousProduct = structuredClone(product);
  Object.assign(product, productData);
  if (!saveState()) {
    Object.assign(product, previousProduct);
    toast('No hay espacio suficiente para guardar los cambios');
    return;
  }
  closeModal();
  render();
  toast('Producto actualizado');
}
function deleteProduct(productId) {
  const product = productById(productId);
  if (!product) { toast('No encontramos el producto'); return; }
  const usedInDeliveries = state.deliveries.some(delivery => {
    return delivery.items.some(item => item.productId === productId);
  });
  if (usedInDeliveries) { toast('No se puede eliminar porque figura en entregas'); return; }
  const shouldDelete = window.confirm(`¿Eliminar ${product.name}?`);
  if (!shouldDelete) return;
  const previousProducts = structuredClone(state.products);
  state.products = state.products.filter(currentProduct => currentProduct.id !== productId);
  if (!saveState()) {
    state.products = previousProducts;
    toast('No se pudo eliminar el producto');
    return;
  }
  closeModal();
  render();
  toast('Producto eliminado');
}
function getExistingBrands() {
  const brands = new Set([DEFAULT_BRAND]);
  state.products.forEach(product => {
    const brand = String(product.brand || '').trim();
    if (brand) { brands.add(brand); }
  });
  return [...brands].sort((firstBrand, secondBrand) => {
    return firstBrand.localeCompare(secondBrand, 'es');
  });
}
function validStoredImage(image) {
  return typeof image === 'string' && image.startsWith('data:image/');
}
async function compressProductImage(file) {
  if (!file.type || !file.type.startsWith('image/')) {
    throw new Error('Seleccioná una imagen válida');
  }
  const originalImage = await readImageFile(file);
  let width = originalImage.naturalWidth;
  let height = originalImage.naturalHeight;
  if (!width || !height) {
    throw new Error('No pudimos leer las dimensiones de la imagen');
  }
  const maximumDimension = IMAGE_CONFIG.maximumDimension;
  const initialScale = Math.min(1, maximumDimension / Math.max(width, height));
  width = Math.max(1, Math.round(width * initialScale));
  height = Math.max(1, Math.round(height * initialScale));
  let quality = IMAGE_CONFIG.quality;
  let compressedImage = '';
  for (let attempt = 0; attempt < 8; attempt += 1) {
    compressedImage = drawCompressedImage(originalImage, width, height, quality);
    if (compressedImage.length <= IMAGE_CONFIG.maximumDataLength) {
      return compressedImage;
    } if (quality > 0.48) {
      quality = Math.max(0.48, quality - 0.08);
    } else {
      width = Math.max(240, Math.round(width * 0.85));
      height = Math.max(240, Math.round(height * 0.85));
    }
  } if (compressedImage.length > IMAGE_CONFIG.maximumDataLength) {
    throw new Error('La imagen sigue siendo demasiado pesada. Elegí una imagen más pequeña.');
  } return compressedImage;
}
function readImageFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener('load', () => {
      const image = new Image();
      image.addEventListener('load', () => resolve(image));
      image.addEventListener('error', () => { reject(new Error('No se pudo abrir la imagen')); });
      image.src = reader.result;
    });
    reader.addEventListener('error', () => { reject(new Error('No se pudo leer el archivo')); });
    reader.readAsDataURL(file);
  });
}
function drawCompressedImage(image, width, height, quality) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d', { alpha: false });
  if (!context) { throw new Error('El navegador no pudo procesar la imagen'); }
  /* Fondo blanco para las imágenes transparentes, ya que se guardarán como JPEG. */
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, width, height);
  context.drawImage(image, 0, 0, width, height);
  return canvas.toDataURL(IMAGE_CONFIG.mimeType, quality);
}
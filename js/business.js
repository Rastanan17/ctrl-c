import { state, saveState } from './state.js';
import { openModal, closeModal, toast } from './ui.js';
import { escapeHtml } from './utils.js';
export function initializeBusiness() {
  updateBusinessHeader();
  const editButton = document.querySelector('#business-edit-button');
  editButton?.addEventListener('click', openBusinessModal);
}
export function getBusinessName(fallback = 'Mi emprendimiento') {
  const name = String(state.settings?.businessName || '').trim();
  return name || fallback;
}
export function updateBusinessHeader() {
  const businessNameElement = document.querySelector('#business-name');
  const savedName = String(state.settings?.businessName || '').trim();
  if (businessNameElement) { businessNameElement.textContent = savedName || 'Mi emprendimiento'; }
  document.title = savedName ? `${savedName} · Ctrl+C` : 'Ctrl+C';
}
export function openBusinessModal() {
  const currentName = String(state.settings?.businessName || '').trim();
  openModal(`
    <div class="modal-head">
      <h2>Nombre del emprendimiento</h2>
      <button type="button" class="close-modal" aria-label="Cerrar">×</button>
    </div>
    <form id="business-form">
      <div class="field">
        <label for="business-name-input">Nombre que aparecerá en la aplicación</label>
        <input id="business-name-input" name="businessName" maxlength="60" required autocomplete="organization" placeholder="Ej.: Enrique Budines" value="${escapeHtml(currentName)}">
        <div class="muted small">Quedará guardado solamente en este dispositivo.</div>
      </div>
      <button class="button dark full" type="submit">Guardar nombre</button>
    </form>
  `);
  const form = document.querySelector('#business-form');
  form?.addEventListener('submit', saveBusinessName);
  window.setTimeout(() => {
    document.querySelector('#business-name-input') ?.focus();
  }, 50);
}
function saveBusinessName(event) {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);
  const newName = String(formData.get('businessName') || '').trim();
  if (!newName) { toast('Escribí el nombre del emprendimiento'); return; }
  const previousSettings = structuredClone(state.settings || { businessName: '' });
  state.settings ||= {};
  state.settings.businessName = newName;
  if (!saveState()) {
    state.settings = previousSettings;
    toast('No se pudo guardar el nombre del emprendimiento'); return;
  }
  updateBusinessHeader(); closeModal();
  toast('Nombre del emprendimiento guardado');
}
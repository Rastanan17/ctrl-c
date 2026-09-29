import { state, updateState, saveState } from './state.js';
import { openModal, closeModal, render, toast } from './ui.js';
export function initializeBackup() {
  const backupButton = document.querySelector('#backup-button');
  const importFile = document.querySelector('#import-file');
  backupButton?.addEventListener('click', openBackupModal);
  importFile?.addEventListener('change', handleImportFile);
}
function openBackupModal() {
  openModal(`
    <div class="modal-head">
      <h2>Respaldo de datos</h2>
      <button type="button" class="close-modal" aria-label="Cerrar">×</button>
    </div>
    <p class="muted">Los datos se guardan solamente en este dispositivo. Exportá una copia periódicamente para evitar perderlos.</p>
    <div class="backup-info">
      <p>La copia incluye:</p>
      <ul>
        <li>Nombre del emprendimiento</li>
        <li>Clientes</li>
        <li>Productos e imágenes</li>
        <li>Entregas y seguimientos</li>
        <li>Pagos registrados</li>
      </ul>
    </div>
    <div class="button-row">
      <button type="button" class="button dark full" id="export-backup">Exportar copia</button>
      <button type="button" class="button ghost full" id="import-backup">Importar copia</button>
    </div>
  `);
  document.querySelector('#export-backup') ?.addEventListener('click', exportBackup);
  document.querySelector('#import-backup') ?.addEventListener('click', selectBackupFile);
}
function selectBackupFile() {
  document.querySelector('#import-file') ?.click();
}
export function exportBackup() {
  try {
    const backup = { backupType: 'ctrl-c', backupVersion: 1, exportedAt: new Date().toISOString(),
      settings: structuredClone(state.settings),
      clients: structuredClone(state.clients),
      products: structuredClone(state.products),
      deliveries: structuredClone(state.deliveries)
    };
    const fileContent = JSON.stringify(backup, null, 2);
    const blob = new Blob([fileContent], { type: 'application/json' });
    const downloadUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl; link.download = createBackupFileName();
    document.body.appendChild(link); link.click(); link.remove();
    window.setTimeout(() => { URL.revokeObjectURL(downloadUrl); }, 1000);
    toast('Copia de respaldo exportada');
  } catch (error) {
    console.error('No se pudo exportar la copia:', error);
    toast('No se pudo exportar la copia');
  }
}
function createBackupFileName() {
  const date = new Date().toISOString().slice(0, 10);
  const businessName = String(state.settings?.businessName || 'ctrl-c')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `${ businessName || 'ctrl-c' }-respaldo-${date}.json`;
}
async function handleImportFile(event) {
  const [file] = event.target.files;
  // Permite seleccionar nuevamente el mismo archivo.
  event.target.value = '';
  if (!file) { return; }
  await importBackup(file);
}
export async function importBackup(file) {
  try {
    const fileContent = await file.text();
    const backup = JSON.parse(fileContent);
    if (!isValidBackup(backup)) { throw new Error('La estructura del respaldo no es válida'); }
    const shouldImport = window.confirm('Esta copia reemplazará todos los datos actuales de este dispositivo. ¿Querés continuar?');
    if (!shouldImport) { return; }
    const previousState = structuredClone(state);
    const importedState = { settings: { businessName: String(backup.settings?.businessName || '').trim() },
      clients: structuredClone(backup.clients),
      products: structuredClone(backup.products),
      deliveries: structuredClone(backup.deliveries)
    };
    updateState(importedState);
    if (!saveState()) { updateState(previousState); toast('No hay espacio suficiente para importar esta copia'); return; }
    closeModal(); render(); toast('Copia restaurada correctamente');
  } catch (error) { console.error('No se pudo importar la copia:', error);
    toast('El archivo seleccionado no es una copia válida');
  }
}
function isValidBackup(backup) {
  if (!backup || typeof backup !== 'object') { return false; }
  return (Array.isArray(backup.clients) && Array.isArray(backup.products) && Array.isArray(backup.deliveries));
}
import { state, clientById, saveState } from './state.js';
import { openModal, closeModal, render, toast } from './ui.js';
import { cleanPhone, escapeHtml } from './utils.js';
let clientsInitialized = false;
export function initializeClients() {
  if (clientsInitialized) { return; }
  clientsInitialized = true;
  document.addEventListener('click', handleClientButton);
}
function handleClientButton(event) {
  const newClientButton = event.target.closest('[data-action="new-client"]');
  if (newClientButton) { event.preventDefault(); openClientModal(); return; }
  const editClientButton = event.target.closest('[data-edit-client]');
  if (editClientButton) { event.preventDefault(); openClientModal(editClientButton.dataset.editClient); }
}
export function openClientModal(clientId = '') {
  const existingClient = clientId ? clientById(clientId) : null;
  if (clientId && !existingClient) { toast('No encontramos el cliente'); return; }
  const client = existingClient || { name: '', contact: '', phone: '', address: '', commission: 0, notes: '' };
  openModal(`
    <div class="modal-head">
      <h2>${clientId ? 'Editar' : 'Nuevo'} cliente</h2>
      <button
        type="button"
        class="close-modal"
        aria-label="Cerrar"
      >
        ×
      </button>
    </div>

    <form id="client-form">
      <div class="field">
        <label for="client-name">
          Nombre del negocio o cliente
        </label>

        <input
          id="client-name"
          name="name"
          maxlength="80"
          required
          autocomplete="organization"
          value="${escapeHtml(client.name)}"
        >
      </div>

      <div class="field">
        <label for="client-contact">
          Responsable
        </label>

        <input
          id="client-contact"
          name="contact"
          maxlength="80"
          autocomplete="name"
          value="${escapeHtml(client.contact)}"
        >
      </div>

      <div class="field">
        <label for="client-phone">
          WhatsApp
        </label>

        <input
          id="client-phone"
          name="phone"
          type="tel"
          inputmode="tel"
          autocomplete="tel"
          maxlength="25"
          placeholder="Ej.: 5492235674153"
          value="${escapeHtml(client.phone)}"
        >

        <div class="muted small">
          Escribilo con código de país y de área.
          Por ejemplo: 5492235674153.
        </div>
      </div>

      <div class="field">
        <label for="client-address">
          Dirección
        </label>

        <input
          id="client-address"
          name="address"
          maxlength="120"
          autocomplete="street-address"
          value="${escapeHtml(client.address)}"
        >
      </div>

      <div class="field">
        <label for="client-commission">
          Comisión del negocio (%)
        </label>

        <input
          id="client-commission"
          name="commission"
          type="number"
          inputmode="decimal"
          min="0"
          max="100"
          step="1"
          value="${Number(client.commission) || 0}"
        >

        <div class="muted small">
          La aplicación descontará este porcentaje
          de cada venta.
        </div>
      </div>

      <div class="field">
        <label for="client-notes">
          Notas
        </label>

        <textarea
          id="client-notes"
          name="notes"
          maxlength="500"
          placeholder="Información adicional del cliente"
        >${escapeHtml(client.notes)}</textarea>
      </div>

      <button
        class="button dark full"
        type="submit"
      >
        Guardar cliente
      </button>

      ${
        clientId
          ? `
            <div class="danger-zone">
              <button
                type="button"
                class="button danger full"
                id="delete-client"
              >
                Eliminar cliente
              </button>
            </div>
          `
          : ''
      }
    </form>
  `);

  const form = document.querySelector(
    '#client-form'
  );

  form?.addEventListener(
    'submit',
    event => saveClient(
      event,
      clientId
    )
  );

  document
    .querySelector('#delete-client')
    ?.addEventListener(
      'click',
      () => deleteClient(clientId)
    );

  window.setTimeout(() => {
    document
      .querySelector('#client-name')
      ?.focus();
  }, 50);
}

function saveClient(event, clientId) {
  event.preventDefault();

  const formData = new FormData(
    event.currentTarget
  );

  const name = String(
    formData.get('name') || ''
  ).trim();

  if (!name) {
    toast('Escribí el nombre del cliente');
    return;
  }

  const commission = Math.max(
    0,
    Math.min(
      100,
      Number(
        formData.get('commission')
      ) || 0
    )
  );

  const clientData = {
    id: clientId || createId(),

    name,

    contact: String(
      formData.get('contact') || ''
    ).trim(),

    phone: cleanPhone(
      formData.get('phone')
    ),

    address: String(
      formData.get('address') || ''
    ).trim(),

    commission,

    notes: String(
      formData.get('notes') || ''
    ).trim()
  };

  if (clientId) {
    updateExistingClient(
      clientId,
      clientData
    );
  } else {
    createClient(clientData);
  }
}

function createClient(clientData) {
  state.clients.push(clientData);

  if (!saveState()) {
    state.clients = state.clients.filter(
      client => client.id !== clientData.id
    );

    toast(
      'No se pudo guardar el cliente'
    );

    return;
  }

  closeModal();
  render();

  toast('Cliente guardado');
}

function updateExistingClient(
  clientId,
  clientData
) {
  const client = clientById(clientId);

  if (!client) {
    toast('No encontramos el cliente');
    return;
  }

  const previousClient = structuredClone(
    client
  );

  Object.assign(
    client,
    clientData
  );

  if (!saveState()) {
    Object.assign(
      client,
      previousClient
    );

    toast(
      'No se pudieron guardar los cambios'
    );

    return;
  }

  closeModal();
  render();

  toast('Cliente actualizado');
}

function deleteClient(clientId) {
  const client = clientById(clientId);

  if (!client) {
    toast('No encontramos el cliente');
    return;
  }

  const hasDeliveries = state.deliveries.some(
    delivery => delivery.clientId === clientId
  );

  if (hasDeliveries) {
    toast(
      'No se puede eliminar porque tiene entregas registradas'
    );

    return;
  }

  const shouldDelete = window.confirm(
    `¿Eliminar a ${client.name}?`
  );

  if (!shouldDelete) {
    return;
  }

  const previousClients = structuredClone(
    state.clients
  );

  state.clients = state.clients.filter(
    currentClient => {
      return currentClient.id !== clientId;
    }
  );

  if (!saveState()) {
    state.clients = previousClients;

    toast(
      'No se pudo eliminar el cliente'
    );

    return;
  }

  closeModal();
  render();

  toast('Cliente eliminado');
}

function createId() {
  return `${
    Date.now().toString(36)
  }-${
    Math.random()
      .toString(36)
      .slice(2, 8)
  }`;
}
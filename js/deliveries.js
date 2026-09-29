import {
  state,
  clientById,
  productById,
  saveState
} from './state.js';

import {
  PRICE_STEP,
  PAYMENT_STEP,
  DEFAULT_BRAND
} from './config.js';

import {
  deliveryTotal,
  soldTotal,
  commissionRate,
  commissionTotal,
  netSoldTotal,
  paidTotal,
  dueTotal,
  pendingUnits,
  statusOf
} from './calculations.js';

import {
  uid,
  money,
  dateTime,
  escapeHtml,
  localDateTimeValue
} from './utils.js';

import {
  openModal,
  closeModal,
  render,
  toast
} from './ui.js';

import {
  sendWhatsApp
} from './whatsapp.js';

let deliveriesInitialized = false;

export let deliveryDraft = createEmptyDraft();

function createEmptyDraft(clientId = '') {
  return {
    clientId,
    date: localDateTimeValue(),
    notes: '',
    items: []
  };
}

export function initializeDeliveries() {
  if (deliveriesInitialized) {
    return;
  }

  deliveriesInitialized = true;

  document.addEventListener(
    'click',
    handleDeliveryClick
  );

  document.addEventListener(
    'change',
    handleDeliveryChange
  );

  document.addEventListener(
    'input',
    handleDeliveryInput
  );

  document.addEventListener(
    'submit',
    handleDeliverySubmit
  );
}

function handleDeliveryClick(event) {
  const addLineButton = event.target.closest(
    '[data-action="add-line"]'
  );

  if (addLineButton) {
    event.preventDefault();
    addDraftLine();
    return;
  }

  const removeLineButton = event.target.closest(
    '.line-remove'
  );

  if (removeLineButton) {
    event.preventDefault();

    const line = removeLineButton.closest(
      '[data-line]'
    );

    if (!line) {
      return;
    }

    const index = Number(
      line.dataset.line
    );

    removeDraftLine(index);
    return;
  }

  const viewButton = event.target.closest(
    '[data-view-delivery]'
  );

  if (viewButton) {
    event.preventDefault();

    openDeliveryModal(
      viewButton.dataset.viewDelivery,
      'tracking'
    );

    return;
  }

  const whatsappButton = event.target.closest(
    '[data-whatsapp]'
  );

  if (whatsappButton) {
    event.preventDefault();

    sendWhatsApp(
      whatsappButton.dataset.whatsapp
    );

    return;
  }

  const deleteButton = event.target.closest(
    '[data-delete-delivery]'
  );

  if (deleteButton) {
    event.preventDefault();

    deleteDelivery(
      deleteButton.dataset.deleteDelivery
    );
  }
}

function handleDeliveryChange(event) {
  if (event.target.matches('#delivery-client')) {
    deliveryDraft.clientId =
      event.target.value;

    return;
  }

  if (event.target.matches('#delivery-date')) {
    deliveryDraft.date =
      event.target.value;

    return;
  }

  if (event.target.matches('.line-product')) {
    updateDraftProduct(event.target);
  }
}

function handleDeliveryInput(event) {
  if (event.target.matches('#delivery-notes')) {
    deliveryDraft.notes =
      event.target.value;

    return;
  }

  if (event.target.matches('.line-price')) {
    updateDraftPrice(event.target);
    return;
  }

  if (event.target.matches('.line-quantity')) {
    updateDraftQuantity(event.target);
  }
}

function handleDeliverySubmit(event) {
  if (event.target.matches('#delivery-form')) {
    saveDelivery(event);
    return;
  }

  if (event.target.matches('#tracking-form')) {
    saveTracking(event);
    return;
  }

  if (event.target.matches('#payment-form')) {
    savePayment(event);
  }
}

export function renderDeliveryForm() {
  if (!state.clients.length) {
    return `
      <div class="card empty">
        <div class="empty-icon">♙</div>

        <strong>
          Primero agregá un cliente
        </strong>

        <p class="small">
          Necesitamos el comercio y su WhatsApp
          para preparar el comprobante.
        </p>
      </div>

      <button
        type="button"
        class="button full"
        data-action="new-client"
      >
        Agregar cliente
      </button>
    `;
  }

  if (!state.products.length) {
    return `
      <div class="card empty">
        <div class="empty-icon">▣</div>

        <strong>
          Primero agregá un producto
        </strong>

        <p class="small">
          Después podrás elegir la cantidad y
          el precio para la entrega.
        </p>
      </div>

      <button
        type="button"
        class="button full"
        data-action="new-product"
      >
        Agregar producto
      </button>
    `;
  }

  const selectedClientExists = state.clients.some(
    client => client.id === deliveryDraft.clientId
  );

  if (!selectedClientExists) {
    deliveryDraft.clientId =
      state.clients[0].id;
  }

  return `
    <form id="delivery-form">
      <div class="card">
        <div class="field">
          <label for="delivery-client">
            Cliente
          </label>

          <select
            id="delivery-client"
            required
          >
            ${state.clients.map(client => `
              <option
                value="${client.id}"
                ${
                  client.id === deliveryDraft.clientId
                    ? 'selected'
                    : ''
                }
              >
                ${escapeHtml(client.name)}
                · comisión ${Number(client.commission) || 0}%
              </option>
            `).join('')}
          </select>
        </div>

        <div class="field">
          <label for="delivery-date">
            Fecha y hora
          </label>

          <input
            id="delivery-date"
            type="datetime-local"
            value="${escapeHtml(deliveryDraft.date)}"
            required
          >
        </div>
      </div>

      <div class="section-head">
        <div>
          <h2>Productos</h2>

          <p>
            Indicá los productos que dejás
          </p>
        </div>

        <button
          type="button"
          class="button ghost small-button"
          data-action="add-line"
        >
          ＋ Producto
        </button>
      </div>

      <div id="delivery-lines">
        ${
          deliveryDraft.items.length
            ? deliveryDraft.items
                .map(deliveryLine)
                .join('')
            : `
              <div class="card empty">
                <div class="empty-icon">＋</div>

                <strong>
                  Agregá productos
                </strong>

                <p class="small">
                  Podés incluir varios productos
                  en una misma entrega.
                </p>
              </div>
            `
        }
      </div>

      <div class="total-box">
        <span>
          Total de la entrega
        </span>

        <strong id="draft-total">
          ${money(draftTotal())}
        </strong>
      </div>

      <div class="field">
        <label for="delivery-notes">
          Observaciones (opcional)
        </label>

        <textarea
          id="delivery-notes"
          maxlength="500"
          placeholder="Ej.: dejar exhibido cerca de la caja"
        >${escapeHtml(deliveryDraft.notes)}</textarea>
      </div>

      <button
        class="button dark full"
        type="submit"
      >
        Guardar entrega
      </button>
    </form>
  `;
}

function deliveryLine(item, index) {
  const product = productById(
    item.productId
  );

  const image = product?.image || '';

  return `
    <div
      class="line-item"
      data-line="${index}"
    >
      <div class="line-product-head">
        ${renderProductImage(
          image,
          item.name,
          'line-thumb'
        )}

        <div class="field">
          <label>
            Producto
          </label>

          <select class="line-product">
            ${state.products.map(productOption => `
              <option
                value="${productOption.id}"
                ${
                  productOption.id === item.productId
                    ? 'selected'
                    : ''
                }
              >
                ${escapeHtml(productOption.name)}
                ·
                ${escapeHtml(productOption.presentation)}
              </option>
            `).join('')}
          </select>
        </div>
      </div>

      <div class="line-grid">
        <div class="field">
          <label>
            Precio unitario
          </label>

          <input
            class="line-price"
            type="number"
            min="0"
            step="${PRICE_STEP}"
            value="${Number(item.price) || 0}"
          >
        </div>

        <div class="field">
          <label>
            Cantidad
          </label>

          <input
            class="line-quantity"
            type="number"
            min="1"
            step="1"
            value="${Number(item.quantity) || 1}"
          >
        </div>
      </div>

      <div class="line-total">
        <button
          type="button"
          class="button danger small-button line-remove"
        >
          Quitar
        </button>

        <strong>
          ${money(
            Number(item.price) *
            Number(item.quantity)
          )}
        </strong>
      </div>
    </div>
  `;
}

function addDraftLine() {
  const product = state.products[0];

  if (!product) {
    toast('Primero agregá un producto');
    return;
  }

  deliveryDraft.items.push(
    createDraftItem(product)
  );

  render();
}

function createDraftItem(product) {
  return {
    productId: product.id,
    name: product.name,
    presentation: product.presentation,
    price: Number(product.price) || 0,
    cost: Number(product.cost) || 0,
    brand: product.brand || DEFAULT_BRAND,
    quantity: 1
  };
}

function removeDraftLine(index) {
  if (
    !Number.isInteger(index) ||
    !deliveryDraft.items[index]
  ) {
    return;
  }

  deliveryDraft.items.splice(
    index,
    1
  );

  render();
}

function updateDraftProduct(selectElement) {
  const line = selectElement.closest(
    '[data-line]'
  );

  if (!line) {
    return;
  }

  const index = Number(
    line.dataset.line
  );

  const product = productById(
    selectElement.value
  );

  if (!product || !deliveryDraft.items[index]) {
    return;
  }

  deliveryDraft.items[index] =
    createDraftItem(product);

  render();
}

function updateDraftPrice(inputElement) {
  const index = getLineIndex(
    inputElement
  );

  if (!deliveryDraft.items[index]) {
    return;
  }

  deliveryDraft.items[index].price =
    Math.max(
      0,
      Number(inputElement.value) || 0
    );

  updateDraftTotals();
}

function updateDraftQuantity(inputElement) {
  const index = getLineIndex(
    inputElement
  );

  if (!deliveryDraft.items[index]) {
    return;
  }

  deliveryDraft.items[index].quantity =
    Math.max(
      1,
      Number(inputElement.value) || 1
    );

  updateDraftTotals();
}

function getLineIndex(element) {
  const line = element.closest(
    '[data-line]'
  );

  return line
    ? Number(line.dataset.line)
    : -1;
}

export function draftTotal() {
  return deliveryDraft.items.reduce(
    (total, item) => {
      return total +
        Number(item.price) *
        Number(item.quantity);
    },
    0
  );
}

function updateDraftTotals() {
  document
    .querySelectorAll('.line-item[data-line]')
    .forEach(element => {
      const index = Number(
        element.dataset.line
      );

      const item =
        deliveryDraft.items[index];

      const totalElement =
        element.querySelector(
          '.line-total strong'
        );

      if (item && totalElement) {
        totalElement.textContent = money(
          Number(item.price) *
          Number(item.quantity)
        );
      }
    });

  const draftTotalElement =
    document.querySelector('#draft-total');

  if (draftTotalElement) {
    draftTotalElement.textContent = money(
      draftTotal()
    );
  }
}

function saveDelivery(event) {
  event.preventDefault();

  if (!deliveryDraft.clientId) {
    toast('Seleccioná un cliente');
    return;
  }

  if (!deliveryDraft.items.length) {
    toast('Agregá al menos un producto');
    return;
  }

  const selectedClient = clientById(
    deliveryDraft.clientId
  );

  if (!selectedClient) {
    toast('No encontramos el cliente');
    return;
  }

  const selectedDate = new Date(
    deliveryDraft.date
  );

  if (
    Number.isNaN(
      selectedDate.getTime()
    )
  ) {
    toast('La fecha de entrega no es válida');
    return;
  }

  const delivery = {
    id: uid(),
    clientId: deliveryDraft.clientId,
    date: selectedDate.toISOString(),
    createdAt: new Date().toISOString(),
    notes: deliveryDraft.notes.trim(),

    commission:
      Number(selectedClient.commission) || 0,

    items: deliveryDraft.items.map(item => ({
      productId: item.productId,
      name: item.name,
      presentation: item.presentation,
      price: Number(item.price) || 0,
      cost: Number(item.cost) || 0,
      brand: item.brand || DEFAULT_BRAND,
      quantity: Math.max(
        1,
        Number(item.quantity) || 1
      ),
      sold: 0,
      returned: 0
    })),

    payments: []
  };

  state.deliveries.push(delivery);

  if (!saveState()) {
    state.deliveries.pop();

    toast(
      'No se pudo guardar la entrega'
    );

    return;
  }

  deliveryDraft = createEmptyDraft(
    delivery.clientId
  );

  render();

  /*
   * Recién creada:
   * mostramos solamente el comprobante.
   */
  openDeliveryModal(
    delivery.id,
    'receipt'
  );

  toast('Entrega guardada');
}

export function deliveryCard(delivery) {
  const client = clientById(
    delivery.clientId
  );

  const status = statusOf(delivery);
  const netSold = netSoldTotal(delivery);
  const paid = paidTotal(delivery);

  const paymentPercent = netSold > 0
    ? Math.min(
        100,
        Math.round(
          paid / netSold * 100
        )
      )
    : 0;

  const brands = [
    ...new Set(
      delivery.items.map(
        item => item.brand || DEFAULT_BRAND
      )
    )
  ];

  return `
    <article class="card">
      <div class="card-row">
        <div>
          <div class="card-title">
            ${escapeHtml(
              client?.name || 'Cliente eliminado'
            )}
          </div>

          <div class="muted small">
            ${dateTime(delivery.date)}
            ·
            ${delivery.items.length}
            producto${
              delivery.items.length === 1
                ? ''
                : 's'
            }
          </div>
        </div>

        <span class="status ${status.toLowerCase()}">
          ${status}
        </span>
      </div>

      <div class="progress">
        <span
          style="width:${paymentPercent}%"
        ></span>
      </div>

      <div class="brand-tags">
        ${brands.map(brand => `
          <span class="brand-tag">
            ${escapeHtml(brand)}
          </span>
        `).join('')}
      </div>

      <div class="card-row small">
        <span>
          ${pendingUnits(delivery)}
          unidades pendientes
          · comisión
          ${commissionRate(delivery)}%
        </span>

        <strong>
          ${money(dueTotal(delivery))}
          por cobrar
        </strong>
      </div>

      <div class="button-row">
        <button
          type="button"
          class="button ghost small-button"
          data-view-delivery="${delivery.id}"
        >
          Ver seguimiento
        </button>

        <button
          type="button"
          class="button green small-button"
          data-whatsapp="${delivery.id}"
        >
          WhatsApp
        </button>
      </div>
    </article>
  `;
}

export function openDeliveryModal(
  deliveryId,
  mode = 'tracking'
) {
  const delivery = state.deliveries.find(
    currentDelivery => {
      return currentDelivery.id === deliveryId;
    }
  );

  if (!delivery) {
    toast('No encontramos la entrega');
    return;
  }

  if (mode === 'receipt') {
    openReceiptModal(delivery);
    return;
  }

  openTrackingModal(delivery);
}

function openReceiptModal(delivery) {
  const status = statusOf(delivery);

  openModal(`
    <div class="modal-head">
      <div>
        <h2>Entrega guardada</h2>

        <span class="status ${status.toLowerCase()}">
          ${status}
        </span>
      </div>

      <button
        type="button"
        class="close-modal"
        aria-label="Cerrar"
      >
        ×
      </button>
    </div>

    ${receiptHtml(delivery)}

    <div class="button-row">
      <button
        type="button"
        class="button green full"
        data-whatsapp="${delivery.id}"
      >
        Enviar comprobante por WhatsApp
      </button>
    </div>

    <div class="danger-zone">
      <button
        type="button"
        class="button danger full"
        data-delete-delivery="${delivery.id}"
      >
        Eliminar entrega
      </button>
    </div>
  `);
}

function openTrackingModal(delivery) {
  const status = statusOf(delivery);
  const amountDue = dueTotal(delivery);

  openModal(`
    <div class="modal-head">
      <div>
        <h2>Seguimiento</h2>

        <span class="status ${status.toLowerCase()}">
          ${status}
        </span>
      </div>

      <button
        type="button"
        class="close-modal"
        aria-label="Cerrar"
      >
        ×
      </button>
    </div>

    <div class="tracking-summary">
      <strong>
        ${
          escapeHtml(
            clientById(delivery.clientId)?.name ||
            'Cliente eliminado'
          )
        }
      </strong>

      <p class="muted small">
        Entrega:
        ${dateTime(delivery.date)}
      </p>
    </div>

    <form
      id="tracking-form"
      data-delivery-id="${delivery.id}"
    >
      ${delivery.items.map(
        trackingItemHtml
      ).join('')}

      <button
        class="button dark full"
        type="submit"
      >
        Guardar seguimiento
      </button>
    </form>

    <div class="settlement-box">
      <div class="report-row">
        <span>Venta bruta</span>

        <strong>
          ${money(soldTotal(delivery))}
        </strong>
      </div>

      <div class="report-row">
        <span>
          Comisión
          (${commissionRate(delivery)}%)
        </span>

        <strong>
          − ${money(
            commissionTotal(delivery)
          )}
        </strong>
      </div>

      <div class="report-profit">
        <span>
          Neto del emprendimiento
        </span>

        <strong>
          ${money(
            netSoldTotal(delivery)
          )}
        </strong>
      </div>
    </div>

    <div class="section-head">
      <div>
        <h2>Pagos</h2>

        <p>
          Por cobrar:
          ${money(amountDue)}
        </p>
      </div>
    </div>

    <div class="payment-list">
      ${
        delivery.payments.length
          ? delivery.payments.map(
              paymentHtml
            ).join('')
          : `
            <p class="muted small">
              Todavía no registraste pagos.
            </p>
          `
      }
    </div>

    <form
      id="payment-form"
      class="button-row"
      data-delivery-id="${delivery.id}"
    >
      <div
        class="field"
        style="flex:1;margin:0"
      >
        <input
          name="amount"
          type="number"
          inputmode="decimal"
          min="${PAYMENT_STEP}"
          step="${PAYMENT_STEP}"
          placeholder="Importe"
          required
        >
      </div>

      <button
        class="button"
        type="submit"
      >
        Registrar pago
      </button>
    </form>

    <div class="button-row">
      <button
        type="button"
        class="button green full"
        data-whatsapp="${delivery.id}"
      >
        Enviar actualización por WhatsApp
      </button>
    </div>

    <div class="danger-zone">
      <button
        type="button"
        class="button danger full"
        data-delete-delivery="${delivery.id}"
      >
        Eliminar entrega
      </button>
    </div>
  `);
}

function trackingItemHtml(item, index) {
  const product = productById(
    item.productId
  );

  const image = product?.image || '';

  const pending = Math.max(
    0,
    Number(item.quantity) -
    Number(item.sold || 0) -
    Number(item.returned || 0)
  );

  return `
    <div class="line-item tracking-item">
      ${renderProductImage(
        image,
        item.name,
        'line-thumb'
      )}

      <div>
        <div class="card-title">
          ${escapeHtml(item.name)}
        </div>

        <div class="muted small">
          ${escapeHtml(
            item.brand || DEFAULT_BRAND
          )}
          · entregado:
          ${Number(item.quantity) || 0}
          · pendiente:
          ${pending}
        </div>
      </div>

      <div class="line-grid tracking-inputs">
        <div class="field">
          <label>
            Vendido
          </label>

          <input
            name="sold-${index}"
            type="number"
            inputmode="numeric"
            min="0"
            max="${Number(item.quantity) || 0}"
            step="1"
            value="${Number(item.sold) || 0}"
          >
        </div>

        <div class="field">
          <label>
            Devuelto
          </label>

          <input
            name="returned-${index}"
            type="number"
            inputmode="numeric"
            min="0"
            max="${Number(item.quantity) || 0}"
            step="1"
            value="${Number(item.returned) || 0}"
          >
        </div>
      </div>
    </div>
  `;
}

function paymentHtml(payment) {
  return `
    <div class="card-row card small">
      <span>
        ${dateTime(payment.date)}
      </span>

      <strong>
        ${money(payment.amount)}
      </strong>
    </div>
  `;
}

export function receiptHtml(delivery) {
  const client = clientById(
    delivery.clientId
  );

  return `
    <div class="receipt">
      <img
        class="receipt-logo"
        src="images/ctrl.png"
        alt="Ctrl+C"
      >

      <h2>
        Comprobante de entrega
      </h2>

      <p
        class="small muted"
        style="text-align:center"
      >
        Mercadería entregada en consignación
      </p>

      <hr>

      <div>
        <strong>
          ${escapeHtml(
            client?.name || 'Cliente'
          )}
        </strong>

        <br>

        <span class="small">
          ${dateTime(delivery.date)}
          · comisión
          ${commissionRate(delivery)}%
        </span>
      </div>

      <hr>

      ${delivery.items.map(item => {
        const product = productById(
          item.productId
        );

        return `
          <div class="receipt-product">
            ${renderProductImage(
              product?.image || '',
              item.name,
              ''
            )}

            <div class="receipt-line">
              <span>
                ${Number(item.quantity) || 0}
                ×
                ${escapeHtml(item.name)}

                <br>

                <small>
                  ${escapeHtml(item.presentation)}
                  ·
                  ${escapeHtml(
                    item.brand || DEFAULT_BRAND
                  )}
                </small>
              </span>

              <strong>
                ${money(
                  Number(item.quantity) *
                  Number(item.price)
                )}
              </strong>
            </div>
          </div>
        `;
      }).join('')}

      <hr>

      <div class="receipt-line">
        <strong>
          TOTAL EXHIBIDO
        </strong>

        <strong>
          ${money(
            deliveryTotal(delivery)
          )}
        </strong>
      </div>

      ${
        delivery.notes
          ? `
            <hr>

            <p class="small">
              <strong>
                Observaciones:
              </strong>

              ${escapeHtml(delivery.notes)}
            </p>
          `
          : ''
      }
    </div>
  `;
}

function saveTracking(event) {
  event.preventDefault();

  const deliveryId =
    event.currentTarget.dataset.deliveryId;

  const delivery = state.deliveries.find(
    currentDelivery => {
      return currentDelivery.id === deliveryId;
    }
  );

  if (!delivery) {
    toast('No encontramos la entrega');
    return;
  }

  const formData = new FormData(
    event.currentTarget
  );

  const updates = delivery.items.map(
    (item, index) => {
      return {
        sold: Math.max(
          0,
          Number(
            formData.get(`sold-${index}`)
          ) || 0
        ),

        returned: Math.max(
          0,
          Number(
            formData.get(`returned-${index}`)
          ) || 0
        )
      };
    }
  );

  const invalidUpdate = updates.some(
    (update, index) => {
      return (
        update.sold +
        update.returned >
        Number(
          delivery.items[index].quantity
        )
      );
    }
  );

  if (invalidUpdate) {
    toast(
      'Vendido + devuelto supera lo entregado'
    );

    return;
  }

  const previousItems = structuredClone(
    delivery.items
  );

  updates.forEach(
    (update, index) => {
      Object.assign(
        delivery.items[index],
        update
      );
    }
  );

  delivery.updatedAt =
    new Date().toISOString();

  if (!saveState()) {
    delivery.items = previousItems;

    toast(
      'No se pudo guardar el seguimiento'
    );

    return;
  }

  closeModal();
  render();

  toast('Seguimiento actualizado');
}

function savePayment(event) {
  event.preventDefault();

  const deliveryId =
    event.currentTarget.dataset.deliveryId;

  const delivery = state.deliveries.find(
    currentDelivery => {
      return currentDelivery.id === deliveryId;
    }
  );

  if (!delivery) {
    toast('No encontramos la entrega');
    return;
  }

  const formData = new FormData(
    event.currentTarget
  );

  const amount = Number(
    formData.get('amount')
  ) || 0;

  const pendingAmount = dueTotal(
    delivery
  );

  if (netSoldTotal(delivery) <= 0) {
    toast(
      'Primero registrá unidades vendidas'
    );

    return;
  }

  if (pendingAmount <= 0) {
    toast(
      'Esta entrega no tiene saldo pendiente'
    );

    return;
  }

  if (
    amount <= 0 ||
    amount > pendingAmount
  ) {
    toast(
      `El pago máximo es ${money(pendingAmount)}`
    );

    return;
  }

  delivery.payments ||= [];

  const payment = {
    id: uid(),
    amount,
    date: new Date().toISOString()
  };

  delivery.payments.push(payment);
  delivery.updatedAt =
    new Date().toISOString();

  if (!saveState()) {
    delivery.payments.pop();

    toast(
      'No se pudo registrar el pago'
    );

    return;
  }

  /*
   * Volvemos a abrir el seguimiento actualizado.
   */
  openTrackingModal(delivery);

  render();

  toast('Pago registrado');
}

function deleteDelivery(deliveryId) {
  const deliveryIndex =
    state.deliveries.findIndex(
      delivery => delivery.id === deliveryId
    );

  if (deliveryIndex < 0) {
    toast('No encontramos la entrega');
    return;
  }

  const shouldDelete = window.confirm(
    '¿Eliminar esta entrega y todos sus movimientos?'
  );

  if (!shouldDelete) {
    return;
  }

  const [deletedDelivery] =
    state.deliveries.splice(
      deliveryIndex,
      1
    );

  if (!saveState()) {
    state.deliveries.splice(
      deliveryIndex,
      0,
      deletedDelivery
    );

    toast(
      'No se pudo eliminar la entrega'
    );

    return;
  }

  closeModal();
  render();

  toast('Entrega eliminada');
}

function renderProductImage(
  image,
  productName,
  className
) {
  const source = image ||
    'images/ctrl-icon.png';

  return `
    <img
      ${className ? `class="${className}"` : ''}
      src="${escapeHtml(source)}"
      alt="${escapeHtml(productName)}"
    >
  `;
}
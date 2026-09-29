import {
  state,
  clientById
} from './state.js';

import {
  ROUTE_TITLES,
  DEFAULT_BRAND
} from './config.js';

import {
  totals,
  statusOf
} from './calculations.js';

import {
  money,
  escapeHtml,
  cleanPhone
} from './utils.js';

import {
  renderDeliveryForm,
  deliveryCard
} from './deliveries.js';

import {
  renderBrandReports,
  renderBrandFilterOptions
} from './reports.js';

let currentRoute = 'inicio';
let navigationInitialized = false;
let toastTimer = null;
let previouslyFocusedElement = null;

const historyFilters = {
  search: '',
  status: '',
  brand: ''
};

export function $(selector, root = document) {
  return root.querySelector(selector);
}

export function $$(selector, root = document) {
  return [
    ...root.querySelectorAll(selector)
  ];
}

export function initializeNavigation() {
  if (navigationInitialized) {
    return;
  }

  navigationInitialized = true;

  document.addEventListener(
    'click',
    handleNavigationClick
  );

  document.addEventListener(
    'input',
    handleHistoryInput
  );

  document.addEventListener(
    'change',
    handleHistoryChange
  );

  initializeModal();

  window.addEventListener(
    'ctrlc:update-available',
    () => {
      toast(
        'Hay una nueva versión disponible. Recargá la aplicación para actualizar.'
      );
    }
  );
}

function handleNavigationClick(event) {
  const navigationButton = event.target.closest(
    '.nav-item[data-route]'
  );

  if (navigationButton) {
    event.preventDefault();

    navigate(
      navigationButton.dataset.route
    );

    return;
  }

  const routeButton = event.target.closest(
    '[data-go]'
  );

  if (routeButton) {
    event.preventDefault();

    navigate(
      routeButton.dataset.go
    );
  }
}

function handleHistoryInput(event) {
  if (
    !event.target.matches(
      '#history-search'
    )
  ) {
    return;
  }

  historyFilters.search =
    event.target.value.trim();

  refreshHistoryList();
}

function handleHistoryChange(event) {
  if (
    event.target.matches(
      '#history-status'
    )
  ) {
    historyFilters.status =
      event.target.value;

    refreshHistoryList();
    return;
  }

  if (
    event.target.matches(
      '#history-brand'
    )
  ) {
    historyFilters.brand =
      event.target.value;

    refreshHistoryList();
  }
}

export function navigate(nextRoute) {
  if (!ROUTE_TITLES[nextRoute]) {
    nextRoute = 'inicio';
  }

  currentRoute = nextRoute;

  $$('.nav-item').forEach(button => {
    button.classList.toggle(
      'active',
      button.dataset.route === currentRoute
    );
  });

  render();

  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  });
}

export function getCurrentRoute() {
  return currentRoute;
}

export function render() {
  const app = $('#app');

  if (!app) {
    console.error(
      'No encontramos el elemento #app.'
    );

    return;
  }

  const pageTitle = $('#page-title');

  if (pageTitle) {
    pageTitle.textContent =
      ROUTE_TITLES[currentRoute] ||
      ROUTE_TITLES.inicio;
  }

  const views = {
    inicio: renderHome,
    clientes: renderClients,
    productos: renderProducts,
    entrega: renderDeliveryForm,
    historial: renderHistory
  };

  const selectedView =
    views[currentRoute] ||
    renderHome;

  app.innerHTML = selectedView();
}

function renderHome() {
  const summary = totals();

  const activeDeliveries =
    state.deliveries
      .filter(delivery => {
        return (
          statusOf(delivery) !==
          'Cerrado'
        );
      })
      .slice()
      .reverse()
      .slice(0, 3);

  return `
    <section class="hero-card">
      <small>
        Saldo pendiente de cobro
      </small>

      <div class="hero-total">
        ${money(summary.due)}
      </div>

      <div class="summary-grid">
        <div class="summary">
          <span>
            En comercios
          </span>

          <strong>
            ${money(summary.stockValue)}
          </strong>
        </div>

        <div class="summary">
          <span>
            Vendido bruto
          </span>

          <strong>
            ${money(summary.sold)}
          </strong>
        </div>

        <div class="summary">
          <span>
            Cobrado
          </span>

          <strong>
            ${money(summary.paid)}
          </strong>
        </div>

        <div class="summary">
          <span>
            Entregas
          </span>

          <strong>
            ${state.deliveries.length}
          </strong>
        </div>
      </div>
    </section>

    ${renderBrandReports()}

    <div class="section-head">
      <div>
        <h2>Accesos rápidos</h2>
      </div>
    </div>

    <section class="quick-grid">
      <button
        type="button"
        class="quick"
        data-go="entrega"
      >
        <span>＋</span>
        Nueva entrega
      </button>

      <button
        type="button"
        class="quick"
        data-action="new-client"
      >
        <span>♙</span>
        Agregar cliente
      </button>

      <button
        type="button"
        class="quick"
        data-action="new-product"
      >
        <span>▣</span>
        Agregar producto
      </button>

      <button
        type="button"
        class="quick"
        data-go="historial"
      >
        <span>≡</span>
        Ver historial
      </button>
    </section>

    <div class="section-head">
      <div>
        <h2>Entregas activas</h2>

        <p>
          Las últimas que requieren seguimiento
        </p>
      </div>
    </div>

    ${
      activeDeliveries.length
        ? activeDeliveries
            .map(deliveryCard)
            .join('')
        : emptyState(
            '✓',
            'Todavía no hay entregas',
            'Cargá la primera entrega para comenzar el seguimiento.'
          )
    }
  `;
}

function renderClients() {
  return `
    <div class="section-head">
      <div>
        <h2>Mis clientes</h2>

        <p>
          ${state.clients.length}
          guardado${
            state.clients.length === 1
              ? ''
              : 's'
          }
        </p>
      </div>

      <button
        type="button"
        class="button"
        data-action="new-client"
      >
        ＋ Agregar
      </button>
    </div>

    ${
      state.clients.length
        ? state.clients
            .map(clientCard)
            .join('')
        : emptyState(
            '♙',
            'No hay clientes',
            'Agregá el primer comercio para registrar una entrega.'
          )
    }
  `;
}

function clientCard(client) {
  const activeDeliveries =
    state.deliveries.filter(delivery => {
      return (
        delivery.clientId === client.id &&
        statusOf(delivery) !== 'Cerrado'
      );
    });

  const phone = cleanPhone(
    client.phone
  );

  return `
    <article class="card">
      <div class="card-row">
        <div>
          <div class="card-title">
            ${escapeHtml(client.name)}
          </div>

          <div class="muted small">
            ${escapeHtml(
              client.contact ||
              'Sin responsable'
            )}
          </div>
        </div>

        <strong>
          ${activeDeliveries.length}
          activas
        </strong>
      </div>

      <p class="small">
        ${
          phone
            ? escapeHtml(client.phone)
            : 'Sin WhatsApp'
        }

        ${
          client.address
            ? ` · ${escapeHtml(client.address)}`
            : ''
        }
      </p>

      <span class="commission-badge">
        Comisión
        ${Number(client.commission) || 0}%
      </span>

      <div class="button-row">
        <button
          type="button"
          class="button ghost small-button"
          data-edit-client="${client.id}"
        >
          Editar
        </button>

        ${
          phone
            ? `
              <a
                class="button green small-button"
                href="https://wa.me/${phone}"
                target="_blank"
                rel="noopener noreferrer"
              >
                WhatsApp
              </a>
            `
            : ''
        }
      </div>
    </article>
  `;
}

function renderProducts() {
  return `
    <div class="section-head">
      <div>
        <h2>Catálogo</h2>

        <p>
          Productos y precios editables
        </p>
      </div>

      <button
        type="button"
        class="button"
        data-action="new-product"
      >
        ＋ Agregar
      </button>
    </div>

    ${
      state.products.length
        ? state.products
            .map(productCard)
            .join('')
        : emptyState(
            '▣',
            'No hay productos',
            'Agregá un producto para armar entregas.'
          )
    }
  `;
}

function productCard(product) {
  const image =
    validProductImage(product.image)
      ? product.image
      : 'images/ctrl-icon.png';

  return `
    <article class="card product-card">
      <img
        class="product-thumb"
        src="${escapeHtml(image)}"
        alt="${escapeHtml(product.name)}"
      >

      <div class="product-info">
        <div class="card-row">
          <div>
            <div class="card-title">
              ${escapeHtml(product.name)}
            </div>

            <div class="muted small">
              ${escapeHtml(product.presentation)}
              ·
              ${escapeHtml(
                product.brand ||
                DEFAULT_BRAND
              )}
            </div>
          </div>

          <div class="amount">
            ${money(product.price)}
          </div>
        </div>

        <div class="muted small">
          Costo:
          ${money(product.cost || 0)}
        </div>

        <div class="button-row">
          <button
            type="button"
            class="button ghost small-button"
            data-edit-product="${product.id}"
          >
            Editar
          </button>
        </div>
      </div>
    </article>
  `;
}

function renderHistory() {
  return `
    <div class="section-head">
      <div>
        <h2>Todas las entregas</h2>

        <p>
          ${state.deliveries.length}
          registrada${
            state.deliveries.length === 1
              ? ''
              : 's'
          }
        </p>
      </div>
    </div>

    <div class="filter-row">
      <input
        id="history-search"
        type="search"
        placeholder="Buscar cliente"
        value="${escapeHtml(
          historyFilters.search
        )}"
      >

      <select id="history-status">
        <option value="">
          Todos los estados
        </option>

        ${[
          'Entregado',
          'Parcial',
          'Cobrado',
          'Cerrado'
        ].map(status => `
          <option
            value="${status}"
            ${
              historyFilters.status === status
                ? 'selected'
                : ''
            }
          >
            ${status}
          </option>
        `).join('')}
      </select>

      <select id="history-brand">
        ${renderBrandFilterOptions(
          historyFilters.brand
        )}
      </select>
    </div>

    <div id="history-list">
      ${historyList()}
    </div>
  `;
}

function historyList() {
  const normalizedSearch =
    historyFilters.search.toLocaleLowerCase(
      'es'
    );

  const filteredDeliveries =
    state.deliveries
      .slice()
      .reverse()
      .filter(delivery => {
        const client = clientById(
          delivery.clientId
        );

        const clientName = String(
          client?.name || ''
        ).toLocaleLowerCase('es');

        const matchesSearch =
          !normalizedSearch ||
          clientName.includes(
            normalizedSearch
          );

        const matchesStatus =
          !historyFilters.status ||
          statusOf(delivery) ===
            historyFilters.status;

        const matchesBrand =
          !historyFilters.brand ||
          delivery.items.some(item => {
            return (
              (item.brand ||
                DEFAULT_BRAND) ===
              historyFilters.brand
            );
          });

        return (
          matchesSearch &&
          matchesStatus &&
          matchesBrand
        );
      });

  if (!filteredDeliveries.length) {
    return emptyState(
      '≡',
      'No encontramos entregas',
      'Probá otro filtro o registrá una entrega nueva.'
    );
  }

  return filteredDeliveries
    .map(deliveryCard)
    .join('');
}

function refreshHistoryList() {
  const historyListElement =
    $('#history-list');

  if (!historyListElement) {
    return;
  }

  historyListElement.innerHTML =
    historyList();
}

export function emptyState(
  icon,
  title,
  text
) {
  return `
    <div class="card empty">
      <div class="empty-icon">
        ${escapeHtml(icon)}
      </div>

      <strong>
        ${escapeHtml(title)}
      </strong>

      <p class="small">
        ${escapeHtml(text)}
      </p>
    </div>
  `;
}

export function openModal(content) {
  const modal = $('#modal');
  const modalContent = $('#modal-content');

  if (!modal || !modalContent) {
    console.error(
      'No encontramos la ventana modal.'
    );

    return;
  }

  previouslyFocusedElement =
    document.activeElement;

  modalContent.innerHTML = `
    <div class="modal-inner">
      ${content}
    </div>
  `;

  $$('.close-modal', modal).forEach(
    button => {
      button.addEventListener(
        'click',
        closeModal
      );
    }
  );

  document.body.classList.add(
    'modal-open'
  );

  if (!modal.open) {
    modal.showModal();
  }
}

export function closeModal() {
  const modal = $('#modal');

  if (!modal?.open) {
    return;
  }

  modal.close();
}

function initializeModal() {
  const modal = $('#modal');

  if (!modal) {
    return;
  }

  /*
   * Impide cerrar accidentalmente el formulario
   * presionando Escape.
   */
  modal.addEventListener(
    'cancel',
    event => {
      event.preventDefault();

      toast(
        'Usá la × para cerrar esta ventana'
      );
    }
  );

  /*
   * No agregamos ningún evento para cerrar
   * al tocar fuera de la ventana.
   */
  modal.addEventListener(
    'close',
    () => {
      document.body.classList.remove(
        'modal-open'
      );

      const modalContent =
        $('#modal-content');

      if (modalContent) {
        modalContent.innerHTML = '';
      }

      if (
        previouslyFocusedElement instanceof
        HTMLElement
      ) {
        previouslyFocusedElement.focus();
      }

      previouslyFocusedElement = null;
    }
  );
}

export function toast(message) {
  const toastElement = $('#toast');

  if (!toastElement) {
    console.info(message);
    return;
  }

  toastElement.textContent = String(
    message || ''
  );

  toastElement.classList.add('show');

  window.clearTimeout(toastTimer);

  toastTimer = window.setTimeout(
    () => {
      toastElement.classList.remove(
        'show'
      );
    },
    2800
  );
}

function validProductImage(image) {
  return (
    typeof image === 'string' &&
    image.startsWith('data:image/')
  );
}
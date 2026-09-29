import {
  getBrands,
  brandReport
} from './calculations.js';

import {
  money,
  escapeHtml
} from './utils.js';

export function renderBrandReports() {
  const brands = getBrands();

  if (!brands.length) {
    return `
      <div class="section-head">
        <div>
          <h2>Cuentas por marca</h2>

          <p>
            Costos y ganancias de lo vendido
          </p>
        </div>
      </div>

      <div class="card empty">
        <div class="empty-icon">▣</div>

        <strong>
          Todavía no hay marcas
        </strong>

        <p class="small">
          Cuando agregues productos, sus marcas
          aparecerán automáticamente en este informe.
        </p>
      </div>
    `;
  }

  return `
    <div class="section-head">
      <div>
        <h2>Cuentas por marca</h2>

        <p>
          Costos y ganancias de lo vendido
        </p>
      </div>
    </div>

    <div class="brand-grid">
      ${brands.map(
        (brand, index) => {
          return renderBrandReportCard(
            brand,
            index
          );
        }
      ).join('')}
    </div>
  `;
}

/*
 * Conservamos también el nombre anterior de la función
 * para facilitar la migración desde el app.js original.
 */
export function renderBrandReport() {
  return renderBrandReports();
}

export function renderBrandReportCard(
  brand,
  index = 0
) {
  const report = brandReport(brand);

  return `
    <article
      class="brand-report brand-color-${index % 4}"
    >
      <div class="brand-report-head">
        <strong>
          ${escapeHtml(brand)}
        </strong>

        <span>
          ${money(report.collected)}
          cobrado
        </span>
      </div>

      <div class="report-row">
        <span>
          Venta bruta
        </span>

        <strong>
          ${money(report.gross)}
        </strong>
      </div>

      <div class="report-row">
        <span>
          Comisiones
        </span>

        <strong>
          − ${money(report.commission)}
        </strong>
      </div>

      <div class="report-row">
        <span>
          Neto por recibir
        </span>

        <strong>
          ${money(report.received)}
        </strong>
      </div>

      <div class="report-row">
        <span>
          Cobrado
        </span>

        <strong>
          ${money(report.collected)}
        </strong>
      </div>

      <div class="report-row">
        <span>
          Saldo pendiente
        </span>

        <strong>
          ${money(report.due)}
        </strong>
      </div>

      <div class="report-row">
        <span>
          Costos de lo vendido
        </span>

        <strong>
          − ${money(report.costs)}
        </strong>
      </div>

      <div class="report-profit">
        <span>
          Ganancia cobrada
        </span>

        <strong>
          ${money(report.profit)}
        </strong>
      </div>

      <div class="brand-unit-summary">
        <span>
          Vendidas:
          <strong>
            ${report.soldUnits}
          </strong>
        </span>

        <span>
          Pendientes:
          <strong>
            ${report.pendingUnits}
          </strong>
        </span>
      </div>
    </article>
  `;
}

export function renderBrandFilterOptions(
  selectedBrand = ''
) {
  const brands = getBrands();

  return `
    <option value="">
      Todas las marcas
    </option>

    ${brands.map(brand => `
      <option
        value="${escapeHtml(brand)}"
        ${
          brand === selectedBrand
            ? 'selected'
            : ''
        }
      >
        ${escapeHtml(brand)}
      </option>
    `).join('')}
  `;
}
import {
  state,
  clientById,
  deliveryById
} from './state.js';

import {
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
  money,
  dateTime,
  cleanPhone,
  plural
} from './utils.js';

import {
  toast
} from './ui.js';

export function sendWhatsApp(deliveryId) {
  const delivery = deliveryById(
    deliveryId
  );

  if (!delivery) {
    toast('No encontramos la entrega');
    return;
  }

  const client = clientById(
    delivery.clientId
  );

  if (!client) {
    toast('No encontramos el cliente');
    return;
  }

  const phone = cleanPhone(
    client.phone
  );

  if (!phone) {
    toast(
      'El cliente no tiene WhatsApp cargado'
    );

    return;
  }

  if (phone.length < 8) {
    toast(
      'El número de WhatsApp parece incompleto'
    );

    return;
  }

  const message = whatsappText(
    delivery
  );

  const whatsappUrl =
    `https://wa.me/${phone}` +
    `?text=${encodeURIComponent(message)}`;

  const openedWindow = window.open(
    whatsappUrl,
    '_blank',
    'noopener,noreferrer'
  );

  /*
   * Algunos navegadores móviles bloquean
   * window.open. En ese caso navegamos
   * directamente hacia WhatsApp.
   */
  if (!openedWindow) {
    window.location.href = whatsappUrl;
  }
}

export function whatsappText(delivery) {
  if (hasTrackingActivity(delivery)) {
    return trackingWhatsAppText(
      delivery
    );
  }

  return deliveryWhatsAppText(
    delivery
  );
}

export function deliveryWhatsAppText(
  delivery
) {
  const client = clientById(
    delivery.clientId
  );

  const totalUnits =
    deliveredUnitTotal(delivery);

  const productLines =
    delivery.items.map(item => {
      const quantity =
        Number(item.quantity) || 0;

      const unitPrice =
        Number(item.price) || 0;

      const lineTotal =
        quantity * unitPrice;

      const presentation = singleLine(
        item.presentation
      );

      return (
        `• ${quantity} x ` +
        `${singleLine(item.name)}` +
        `${
          presentation
            ? ` (${presentation})`
            : ''
        }` +
        ` — ${money(lineTotal)}`
      );
    });

  const lines = [
    whatsappHeader(),
    '*COMPROBANTE DE ENTREGA*',
    '',
    `Cliente: ${
      singleLine(
        client?.name || ''
      )
    }`,
    `Fecha: ${dateTime(delivery.date)}`,
    `Comisión acordada: ${
      commissionRate(delivery)
    }%`,
    '',
    ...productLines,
    `*TOTAL ENTREGADO: ${totalUnits} ${
      plural(
        totalUnits,
        'Producto',
        'Productos'
      )
    }*`
  ];

  if (delivery.notes) {
    lines.push(
      '',
      `Observaciones: ${
        singleLine(delivery.notes)
      }`
    );
  }

  lines.push(
    '',
    '_(Este mensaje funciona como duplicado de la mercadería entregada en consignación.)_'
  );

  return lines.join('\n');
}

export function trackingWhatsAppText(
  delivery
) {
  const client = clientById(
    delivery.clientId
  );

  const updatedDate =
    delivery.updatedAt ||
    lastPaymentDate(delivery) ||
    new Date().toISOString();

  const itemBlocks = delivery.items.map(
    item => trackingItemText(item)
  );

  const pending = pendingUnits(
    delivery
  );

  const lines = [
    whatsappHeader(),
    '*SEGUIMIENTO ACTUALIZADO*',
    '',
    `Cliente: ${
      singleLine(
        client?.name || ''
      )
    }`,
    `Entrega: ${dateTime(delivery.date)}`,
    `Actualizado: ${dateTime(updatedDate)}`,
    `Estado: ${statusOf(delivery)}`,
    '',
    itemBlocks.join('\n'),
    '',
    `Venta bruta: ${
      money(soldTotal(delivery))
    }`,
    `Comisión (${
      commissionRate(delivery)
    }%): -${
      money(commissionTotal(delivery))
    }`,
    `Neto a rendir: ${
      money(netSoldTotal(delivery))
    }`,
    `Pagado: ${
      money(paidTotal(delivery))
    }`,
    `*SALDO PENDIENTE: ${
      money(dueTotal(delivery))
    }*`,
    '',
    `Mercadería que continúa en el negocio: ${
      pending
    } ${
      plural(
        pending,
        'unidad',
        'unidades'
      )
    }.`,
    '',
    '_(Este mensaje funciona como actualización del comprobante de consignación.)_'
  ];

  return lines.join('\n');
}

function trackingItemText(item) {
  const delivered =
    Number(item.quantity) || 0;

  const sold =
    Number(item.sold) || 0;

  const returned =
    Number(item.returned) || 0;

  const pending = Math.max(
    0,
    delivered - sold - returned
  );

  const unitPrice =
    Number(item.price) || 0;

  const lines = [
    `• *${singleLine(item.name)}*`,
    `    Entregado: ${delivered}.`
  ];

  if (sold > 0) {
    let soldLine =
      `    Vendido: ${sold} x ` +
      `(${money(unitPrice)})`;

    /*
     * Cuando se vendió más de una unidad,
     * mostramos también el total de esa línea.
     */
    if (sold > 1) {
      soldLine +=
        ` = ${money(sold * unitPrice)}`;
    }

    soldLine += '.';

    lines.push(soldLine);
  }

  if (returned > 0) {
    lines.push(
      `    Devuelto: ${returned}.`
    );
  }

  if (pending > 0) {
    lines.push(
      `    Pendiente: ${pending}.`
    );
  }

  return lines.join('\n');
}

function whatsappHeader() {
  const businessName = singleLine(
    state.settings?.businessName ||
    'Ctrl+C'
  );

  return (
    `*${businessName} · ` +
    'CONTROL DE CONSIGNACIONES*'
  );
}

function hasTrackingActivity(delivery) {
  if (delivery.updatedAt) {
    return true;
  }

  const hasProductMovement =
    delivery.items.some(item => {
      return (
        Number(item.sold) > 0 ||
        Number(item.returned) > 0
      );
    });

  const hasPayments =
    Array.isArray(delivery.payments) &&
    delivery.payments.length > 0;

  return (
    hasProductMovement ||
    hasPayments
  );
}

function deliveredUnitTotal(delivery) {
  return delivery.items.reduce(
    (total, item) => {
      return (
        total +
        (Number(item.quantity) || 0)
      );
    },
    0
  );
}

function lastPaymentDate(delivery) {
  if (
    !Array.isArray(delivery.payments) ||
    !delivery.payments.length
  ) {
    return '';
  }

  return delivery.payments[
    delivery.payments.length - 1
  ]?.date || '';
}

function singleLine(value) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim();
}
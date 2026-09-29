import { state } from './state.js';
function numberValue(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}
function deliveryItems(delivery) { return Array.isArray(delivery?.items) ? delivery.items : []; }
function deliveryPayments(delivery) { return Array.isArray(delivery?.payments) ? delivery.payments : []; }
export function deliveredUnits(delivery) { return deliveryItems(delivery).reduce((total, item) => { return total + numberValue(item.quantity); }, 0 ); }
export function soldUnits(delivery) { return deliveryItems(delivery).reduce((total, item) => { return total + numberValue(item.sold); }, 0); }
export function returnedUnits(delivery) { return deliveryItems(delivery).reduce((total, item) => { return total + numberValue(item.returned); }, 0); }
export function pendingUnits(delivery) {
  return deliveryItems(delivery).reduce((total, item) => {
    const quantity = numberValue(item.quantity);
    const sold = numberValue(item.sold);
    const returned = numberValue(item.returned);
    const pending = Math.max(0, quantity - sold - returned);
    return total + pending;
  }, 0);
}
export function deliveryTotal(delivery) {
  return deliveryItems(delivery).reduce((total, item) => {
    const quantity = numberValue(item.quantity);
    const price = numberValue(item.price);
    return total + quantity * price;
  }, 0);
}
export function soldTotal(delivery) {
  return deliveryItems(delivery).reduce((total, item) => {
    const sold = numberValue(item.sold);
    const price = numberValue(item.price);
    return total + sold * price;
  }, 0);
}
export function soldCostTotal(delivery) {
  return deliveryItems(delivery).reduce((total, item) => {
    const sold = numberValue(item.sold);
    const cost = numberValue(item.cost);
    return total + sold * cost;
  }, 0);
}
export function commissionRate(delivery) { return Math.max(0, Math.min(100, numberValue(delivery?.commission))); }
export function commissionTotal(delivery) { return (soldTotal(delivery) * commissionRate(delivery) / 100); }
export function netSoldTotal(delivery) { return (soldTotal(delivery) - commissionTotal(delivery)); }
export function paidTotal(delivery) { return deliveryPayments(delivery).reduce((total, payment) => { return total + numberValue(payment.amount); }, 0); }
export function dueTotal(delivery) { return Math.max(0, netSoldTotal(delivery) - paidTotal(delivery)); }
export function stockValue(delivery) {
  return deliveryItems(delivery).reduce((total, item) => {
    const quantity = numberValue(item.quantity);
    const sold = numberValue(item.sold);
    const returned = numberValue(item.returned);
    const price = numberValue(item.price);
    const pending = Math.max(0, quantity - sold - returned);
    return total + pending * price;
  }, 0);
}
export function statusOf(delivery) {
  const pending = pendingUnits(delivery);
  const sold = soldUnits(delivery);
  const returned = returnedUnits(delivery);
  const paid = paidTotal(delivery);
  const due = netSoldTotal(delivery);
  if (pending === 0 && paid >= due) { return 'Cerrado'; }
  if (due > 0 && paid >= due) { return 'Cobrado'; }
  if (sold > 0 || returned > 0 || paid > 0) { return 'Parcial'; }
  return 'Entregado';
}
export function totals(deliveries = state.deliveries) {
  const result = { delivered: 0, sold: 0, commissions: 0, netSold: 0, paid: 0, stockValue: 0, costs: 0, profit: 0, due: 0, deliveredUnits: 0, soldUnits: 0, returnedUnits: 0, pendingUnits: 0 };
  deliveries.forEach(delivery => {
    result.delivered += deliveryTotal(delivery);
    result.sold += soldTotal(delivery);
    result.commissions += commissionTotal(delivery);
    result.netSold += netSoldTotal(delivery);
    result.paid += paidTotal(delivery);
    result.stockValue += stockValue(delivery);
    result.costs += soldCostTotal(delivery);
    result.deliveredUnits += deliveredUnits(delivery);
    result.soldUnits += soldUnits(delivery);
    result.returnedUnits += returnedUnits(delivery);
    result.pendingUnits += pendingUnits(delivery);
  });
  result.due = Math.max(0, result.netSold - result.paid);
  result.profit = result.netSold - result.costs;
  return result;
}
export function getBrands() {
  const brands = new Set();
  state.products.forEach(product => {
    const brand = String(product.brand || 'General').trim();
    brands.add(brand || 'General');
  });
  state.deliveries.forEach(delivery => {
    deliveryItems(delivery).forEach(item => {
      const brand = String(item.brand || 'General').trim();
      brands.add(brand || 'General');
    });
  });
  return [...brands].sort((firstBrand, secondBrand) => { return firstBrand.localeCompare(secondBrand, 'es'); });
}
export function brandReport(brand, deliveries = state.deliveries) {
  const selectedBrand = String(brand || 'General').trim();
  const report = { brand: selectedBrand, gross: 0, commission: 0, received: 0, collected: 0, costs: 0, profit: 0, due: 0, soldUnits: 0, pendingUnits: 0 };
  deliveries.forEach(delivery => { let deliveryBrandNet = 0;
    deliveryItems(delivery).forEach(item => {
      const itemBrand = String(item.brand || 'General').trim();
      if (itemBrand !== selectedBrand) { return; }
      const sold = numberValue(item.sold);
      const quantity = numberValue(item.quantity);
      const returned = numberValue(item.returned);
      const price = numberValue(item.price);
      const cost = numberValue(item.cost);
      const gross = sold * price;
      const commission = gross * commissionRate(delivery) / 100;
      const net = gross - commission;
      report.gross += gross;
      report.commission += commission;
      report.received += net;
      report.costs += sold * cost;
      report.soldUnits += sold;
      report.pendingUnits += Math.max(0, quantity - sold - returned);
      deliveryBrandNet += net;
    });
    const deliveryNet = netSoldTotal(delivery);
    if (deliveryNet > 0 && deliveryBrandNet > 0) {
      const brandProportion = deliveryBrandNet / deliveryNet;
      report.collected += paidTotal(delivery) * brandProportion;
    }
  });
  report.due = Math.max(0, report.received - report.collected);
  /* Conservamos el cálculo utilizado por la aplicación: ganancia cobrada menos el costo de lo vendido. */
  report.profit = Math.max(0, report.collected - report.costs);
  return report;
}
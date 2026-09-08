/** Formato de moneda usado en toda la app (ARS). */
export const money = (value: number) =>
  new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0);

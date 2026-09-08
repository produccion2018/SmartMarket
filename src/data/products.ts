/**
 * ============================================================
 *  CAPA DE DATOS (MOCK) — SmartMarket POS
 * ============================================================
 *  Este archivo contiene datos simulados en memoria.
 *
 *  >>> PUNTO DE INTEGRACIÓN CON LA API DE PYTHON (FastAPI/Flask + SQLite3) <<<
 *  Reemplazar las funciones de `src/lib/api.ts` por llamadas fetch reales.
 *  Este archivo puede eliminarse cuando la API esté disponible.
 * ============================================================
 */

export type Product = {
  id: string;
  /** Código de barras / SKU (escaneo) */
  barcode: string;
  name: string;
  category: string;
  /** Precio unitario */
  price: number;
  /** Unidades disponibles en depósito */
  stock: number;
  /** Unidad de venta: "un" (unidad) o "kg" */
  unit: "un" | "kg";
};

export const CATEGORIES = [
  "Almacén",
  "Bebidas",
  "Frescos",
  "Limpieza",
  "Panadería",
] as const;

export const SEED_PRODUCTS: Product[] = [
  { id: "p1", barcode: "7790001000017", name: "Leche entera 1L", category: "Frescos", price: 1250, stock: 48, unit: "un" },
  { id: "p2", barcode: "7790001000024", name: "Pan lactal 500g", category: "Panadería", price: 1890, stock: 22, unit: "un" },
  { id: "p3", barcode: "7790001000031", name: "Café molido 250g", category: "Almacén", price: 4750, stock: 15, unit: "un" },
  { id: "p4", barcode: "7790001000048", name: "Gaseosa cola 2.25L", category: "Bebidas", price: 3200, stock: 60, unit: "un" },
  { id: "p5", barcode: "7790001000055", name: "Arroz largo fino 1kg", category: "Almacén", price: 1580, stock: 9, unit: "un" },
  { id: "p6", barcode: "7790001000062", name: "Detergente 750ml", category: "Limpieza", price: 2340, stock: 31, unit: "un" },
  { id: "p7", barcode: "7790001000079", name: "Queso cremoso", category: "Frescos", price: 8900, stock: 6, unit: "kg" },
  { id: "p8", barcode: "7790001000086", name: "Yerba mate 1kg", category: "Almacén", price: 5490, stock: 27, unit: "un" },
  { id: "p9", barcode: "7790001000093", name: "Agua mineral 1.5L", category: "Bebidas", price: 1100, stock: 74, unit: "un" },
  { id: "p10", barcode: "7790001000109", name: "Lavandina 1L", category: "Limpieza", price: 1450, stock: 3, unit: "un" },
  { id: "p11", barcode: "7790001000116", name: "Medialunas x6", category: "Panadería", price: 2600, stock: 18, unit: "un" },
  { id: "p12", barcode: "7790001000123", name: "Fideos guiseros 500g", category: "Almacén", price: 1290, stock: 52, unit: "un" },
  { id: "p13", barcode: "7790001000130", name: "Cerveza rubia 473ml", category: "Bebidas", price: 1750, stock: 40, unit: "un" },
  { id: "p14", barcode: "7790001000147", name: "Manteca 200g", category: "Frescos", price: 2150, stock: 12, unit: "un" },
  { id: "p15", barcode: "7790001000154", name: "Papel higiénico x4", category: "Limpieza", price: 3050, stock: 0, unit: "un" },
];

/** Umbral para marcar stock bajo en la vista de inventario. */
export const LOW_STOCK_THRESHOLD = 10;

/**
 * ============================================================
 *  SERVICIO / CLIENTE DE API — SmartMarket POS
 * ============================================================
 *  TODA la comunicación con el backend debe pasar por este archivo.
 *  Hoy funciona 100% con localStorage (persistencia local en el navegador)
 *  para que la demo sea usable sin backend, y no se resetee al recargar.
 *
 *  >>> INTEGRACIÓN CON PYTHON (FastAPI / Flask + SQLite3) <
 *  Descomentar el bloque `request()` y reemplazar cada función por su
 *  endpoint. Endpoints sugeridos:
 *
 *    GET    /api/products              -> listProducts()
 *    POST   /api/products              -> createProduct(payload)
 *    PUT    /api/products/{id}         -> updateProduct(id, payload)
 *    DELETE /api/products/{id}         -> deleteProduct(id)
 *    GET    /api/products/{barcode}    -> findByBarcode(barcode)
 *    POST   /api/sales                 -> checkout(payload)  (descuenta stock + guarda ticket)
 *
 *  Las firmas de las funciones NO deberían cambiar: los componentes ya las
 *  consumen como promesas (async/await).
 * ============================================================
 */

import { SEED_PRODUCTS, type Product } from "@/data/products";

// export const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";
//
// async function request<T>(path: string, init?: RequestInit): Promise<T> {
//   const res = await fetch(`${API_BASE_URL}${path}`, {
//     headers: { "Content-Type": "application/json" },
//     ...init,
//   });
//   if (!res.ok) throw new Error(`Error ${res.status} en ${path}`);
//   return (await res.json()) as T;
// }

const STORAGE_KEY = "smartmarket_products";

const delay = (ms = 180) => new Promise((r) => setTimeout(r, ms));

/** Lee el inventario desde localStorage. Si no existe, lo inicializa con SEED_PRODUCTS. */
function readDb(): Product[] {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_PRODUCTS));
    return [...SEED_PRODUCTS];
  }
  try {
    return JSON.parse(raw) as Product[];
  } catch {
    // Si el dato guardado está corrupto, reiniciamos con la semilla.
    localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_PRODUCTS));
    return [...SEED_PRODUCTS];
  }
}

/** Escribe el inventario completo en localStorage. */
function writeDb(products: Product[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
}

export type ProductInput = Omit<Product, "id">;

export type CheckoutLine = {
  productId: string;
  barcode: string;
  name: string;
  unitPrice: number;
  qty: number;
};

export type CheckoutPayload = {
  lines: CheckoutLine[];
  subtotal: number;
  discountPercent: number;
  discountAmount: number;
  total: number;
  paymentMethod: "efectivo" | "debito" | "credito" | "qr";
};

export type Sale = CheckoutPayload & {
  ticketNumber: string;
  createdAt: string;
};

/** GET /api/products */
export async function listProducts(): Promise<Product[]> {
  await delay();
  return readDb();
}

/** GET /api/products/{barcode} */
export async function findByBarcode(barcode: string): Promise<Product | undefined> {
  await delay(60);
  return readDb().find((p) => p.barcode === barcode.trim());
}

/** POST /api/products */
export async function createProduct(input: ProductInput): Promise<Product> {
  await delay();
  const product: Product = { ...input, id: `p${Date.now()}` };
  const db = [product, ...readDb()];
  writeDb(db);
  return product;
}

/** PUT /api/products/{id} */
export async function updateProduct(id: string, input: ProductInput): Promise<Product> {
  await delay();
  const db = readDb().map((p) => (p.id === id ? { ...input, id } : p));
  writeDb(db);
  const found = db.find((p) => p.id === id);
  if (!found) throw new Error("Producto inexistente");
  return found;
}

/** DELETE /api/products/{id} */
export async function deleteProduct(id: string): Promise<void> {
  await delay();
  const db = readDb().filter((p) => p.id !== id);
  writeDb(db);
}

/**
 * POST /api/sales
 * En el backend real esta operación debe ser transaccional:
 * insertar la venta + sus renglones y descontar el stock.
 */
export async function checkout(payload: CheckoutPayload): Promise<Sale> {
  await delay(450);
  const db = readDb().map((p) => {
    const line = payload.lines.find((l) => l.productId === p.id);
    return line ? { ...p, stock: Math.max(0, p.stock - line.qty) } : p;
  });
  writeDb(db);
  return {
    ...payload,
    ticketNumber: String(Math.floor(Math.random() * 900000) + 100000),
    createdAt: new Date().toISOString(),
  };
}

/** Reinicia el inventario a los valores originales de fábrica (útil para la demo). */
export async function resetDemoData(): Promise<void> {
  writeDb([...SEED_PRODUCTS]);
}
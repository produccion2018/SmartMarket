/**
 * ============================================================
 *  SERVICIO / CLIENTE DE API — SmartMarket POS
 * ============================================================
 *  TODA la comunicación con el backend debe pasar por este archivo.
 *  Hoy funciona 100% en memoria (mock) para que el frontend sea usable
 *  sin backend.
 *
 *  >>> INTEGRACIÓN CON PYTHON (FastAPI / Flask + SQLite3) <<<
 *  Descomentar el bloque `request()` y reemplazar cada función mock por su
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

/** Store en memoria — se reemplaza por SQLite3 del lado del backend. */
let db: Product[] = [...SEED_PRODUCTS];

const delay = (ms = 180) => new Promise((r) => setTimeout(r, ms));

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
  return [...db];
}

/** GET /api/products/{barcode} */
export async function findByBarcode(barcode: string): Promise<Product | undefined> {
  await delay(60);
  return db.find((p) => p.barcode === barcode.trim());
}

/** POST /api/products */
export async function createProduct(input: ProductInput): Promise<Product> {
  await delay();
  const product: Product = { ...input, id: `p${Date.now()}` };
  db = [product, ...db];
  return product;
}

/** PUT /api/products/{id} */
export async function updateProduct(id: string, input: ProductInput): Promise<Product> {
  await delay();
  db = db.map((p) => (p.id === id ? { ...input, id } : p));
  const found = db.find((p) => p.id === id);
  if (!found) throw new Error("Producto inexistente");
  return found;
}

/** DELETE /api/products/{id} */
export async function deleteProduct(id: string): Promise<void> {
  await delay();
  db = db.filter((p) => p.id !== id);
}

/**
 * POST /api/sales
 * En el backend real esta operación debe ser transaccional:
 * insertar la venta + sus renglones y descontar el stock.
 */
export async function checkout(payload: CheckoutPayload): Promise<Sale> {
  await delay(450);
  db = db.map((p) => {
    const line = payload.lines.find((l) => l.productId === p.id);
    return line ? { ...p, stock: Math.max(0, p.stock - line.qty) } : p;
  });
  return {
    ...payload,
    ticketNumber: String(Math.floor(Math.random() * 900000) + 100000),
    createdAt: new Date().toISOString(),
  };
}

import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Minus, Plus, ScanBarcode, Search, Trash2, X } from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { TicketDialog } from "@/components/pos/TicketDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { money } from "@/lib/format";
import { CATEGORIES, type Product } from "@/data/products";
import {
  checkout as checkoutApi,
  findByBarcode,
  listProducts,
  type CheckoutPayload,
  type Sale,
} from "@/lib/api";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Caja y ventas — SmartMarket POS" },
      {
        name: "description",
        content:
          "Terminal de caja de SmartMarket: escaneo de productos, carrito, descuentos y emisión de tickets.",
      },
      { property: "og:title", content: "Caja y ventas — SmartMarket POS" },
      {
        property: "og:description",
        content: "Simulá ventas de supermercado: carrito, descuentos y tickets en segundos.",
      },
    ],
  }),
  component: CajaPage,
});

type CartItem = { product: Product; qty: number };

function CajaPage() {
  const queryClient = useQueryClient();

  // >>> API PYTHON: GET /api/products
  const { data: products = [], isLoading } = useQuery({
    queryKey: ["products"],
    queryFn: listProducts,
  });

  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("todas");
  const [barcode, setBarcode] = useState("");
  const [discount, setDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] =
    useState<CheckoutPayload["paymentMethod"]>("efectivo");
  const [sale, setSale] = useState<Sale | null>(null);
  const barcodeRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(
    () =>
      products.filter(
        (p) =>
          (category === "todas" || p.category === category) &&
          (p.name.toLowerCase().includes(search.toLowerCase()) || p.barcode.includes(search)),
      ),
    [products, search, category],
  );

  const subtotal = cart.reduce((acc, i) => acc + i.product.price * i.qty, 0);
  const discountAmount = subtotal * (discount / 100);
  const total = subtotal - discountAmount;
  const units = cart.reduce((acc, i) => acc + i.qty, 0);

  function addToCart(product: Product) {
    setCart((prev) => {
      const found = prev.find((i) => i.product.id === product.id);
      if (found) {
        return prev.map((i) =>
          i.product.id === product.id ? { ...i, qty: i.qty + 1 } : i,
        );
      }
      return [...prev, { product, qty: 1 }];
    });
  }

  function changeQty(id: string, delta: number) {
    setCart((prev) =>
      prev
        .map((i) => (i.product.id === id ? { ...i, qty: i.qty + delta } : i))
        .filter((i) => i.qty > 0),
    );
  }

  /** Simula el escaneo con lector de código de barras. */
  async function handleScan(e: React.FormEvent) {
    e.preventDefault();
    if (!barcode.trim()) return;
    // >>> API PYTHON: GET /api/products/{barcode}
    const product = await findByBarcode(barcode);
    if (!product) {
      toast.error("Código no encontrado", { description: barcode });
    } else {
      addToCart(product);
      toast.success(`${product.name} agregado`);
    }
    setBarcode("");
    barcodeRef.current?.focus();
  }

  // >>> API PYTHON: POST /api/sales (transacción + descuento de stock)
  const cobrar = useMutation({
    mutationFn: () =>
      checkoutApi({
        lines: cart.map((i) => ({
          productId: i.product.id,
          barcode: i.product.barcode,
          name: i.product.name,
          unitPrice: i.product.price,
          qty: i.qty,
        })),
        subtotal,
        discountPercent: discount,
        discountAmount,
        total,
        paymentMethod,
      }),
    onSuccess: (result) => {
      setSale(result);
      setCart([]);
      setDiscount(0);
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Cobro realizado con éxito");
    },
    onError: () => toast.error("No se pudo registrar la venta"),
  });

  return (
    <AppShell>
      <div className="grid gap-4 p-4 lg:grid-cols-[1fr_380px] lg:p-6">
        {/* ---------------- Catálogo / escaneo ---------------- */}
        <section className="min-w-0">
          <header className="mb-4">
            <h1 className="text-2xl font-bold">Caja</h1>
            <p className="text-sm text-muted-foreground">
              Escaneá un código o tocá un producto para sumarlo al carrito.
            </p>
          </header>

          <form onSubmit={handleScan} className="mb-3 flex gap-2">
            <div className="relative flex-1">
              <ScanBarcode className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                ref={barcodeRef}
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                placeholder="Escanear código de barras (ej. 7790001000017)"
                className="pl-9"
                inputMode="numeric"
              />
            </div>
            <Button type="submit" variant="panel">
              Agregar
            </Button>
          </form>

          <div className="mb-4 flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar producto"
                className="pl-9"
              />
            </div>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="sm:w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas las categorías</SelectItem>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <p className="text-sm text-muted-foreground">Cargando productos…</p>
          ) : (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
              {filtered.map((p) => (
                <button
                  key={p.id}
                  onClick={() => addToCart(p)}
                  disabled={p.stock === 0}
                  className="group flex flex-col rounded-xl border border-border bg-card p-3 text-left transition-all hover:border-primary hover:shadow-panel disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <span className="text-[11px] tracking-wide text-muted-foreground uppercase">
                    {p.category}
                  </span>
                  <span className="mt-1 line-clamp-2 text-sm font-medium">{p.name}</span>
                  <span className="mt-auto pt-3 font-display text-lg font-bold tabular">
                    {money(p.price)}
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    {p.stock === 0 ? "Sin stock" : `Stock ${p.stock} ${p.unit}`}
                  </span>
                </button>
              ))}
              {filtered.length === 0 && (
                <p className="text-sm text-muted-foreground">Sin resultados.</p>
              )}
            </div>
          )}
        </section>

        {/* ---------------- Carrito / cobro ---------------- */}
        <aside className="lg:sticky lg:top-6 lg:h-fit">
          <div className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-panel">
            <div className="flex items-center justify-between bg-panel px-4 py-3 text-panel-foreground">
              <h2 className="text-base font-semibold">Ticket actual</h2>
              <Badge variant="secondary">{units} u.</Badge>
            </div>

            <ul className="max-h-[38vh] divide-y divide-border overflow-y-auto">
              {cart.length === 0 && (
                <li className="p-6 text-center text-sm text-muted-foreground">
                  El carrito está vacío.
                </li>
              )}
              {cart.map(({ product, qty }) => (
                <li key={product.id} className="flex items-center gap-2 p-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{product.name}</p>
                    <p className="text-xs text-muted-foreground tabular">
                      {money(product.price)} × {qty}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button size="icon" variant="outline" onClick={() => changeQty(product.id, -1)}>
                      <Minus />
                    </Button>
                    <span className="w-6 text-center text-sm tabular">{qty}</span>
                    <Button size="icon" variant="outline" onClick={() => changeQty(product.id, 1)}>
                      <Plus />
                    </Button>
                  </div>
                  <span className="w-20 text-right text-sm font-semibold tabular">
                    {money(product.price * qty)}
                  </span>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => setCart((c) => c.filter((i) => i.product.id !== product.id))}
                  >
                    <X />
                  </Button>
                </li>
              ))}
            </ul>

            <div className="space-y-3 border-t border-border p-4">
              <div className="flex items-center justify-between gap-2">
                <label className="text-sm text-muted-foreground" htmlFor="desc">
                  Descuento (%)
                </label>
                <Input
                  id="desc"
                  type="number"
                  min={0}
                  max={100}
                  value={discount}
                  onChange={(e) =>
                    setDiscount(Math.min(100, Math.max(0, Number(e.target.value) || 0)))
                  }
                  className="w-24 text-right"
                />
              </div>
              <div className="flex gap-2">
                {[0, 10, 20].map((d) => (
                  <Button
                    key={d}
                    size="sm"
                    variant={discount === d ? "accent" : "secondary"}
                    className="flex-1"
                    onClick={() => setDiscount(d)}
                  >
                    {d === 0 ? "Sin desc." : `${d}%`}
                  </Button>
                ))}
              </div>

              <Select
                value={paymentMethod}
                onValueChange={(v) => setPaymentMethod(v as CheckoutPayload["paymentMethod"])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="efectivo">Efectivo</SelectItem>
                  <SelectItem value="debito">Tarjeta de débito</SelectItem>
                  <SelectItem value="credito">Tarjeta de crédito</SelectItem>
                  <SelectItem value="qr">QR / billetera</SelectItem>
                </SelectContent>
              </Select>

              <div className="space-y-1 border-t border-border pt-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="tabular">{money(subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Descuento</span>
                  <span className="tabular">- {money(discountAmount)}</span>
                </div>
                <div className="flex items-baseline justify-between pt-1">
                  <span className="font-display text-base font-bold">TOTAL</span>
                  <span className="font-display text-2xl font-bold tabular">{money(total)}</span>
                </div>
              </div>

              <Button
                variant="cobro"
                size="xl"
                className="w-full"
                disabled={cart.length === 0 || cobrar.isPending}
                onClick={() => cobrar.mutate()}
              >
                {cobrar.isPending ? "Procesando…" : `Cobrar ${money(total)}`}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="w-full"
                disabled={cart.length === 0}
                onClick={() => setCart([])}
              >
                <Trash2 /> Cancelar venta
              </Button>
            </div>
          </div>
        </aside>
      </div>

      <TicketDialog sale={sale} onClose={() => setSale(null)} />
    </AppShell>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Clock,
  CupSoda,
  Croissant,
  LayoutGrid,
  Milk,
  Minus,
  Package,
  Plus,
  Receipt,
  ScanBarcode,
  Search,
  ShoppingBasket,
  SprayCan,
  Trash2,
  X,
  type LucideIcon,
} from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { TicketDialog } from "@/components/pos/TicketDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { money } from "@/lib/format";
import { CATEGORIES, LOW_STOCK_THRESHOLD, type Product } from "@/data/products";
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

const d = (n: number) => ({ "--d": n }) as CSSProperties;

/** Ícono y tono (hue oklch) por categoría. */
const CAT_STYLE: Record<string, { icon: LucideIcon; hue: number }> = {
  Almacén: { icon: Package, hue: 70 },
  Bebidas: { icon: CupSoda, hue: 240 },
  Frescos: { icon: Milk, hue: 200 },
  Limpieza: { icon: SprayCan, hue: 300 },
  Panadería: { icon: Croissant, hue: 45 },
};

function catStyle(category: string) {
  return CAT_STYLE[category] ?? { icon: ShoppingBasket, hue: 165 };
}

/** Reloj en vivo (vacío en el servidor para no romper la hidratación). */
function LiveClock() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);
  return (
    <span className="tabular">
      {now
        ? now.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
        : "--:--:--"}
    </span>
  );
}

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
  const [paymentMethod, setPaymentMethod] = useState<CheckoutPayload["paymentMethod"]>("efectivo");
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
        return prev.map((i) => (i.product.id === product.id ? { ...i, qty: i.qty + 1 } : i));
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
          <header
            className="sm-rise relative mb-5 overflow-hidden rounded-2xl bg-gradient-to-br from-panel via-panel to-primary p-5 text-panel-foreground shadow-panel sm:p-6"
            style={d(0)}
          >
            <div className="pointer-events-none absolute -top-16 -right-10 h-48 w-48 rounded-full bg-accent/30 blur-3xl" />
            <div className="relative flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-[11px] tracking-[0.25em] text-accent uppercase">
                  Punto de venta
                </p>
                <h1 className="mt-1 text-3xl font-bold sm:text-4xl">Caja</h1>
                <p className="mt-1 text-sm opacity-75">
                  Escaneá un código o tocá un producto para sumarlo al carrito.
                </p>
              </div>
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="inline-flex items-center gap-2 rounded-full border border-panel-foreground/15 bg-panel-foreground/10 px-3 py-1.5 backdrop-blur">
                  <span className="size-2 rounded-full bg-accent shadow-[0_0_8px_var(--color-accent)]" />
                  Caja 01 · Abierta
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-panel-foreground/15 bg-panel-foreground/10 px-3 py-1.5 backdrop-blur">
                  <Clock className="size-3.5" />
                  <LiveClock />
                </span>
              </div>
            </div>
          </header>

          <form onSubmit={handleScan} className="sm-rise mb-3 flex gap-2" style={d(1)}>
            <div className="relative flex-1 overflow-hidden rounded-md">
              <span className="sm-laser" />
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

          <div className="sm-rise mb-3 flex flex-col gap-2 sm:flex-row" style={d(2)}>
            <div className="relative flex-1">
              <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar producto"
                className="pl-9"
              />
            </div>
          </div>

          <div className="sm-rise -mx-1 mb-5 flex gap-2 overflow-x-auto px-1 pb-1" style={d(2)}>
            {(["todas", ...CATEGORIES] as string[]).map((c) => {
              const active = category === c;
              const st = c === "todas" ? { icon: LayoutGrid, hue: 165 } : catStyle(c);
              const Icon = st.icon;
              const count =
                c === "todas" ? products.length : products.filter((p) => p.category === c).length;
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategory(c)}
                  className={`inline-flex shrink-0 items-center gap-2 rounded-full border py-1.5 pr-3 pl-1.5 text-sm font-medium transition-all duration-300 ${
                    active
                      ? "border-panel bg-panel text-panel-foreground shadow-panel"
                      : "border-border bg-card/80 text-foreground hover:-translate-y-0.5 hover:border-primary/50"
                  }`}
                >
                  <span
                    className="grid size-7 place-items-center rounded-full"
                    style={{
                      background: active ? "var(--color-accent)" : `oklch(0.95 0.04 ${st.hue})`,
                      color: active
                        ? "var(--color-accent-foreground)"
                        : `oklch(0.45 0.12 ${st.hue})`,
                    }}
                  >
                    <Icon className="size-3.5" />
                  </span>
                  {c === "todas" ? "Todas" : c}
                  <span
                    className={`text-xs tabular ${active ? "opacity-70" : "text-muted-foreground"}`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {isLoading ? (
            <p className="text-sm text-muted-foreground">Cargando productos…</p>
          ) : (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
              {filtered.map((p, i) => (
                <div key={p.id} className="sm-rise" style={d(3 + Math.min(i, 12))}>
                  <button
                    onClick={() => addToCart(p)}
                    disabled={p.stock === 0}
                    className="sm-card group flex h-full w-full flex-col rounded-2xl border border-border bg-card/90 p-4 text-left backdrop-blur disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {(() => {
                      const st = catStyle(p.category);
                      const Icon = st.icon;
                      const low = p.stock > 0 && p.stock <= LOW_STOCK_THRESHOLD;
                      const pct = Math.min(100, (p.stock / 80) * 100);
                      return (
                        <>
                          <div className="flex items-center justify-between">
                            <span
                              className="grid size-10 place-items-center rounded-xl transition-transform duration-500 group-hover:scale-110 group-hover:-rotate-6"
                              style={{
                                background: `linear-gradient(135deg, oklch(0.95 0.05 ${st.hue}), oklch(0.88 0.08 ${st.hue}))`,
                                color: `oklch(0.42 0.13 ${st.hue})`,
                              }}
                            >
                              <Icon className="size-5" />
                            </span>
                            <span className="text-[10px] font-medium tracking-wider text-muted-foreground uppercase">
                              {p.category}
                            </span>
                          </div>
                          <span className="mt-3 line-clamp-2 text-sm leading-snug font-semibold">
                            {p.name}
                          </span>
                          <span className="mt-auto pt-3 font-display text-xl font-bold tabular transition-colors group-hover:text-primary">
                            {money(p.price)}
                          </span>
                          <div className="mt-2 h-1 overflow-hidden rounded-full bg-muted">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${pct}%`,
                                background:
                                  p.stock === 0
                                    ? "var(--color-destructive)"
                                    : low
                                      ? "var(--color-warning)"
                                      : "var(--color-success)",
                              }}
                            />
                          </div>
                          <span
                            className={`mt-1 text-[11px] ${
                              p.stock === 0
                                ? "text-destructive"
                                : low
                                  ? "text-warning-foreground"
                                  : "text-muted-foreground"
                            }`}
                          >
                            {p.stock === 0
                              ? "Sin stock"
                              : low
                                ? `¡Quedan ${p.stock} ${p.unit}!`
                                : `Stock ${p.stock} ${p.unit}`}
                          </span>
                        </>
                      );
                    })()}
                    <span className="sm-plus">
                      <Plus className="size-4" />
                    </span>
                  </button>
                </div>
              ))}
              {filtered.length === 0 && (
                <p className="text-sm text-muted-foreground">Sin resultados.</p>
              )}
            </div>
          )}
        </section>

        {/* ---------------- Carrito / cobro ---------------- */}
        <aside className="sm-rise lg:sticky lg:top-6 lg:h-fit" style={d(3)}>
          <div className="sm-receipt flex flex-col overflow-hidden rounded-t-3xl border border-border bg-card shadow-panel">
            <div className="relative flex items-center justify-between overflow-hidden bg-gradient-to-r from-panel to-primary px-5 py-4 text-panel-foreground">
              <div className="pointer-events-none absolute -top-10 right-10 h-24 w-24 rounded-full bg-accent/25 blur-2xl" />
              <h2 className="relative flex items-center gap-2 text-base font-semibold">
                <span className="grid size-8 place-items-center rounded-lg bg-accent text-accent-foreground">
                  <Receipt className="size-4" />
                </span>
                Ticket actual
              </h2>
              <Badge key={units} variant="secondary" className="sm-bump">
                {units} u.
              </Badge>
            </div>

            <ul className="max-h-[38vh] divide-y divide-border overflow-y-auto">
              {cart.length === 0 && (
                <li className="flex flex-col items-center gap-3 p-8 text-center text-sm text-muted-foreground">
                  <span className="sm-float grid size-14 place-items-center rounded-2xl border-2 border-dashed border-border text-primary">
                    <ShoppingBasket className="size-6" />
                  </span>
                  El carrito está vacío.
                  <span className="text-xs">Escaneá o tocá un producto para empezar.</span>
                </li>
              )}
              {cart.map(({ product, qty }) => (
                <li key={product.id} className="sm-item-in flex items-center gap-2 p-3">
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
                    <span key={qty} className="sm-bump w-6 text-center text-sm tabular">
                      {qty}
                    </span>
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

              <div className="grid grid-cols-4 gap-2">
                {(
                  [
                    ["efectivo", "Efectivo", "💵"],
                    ["debito", "Débito", "💳"],
                    ["credito", "Crédito", "🏦"],
                    ["qr", "QR", "📱"],
                  ] as [CheckoutPayload["paymentMethod"], string, string][]
                ).map(([v, label, emoji]) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setPaymentMethod(v)}
                    className={`flex flex-col items-center gap-1 rounded-xl border py-2 text-[11px] font-medium transition-all duration-300 ${
                      paymentMethod === v
                        ? "border-primary bg-primary/10 text-primary shadow-[0_0_0_3px_oklch(0.55_0.13_165/0.15)]"
                        : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                    }`}
                  >
                    <span className="text-lg leading-none">{emoji}</span>
                    {label}
                  </button>
                ))}
              </div>

              <div className="space-y-1 border-t border-border pt-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="tabular">{money(subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Descuento</span>
                  <span className="tabular">- {money(discountAmount)}</span>
                </div>
                <div className="mt-2 flex items-baseline justify-between rounded-xl bg-panel px-4 py-3 text-panel-foreground">
                  <span className="font-display text-sm font-bold tracking-widest opacity-80">
                    TOTAL
                  </span>
                  <span
                    key={total}
                    className="sm-bump font-display text-3xl font-bold text-accent tabular"
                  >
                    {money(total)}
                  </span>
                </div>
              </div>

              <Button
                variant="cobro"
                size="xl"
                className="sm-cta w-full"
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

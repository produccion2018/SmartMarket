import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Package, Pencil, Plus, Search, Trash2, TriangleAlert } from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { money } from "@/lib/format";
import { CATEGORIES, LOW_STOCK_THRESHOLD, type Product } from "@/data/products";
import {
  createProduct,
  deleteProduct,
  listProducts,
  updateProduct,
  type ProductInput,
} from "@/lib/api";

export const Route = createFileRoute("/inventario")({
  head: () => ({
    meta: [
      { title: "Inventario y stock — SmartMarket POS" },
      {
        name: "description",
        content:
          "Gestión de inventario de SmartMarket: alta, edición y baja de productos con alertas de stock bajo.",
      },
      { property: "og:title", content: "Inventario y stock — SmartMarket POS" },
      {
        property: "og:description",
        content: "Controlá precios, categorías y unidades disponibles de tu supermercado.",
      },
    ],
  }),
  component: InventarioPage,
});

const EMPTY: ProductInput = {
  barcode: "",
  name: "",
  category: "Almacén",
  price: 0,
  stock: 0,
  unit: "un",
};

function InventarioPage() {
  const queryClient = useQueryClient();

  // >>> API PYTHON: GET /api/products
  const { data: products = [], isLoading } = useQuery({
    queryKey: ["products"],
    queryFn: listProducts,
  });

  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState<ProductInput>(EMPTY);
  const [formOpen, setFormOpen] = useState(false);
  const [toDelete, setToDelete] = useState<Product | null>(null);

  const filtered = useMemo(
    () =>
      products.filter(
        (p) =>
          p.name.toLowerCase().includes(search.toLowerCase()) || p.barcode.includes(search),
      ),
    [products, search],
  );

  const stats = {
    items: products.length,
    low: products.filter((p) => p.stock > 0 && p.stock <= LOW_STOCK_THRESHOLD).length,
    out: products.filter((p) => p.stock === 0).length,
    value: products.reduce((a, p) => a + p.price * p.stock, 0),
  };

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["products"] });

  // >>> API PYTHON: POST /api/products  /  PUT /api/products/{id}
  const save = useMutation({
    mutationFn: () => (editing ? updateProduct(editing.id, form) : createProduct(form)),
    onSuccess: () => {
      toast.success(editing ? "Producto actualizado" : "Producto agregado");
      setFormOpen(false);
      invalidate();
    },
    onError: () => toast.error("No se pudo guardar el producto"),
  });

  // >>> API PYTHON: DELETE /api/products/{id}
  const remove = useMutation({
    mutationFn: (id: string) => deleteProduct(id),
    onSuccess: () => {
      toast.success("Producto eliminado");
      setToDelete(null);
      invalidate();
    },
    onError: () => toast.error("No se pudo eliminar el producto"),
  });

  function openNew() {
    setEditing(null);
    setForm(EMPTY);
    setFormOpen(true);
  }

  function openEdit(p: Product) {
    setEditing(p);
    const { id: _id, ...rest } = p;
    setForm(rest);
    setFormOpen(true);
  }

  return (
    <AppShell>
      <div className="space-y-5 p-4 lg:p-6">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Inventario</h1>
            <p className="text-sm text-muted-foreground">
              Alta, edición y baja de productos del supermercado.
            </p>
          </div>
          <Button variant="cobro" onClick={openNew}>
            <Plus /> Nuevo producto
          </Button>
        </header>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Stat icon={<Package className="size-4" />} label="Productos" value={String(stats.items)} />
          <Stat
            icon={<TriangleAlert className="size-4" />}
            label="Stock bajo"
            value={String(stats.low)}
          />
          <Stat icon={<TriangleAlert className="size-4" />} label="Sin stock" value={String(stats.out)} />
          <Stat icon={<Package className="size-4" />} label="Valor de stock" value={money(stats.value)} />
        </div>

        <div className="relative max-w-sm">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre o código"
            className="pl-9"
          />
        </div>

        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-panel">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted text-left text-xs tracking-wide text-muted-foreground uppercase">
                <tr>
                  <th className="px-4 py-3">Producto</th>
                  <th className="px-4 py-3">Código</th>
                  <th className="px-4 py-3">Categoría</th>
                  <th className="px-4 py-3 text-right">Precio</th>
                  <th className="px-4 py-3 text-right">Stock</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                      Cargando inventario…
                    </td>
                  </tr>
                )}
                {filtered.map((p) => (
                  <tr key={p.id} className="transition-colors hover:bg-muted/50">
                    <td className="px-4 py-3 font-medium">{p.name}</td>
                    <td className="px-4 py-3 text-muted-foreground tabular">{p.barcode}</td>
                    <td className="px-4 py-3">
                      <Badge variant="secondary">{p.category}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right tabular">{money(p.price)}</td>
                    <td className="px-4 py-3 text-right">
                      {p.stock === 0 ? (
                        <Badge variant="destructive">Sin stock</Badge>
                      ) : p.stock <= LOW_STOCK_THRESHOLD ? (
                        <Badge variant="outline" className="border-warning text-warning-foreground">
                          {p.stock} {p.unit} · bajo
                        </Badge>
                      ) : (
                        <span className="tabular">
                          {p.stock} {p.unit}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="outline" onClick={() => openEdit(p)}>
                          <Pencil />
                        </Button>
                        <Button size="icon" variant="destructive" onClick={() => setToDelete(p)}>
                          <Trash2 />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!isLoading && filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                      No hay productos que coincidan con la búsqueda.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* -------- Alta / edición -------- */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar producto" : "Nuevo producto"}</DialogTitle>
            <DialogDescription>
              Los datos se guardarán en la base SQLite3 cuando la API esté conectada.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3">
            <Field label="Nombre">
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Ej. Leche entera 1L"
              />
            </Field>
            <Field label="Código de barras">
              <Input
                value={form.barcode}
                onChange={(e) => setForm({ ...form, barcode: e.target.value })}
                placeholder="7790000000000"
              />
            </Field>
            <Field label="Categoría">
              <Select
                value={form.category}
                onValueChange={(v) => setForm({ ...form, category: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Precio">
                <Input
                  type="number"
                  min={0}
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: Number(e.target.value) || 0 })}
                />
              </Field>
              <Field label="Stock">
                <Input
                  type="number"
                  min={0}
                  value={form.stock}
                  onChange={(e) => setForm({ ...form, stock: Number(e.target.value) || 0 })}
                />
              </Field>
              <Field label="Unidad">
                <Select
                  value={form.unit}
                  onValueChange={(v) => setForm({ ...form, unit: v as Product["unit"] })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="un">Unidad</SelectItem>
                    <SelectItem value="kg">Kilo</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setFormOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="cobro"
              disabled={!form.name || !form.barcode || save.isPending}
              onClick={() => save.mutate()}
            >
              {save.isPending ? "Guardando…" : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* -------- Confirmación de baja -------- */}
      <Dialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Eliminar producto</DialogTitle>
            <DialogDescription>
              ¿Seguro que querés eliminar “{toDelete?.name}”? Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setToDelete(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={remove.isPending}
              onClick={() => toDelete && remove.mutate(toDelete.id)}
            >
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

function Stat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-xs tracking-wide text-muted-foreground uppercase">
        {icon}
        {label}
      </div>
      <p className="mt-2 font-display text-2xl font-bold tabular">{value}</p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1.5 text-sm font-medium">
      {label}
      {children}
    </label>
  );
}

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { money } from "@/lib/format";
import type { Sale } from "@/lib/api";
import { CheckCircle2, Printer } from "lucide-react";

/**
 * Ticket de la venta simulada.
 * >>> API PYTHON: los datos llegan de POST /api/sales (ver src/lib/api.ts).
 */
export function TicketDialog({
  sale,
  onClose,
}: {
  sale: Sale | null;
  onClose: () => void;
}) {
  return (
    <Dialog open={!!sale} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="size-5 text-success" />
            Venta registrada
          </DialogTitle>
        </DialogHeader>

        {sale && (
          <div className="rounded-lg border border-border bg-card p-4 font-mono text-xs shadow-ticket">
            <div className="text-center">
              <p className="font-display text-sm font-bold">SMARTMARKET</p>
              <p className="text-muted-foreground">Ticket N° {sale.ticketNumber}</p>
              <p className="text-muted-foreground">
                {new Date(sale.createdAt).toLocaleString("es-AR")}
              </p>
            </div>
            <div className="my-3 border-t border-dashed border-border" />
            <ul className="space-y-1">
              {sale.lines.map((l) => (
                <li key={l.productId} className="flex justify-between gap-2">
                  <span className="truncate">
                    {l.qty} × {l.name}
                  </span>
                  <span className="tabular">{money(l.unitPrice * l.qty)}</span>
                </li>
              ))}
            </ul>
            <div className="my-3 border-t border-dashed border-border" />
            <div className="space-y-1">
              <Row label="Subtotal" value={money(sale.subtotal)} />
              {sale.discountPercent > 0 && (
                <Row
                  label={`Descuento (${sale.discountPercent}%)`}
                  value={`- ${money(sale.discountAmount)}`}
                />
              )}
              <Row label="Medio de pago" value={sale.paymentMethod.toUpperCase()} />
              <div className="mt-2 flex justify-between border-t border-border pt-2 font-display text-base font-bold">
                <span>TOTAL</span>
                <span className="tabular">{money(sale.total)}</span>
              </div>
            </div>
            <p className="mt-4 text-center text-muted-foreground">¡Gracias por su compra!</p>
          </div>
        )}

        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={() => window.print()}>
            <Printer /> Imprimir
          </Button>
          <Button variant="cobro" className="flex-1" onClick={onClose}>
            Nueva venta
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="tabular">{value}</span>
    </div>
  );
}

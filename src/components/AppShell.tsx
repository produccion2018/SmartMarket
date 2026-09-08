import { Link } from "@tanstack/react-router";
import { ScanBarcode, Boxes, Store } from "lucide-react";

/**
 * Layout general del sistema: barra lateral de navegación + contenido.
 * (La sesión / usuario logueado saldrá del backend en el futuro.)
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-background">
      <aside className="sticky top-0 flex h-screen w-16 shrink-0 flex-col items-center gap-2 bg-panel py-4 text-panel-foreground md:w-56 md:items-stretch md:px-3">
        <div className="mb-4 flex items-center gap-2 px-1 md:px-2">
          <span className="flex size-9 items-center justify-center rounded-lg bg-accent text-accent-foreground">
            <Store className="size-5" />
          </span>
          <div className="hidden md:block">
            <p className="font-display text-sm leading-tight font-bold">SmartMarket</p>
            <p className="text-[11px] opacity-70">POS v1.0</p>
          </div>
        </div>

        <NavItem to="/" icon={<ScanBarcode className="size-5" />} label="Caja" />
        <NavItem to="/inventario" icon={<Boxes className="size-5" />} label="Inventario" />

        <div className="mt-auto hidden rounded-lg bg-panel-foreground/10 p-3 text-[11px] leading-relaxed opacity-80 md:block">
          Terminal 01 · Cajero demo
          <br />
          Backend Python pendiente
        </div>
      </aside>

      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}

function NavItem({
  to,
  icon,
  label,
}: {
  to: "/" | "/inventario";
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <Link
      to={to}
      className="flex items-center justify-center gap-3 rounded-lg px-2 py-2.5 text-sm font-medium opacity-70 transition-colors hover:bg-panel-foreground/10 hover:opacity-100 md:justify-start"
      activeProps={{ className: "bg-panel-foreground/15 opacity-100" }}
      activeOptions={{ exact: to === "/" }}
    >
      {icon}
      <span className="hidden md:inline">{label}</span>
    </Link>
  );
}

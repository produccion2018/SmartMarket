import { useEffect, type CSSProperties } from "react";
import { Link } from "@tanstack/react-router";
import { ScanBarcode, Boxes, Store, Check } from "lucide-react";

/** Anchos de las barras del código de la intro (decorativo). */
const BARS = [3, 1, 2, 1, 3, 2, 1, 1, 3, 1, 2, 3, 1, 2, 1, 3, 1, 2, 2, 1, 3];

/** Intro con escáner: solo se ve en la primera carga, no al navegar entre páginas. */
function Intro() {
  return (
    <div className="sm-intro" aria-hidden="true">
      <div className="flex flex-col items-center gap-5">
        <div className="sm-barcode">
          {BARS.map((w, i) => (
            <i key={i} style={{ width: w * 3, "--i": i } as CSSProperties} />
          ))}
        </div>
        <div className="flex items-center gap-3">
          <span className="font-display text-3xl font-bold tracking-tight">
            {"SmartMarket".split("").map((ch, i) => (
              <span
                key={i}
                className={`sm-letter ${i >= 5 ? "text-accent" : ""}`}
                style={{ "--i": i } as CSSProperties}
              >
                {ch}
              </span>
            ))}
          </span>
          <span className="sm-beep flex size-7 items-center justify-center rounded-full bg-success text-success-foreground">
            <Check className="size-4" />
          </span>
        </div>
        <p
          className="sm-letter text-xs tracking-[0.3em] uppercase opacity-70"
          style={{ "--i": 12 } as CSSProperties}
        >
          Punto de venta
        </p>
      </div>
    </div>
  );
}

/**
 * Layout general del sistema: barra lateral de navegación + contenido.
 * (La sesión / usuario logueado saldrá del backend en el futuro.)
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const root = document.documentElement;
    if (root.classList.contains("sm-ready")) return;
    const t = window.setTimeout(() => root.classList.add("sm-ready"), 2500);
    return () => window.clearTimeout(t);
  }, []);

  return (
    <div className="relative flex min-h-screen bg-background">
      <Intro />

      <div className="sm-blobs">
        <span
          style={{
            top: "-15%",
            right: "-5%",
            width: "40vw",
            height: "40vw",
            background: "var(--color-primary)",
          }}
        />
        <span
          style={{
            bottom: "-20%",
            left: "10%",
            width: "35vw",
            height: "35vw",
            background: "var(--color-accent)",
            animationDelay: "-9s",
          }}
        />
      </div>

      <aside className="sm-slide sticky top-0 z-10 flex h-screen w-16 shrink-0 flex-col items-center gap-2 bg-panel py-4 text-panel-foreground md:w-56 md:items-stretch md:px-3">
        <div className="mb-4 flex items-center gap-2 px-1 md:px-2">
          <span className="sm-logo flex size-9 items-center justify-center rounded-lg bg-accent text-accent-foreground">
            <Store className="size-5" />
          </span>
          <div className="hidden md:block">
            <p className="font-display text-sm leading-tight font-bold">SmartMarket</p>
            <p className="text-[11px] opacity-70">POS v1.0</p>
          </div>
        </div>

        <NavItem to="/" icon={<ScanBarcode className="size-5" />} label="Caja" />
        <NavItem to="/inventario" icon={<Boxes className="size-5" />} label="Inventario" />
      </aside>

      <main className="relative z-[1] min-w-0 flex-1">{children}</main>
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
      className="group relative flex items-center justify-center gap-3 rounded-lg px-2 py-2.5 text-sm font-medium opacity-70 transition-all duration-300 hover:bg-panel-foreground/10 hover:opacity-100 md:justify-start md:hover:pl-3"
      activeProps={{
        className: "bg-panel-foreground/15 opacity-100 shadow-[inset_3px_0_0_var(--color-accent)]",
      }}
      activeOptions={{ exact: to === "/" }}
    >
      <span className="transition-transform duration-300 group-hover:scale-110">{icon}</span>
      <span className="hidden md:inline">{label}</span>
    </Link>
  );
}

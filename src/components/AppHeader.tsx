import { ChevronDown, Check } from "lucide-react";
import { useState } from "react";
import { usePersona } from "@/context/PersonaContext";
import { Link } from "react-router-dom";

export function AppHeader({ showBack = false, title }: { showBack?: boolean; title?: string }) {
  const { current, all, setPersonaId } = usePersona();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="container-mobile flex h-14 items-center justify-between">
        <div className="flex items-center gap-2">
          {showBack ? (
            <Link
              to="/dashboard"
              className="tap-target -ml-2 flex items-center justify-center rounded-md text-foreground hover:bg-muted"
              aria-label="Voltar"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </Link>
          ) : null}
          <Link to="/dashboard" className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <span className="text-sm font-bold">E</span>
            </div>
            <span className="text-base font-semibold tracking-tight text-primary">
              {title ?? "EmpowerFI"}
            </span>
          </Link>
        </div>

        <div className="relative">
          <button
            onClick={() => setOpen((o) => !o)}
            className="tap-target flex items-center gap-2 rounded-full pr-1 hover:bg-muted"
            aria-label="Trocar persona"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-accent-foreground text-sm font-semibold">
              {current.initials}
            </div>
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </button>

          {open ? (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
              <div className="absolute right-0 z-20 mt-2 w-64 origin-top-right rounded-lg border border-border bg-card shadow-lg animate-scale-in">
                <div className="border-b border-border px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Trocar persona (demo)
                </div>
                <ul className="py-1">
                  {all.map((p) => (
                    <li key={p.id}>
                      <button
                        onClick={() => {
                          setPersonaId(p.id);
                          setOpen(false);
                        }}
                        className="flex w-full items-center gap-3 px-3 py-3 text-left hover:bg-muted"
                      >
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-secondary-foreground text-sm font-semibold">
                          {p.initials}
                        </div>
                        <div className="flex-1">
                          <div className="text-sm font-medium text-foreground">{p.name}</div>
                          <div className="text-xs text-muted-foreground">{p.business} · {p.city}</div>
                        </div>
                        {p.id === current.id ? <Check className="h-4 w-4 text-success" /> : null}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </header>
  );
}

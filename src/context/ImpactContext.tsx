import { createContext, useContext, useState, type ReactNode } from "react";

type ImpactContextValue = {
  hiredThisMonth: number;
  registerHire: () => void;
};

const ImpactContext = createContext<ImpactContextValue | null>(null);

export function ImpactProvider({ children }: { children: ReactNode }) {
  const [hiredThisMonth, setHired] = useState(0);
  return (
    <ImpactContext.Provider
      value={{ hiredThisMonth, registerHire: () => setHired((n) => n + 1) }}
    >
      {children}
    </ImpactContext.Provider>
  );
}

export function useImpact() {
  const ctx = useContext(ImpactContext);
  if (!ctx) throw new Error("useImpact must be used within ImpactProvider");
  return ctx;
}

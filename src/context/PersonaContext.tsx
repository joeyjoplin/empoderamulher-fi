import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { defaultPersonaId, personas, type Persona } from "@/data/personas";

type PersonaContextValue = {
  current: Persona;
  setPersonaId: (id: string) => void;
  all: Persona[];
};

const PersonaContext = createContext<PersonaContextValue | null>(null);

export function PersonaProvider({ children }: { children: ReactNode }) {
  const [personaId, setPersonaId] = useState<string>(defaultPersonaId);

  const value = useMemo<PersonaContextValue>(() => {
    const current = personas.find((p) => p.id === personaId) ?? personas[0];
    return { current, setPersonaId, all: personas };
  }, [personaId]);

  return <PersonaContext.Provider value={value}>{children}</PersonaContext.Provider>;
}

export function usePersona() {
  const ctx = useContext(PersonaContext);
  if (!ctx) throw new Error("usePersona must be used within PersonaProvider");
  return ctx;
}

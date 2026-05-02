import type { Persona } from "../types/domain.js";

export interface PersonaService {
  findById(id: string): Promise<Persona | null>;
}

export class InMemoryPersonaService implements PersonaService {
  private readonly byId: Map<string, Persona>;

  constructor(initial: Persona[]) {
    this.byId = new Map(initial.map((p) => [p.id, p]));
  }

  async findById(id: string): Promise<Persona | null> {
    return this.byId.get(id) ?? null;
  }
}

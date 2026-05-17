import { vi } from "vitest";

import type {
  MarketplaceRepository,
  MarketplaceService,
} from "../../src/services/marketplace.js";

export function makeMarketplaceStub(
  overrides: Partial<MarketplaceService> = {},
): MarketplaceService {
  return {
    hireProvider: vi.fn(),
    quoteBnpl: vi.fn(),
    hireBnpl: vi.fn(),
    recordInstallment: vi.fn(),
    ...overrides,
  };
}

export function makeMarketplaceRepoStub(
  overrides: Partial<MarketplaceRepository> = {},
): MarketplaceRepository {
  return {
    save: vi.fn().mockResolvedValue(undefined),
    countHiresByBuyer: vi.fn().mockResolvedValue(0),
    saveBnplPlan: vi.fn().mockResolvedValue(undefined),
    findBnplPlanById: vi.fn().mockResolvedValue(null),
    updateBnplPlan: vi.fn().mockResolvedValue(undefined),
    listBnplPlansByBuyer: vi.fn().mockResolvedValue([]),
    ...overrides,
  };
}

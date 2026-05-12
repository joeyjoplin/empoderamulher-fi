/**
 * Mocked aggregate metrics for the public impact dashboard.
 *
 * The MVP doesn't have a real cohort yet, so the hero numbers, geography,
 * and tokenization figures are calibrated to "plausible scale" for the
 * pitch. The on-chain transaction list (`recentTransactions` on the API
 * response) is sourced from the real `impact_events` table — only these
 * static aggregates live here.
 *
 * All monetary values are in cents to match the rest of the API surface.
 */

export const IMPACT_MOCK = {
  activeEntrepreneurs: 1247,
  interestSavedCents: 18_432_000,
  debtsRenegotiatedCents: 9_250_000,
  marketplaceTransactionsBaseline: 318,
  monthOverMonth: {
    entrepreneurs: 8,
    interest: 12,
    debts: 15,
    marketplace: 22,
  },
  poolTotalCents: 240_000_000,
  yieldDistributedCents: 1_864_000,
  qualifiedInvestors: 47,
  cityDistribution: [
    { city: "São Paulo", count: 287, lat: -23.55, lng: -46.63 },
    { city: "Rio de Janeiro", count: 156, lat: -22.91, lng: -43.17 },
    { city: "Salvador", count: 124, lat: -12.97, lng: -38.5 },
    { city: "Belo Horizonte", count: 98, lat: -19.92, lng: -43.94 },
    { city: "Recife", count: 87, lat: -8.05, lng: -34.88 },
    { city: "Fortaleza", count: 76, lat: -3.73, lng: -38.52 },
    { city: "Brasília", count: 65, lat: -15.79, lng: -47.88 },
  ],
} as const;

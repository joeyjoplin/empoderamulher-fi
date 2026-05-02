import {
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const personas = pgTable("personas", {
  id: uuid("id").primaryKey(),
  name: text("name").notNull(),
  businessType: text("business_type").notNull(),
  city: text("city"),
  monthlyRevenueAvg: numeric("monthly_revenue_avg", {
    precision: 12,
    scale: 2,
  }).notNull(),
  stage: integer("stage").notNull(),
  walletPubkey: text("wallet_pubkey"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

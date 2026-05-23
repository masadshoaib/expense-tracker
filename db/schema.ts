import { sqliteTable, text, real, integer } from "drizzle-orm/sqlite-core";

export const expenses = sqliteTable("expenses", {
  id:            text("id").primaryKey(),
  amount:        real("amount").notNull(),
  date:          text("date").notNull(),
  description:   text("description").notNull(),
  category:      text("category").notNull(),
  notes:         text("notes").notNull().default(""),
  captureMethod: text("capture_method").notNull(),
  receiptPath:   text("receipt_path"),
  createdAt:     text("created_at").notNull(),
  updatedAt:     text("updated_at").notNull(),
});

export const userPreferences = sqliteTable("user_preferences", {
  id:                   text("id").primaryKey(),
  currencyCode:         text("currency_code").notNull().default("USD"),
  budgetFood:           real("budget_food"),
  budgetTransport:      real("budget_transport"),
  budgetEntertainment:  real("budget_entertainment"),
  budgetShopping:       real("budget_shopping"),
  budgetBills:          real("budget_bills"),
  budgetOther:          real("budget_other"),
  confirmAiInput:       integer("confirm_ai_input", { mode: "boolean" }).notNull().default(true),
  createdAt:            text("created_at").notNull(),
  updatedAt:            text("updated_at").notNull(),
});

export type ExpenseRow = typeof expenses.$inferSelect;
export type UserPreferencesRow = typeof userPreferences.$inferSelect;

ALTER TABLE "budget_items" ADD COLUMN "is_draft" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "income_targets" DROP CONSTRAINT IF EXISTS "income_targets_budget_id_year_month_unique";

ALTER TABLE "budget_items" ADD COLUMN "amount_paid" real DEFAULT 0 NOT NULL;--> statement-breakpoint
UPDATE "budget_items" SET "amount_paid" = "amount" WHERE "paid" = true;

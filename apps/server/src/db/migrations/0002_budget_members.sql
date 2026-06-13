CREATE TABLE `budget_members` (
	`id` text PRIMARY KEY NOT NULL,
	`budget_id` text NOT NULL,
	`user_id` text,
	`email` text NOT NULL,
	`role` text DEFAULT 'member' NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`invited_by` text NOT NULL,
	`token` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`budget_id`) REFERENCES `budgets`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`invited_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `budget_members_token_unique` ON `budget_members` (`token`);--> statement-breakpoint
CREATE UNIQUE INDEX `budget_members_budget_id_email_unique` ON `budget_members` (`budget_id`,`email`);

CREATE TABLE IF NOT EXISTS `customer_notes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`customer_phone` text NOT NULL,
	`status` text DEFAULT 'new' NOT NULL,
	`car_models` text DEFAULT '' NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`admin_id` integer,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`admin_id`) REFERENCES `admins`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `customer_notes_customer_phone_unique` ON `customer_notes` (`customer_phone`);

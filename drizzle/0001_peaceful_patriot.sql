CREATE TABLE `chat_tokens` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`conversation_id` integer NOT NULL,
	`token` text NOT NULL,
	`expires_at` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`conversation_id`) REFERENCES `conversations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `chat_tokens_token_unique` ON `chat_tokens` (`token`);--> statement-breakpoint
CREATE TABLE `push_subscriptions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`admin_id` integer NOT NULL,
	`endpoint` text NOT NULL,
	`keys_json` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`admin_id`) REFERENCES `admins`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
ALTER TABLE `conversations` ADD `assigned_admin_id` integer REFERENCES admins(id);--> statement-breakpoint
ALTER TABLE `conversations` ADD `last_message_at` text;--> statement-breakpoint
ALTER TABLE `conversations` ADD `unread_count` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `messages` ADD `read_at` text;
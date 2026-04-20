ALTER TABLE `products` ADD `hidden` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE INDEX `products_hidden_idx` ON `products` (`hidden`);

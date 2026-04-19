ALTER TABLE `products` ADD `slug` text DEFAULT '' NOT NULL;--> statement-breakpoint
UPDATE `products` SET `slug` = `sku` WHERE `slug` = '';--> statement-breakpoint
CREATE UNIQUE INDEX `products_slug_unique` ON `products` (`slug`);
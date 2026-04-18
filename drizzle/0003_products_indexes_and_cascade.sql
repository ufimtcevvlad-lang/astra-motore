-- 1) Dedupe products.sku before adding unique index: rename duplicates by appending "-dup<id>"
UPDATE products
SET sku = sku || '-dup' || id
WHERE id NOT IN (
  SELECT MIN(id) FROM products GROUP BY sku
);
--> statement-breakpoint
-- 2) Add unique + lookup indexes on products
CREATE UNIQUE INDEX `products_sku_unique` ON `products` (`sku`);--> statement-breakpoint
CREATE INDEX `products_brand_idx` ON `products` (`brand`);--> statement-breakpoint
CREATE INDEX `products_category_idx` ON `products` (`category_id`);--> statement-breakpoint
CREATE INDEX `products_updated_idx` ON `products` (`updated_at`);--> statement-breakpoint
-- 3) Rebuild product_views with ON DELETE CASCADE for safe product deletion
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_product_views` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `product_id` integer NOT NULL,
  `date` text NOT NULL,
  `view_count` integer DEFAULT 0 NOT NULL,
  FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE cascade
);--> statement-breakpoint
INSERT INTO `__new_product_views` (`id`, `product_id`, `date`, `view_count`)
  SELECT `id`, `product_id`, `date`, `view_count` FROM `product_views`;--> statement-breakpoint
DROP TABLE `product_views`;--> statement-breakpoint
ALTER TABLE `__new_product_views` RENAME TO `product_views`;--> statement-breakpoint
PRAGMA foreign_keys=ON;

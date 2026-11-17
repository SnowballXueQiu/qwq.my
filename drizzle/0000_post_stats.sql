CREATE TABLE `post_likes` (
	`slug` text NOT NULL,
	`visitor` text NOT NULL,
	`created_at` integer NOT NULL,
	PRIMARY KEY(`slug`, `visitor`)
);
--> statement-breakpoint
CREATE TABLE `post_stats` (
	`slug` text PRIMARY KEY NOT NULL,
	`views` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `post_views` (
	`slug` text NOT NULL,
	`visitor` text NOT NULL,
	`day` text NOT NULL,
	PRIMARY KEY(`slug`, `visitor`, `day`)
);
--> statement-breakpoint
CREATE INDEX `post_views_day` ON `post_views` (`day`);
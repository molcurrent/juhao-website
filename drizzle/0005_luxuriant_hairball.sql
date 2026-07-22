CREATE TABLE `analytics_daily_counts` (
	`event_date` text NOT NULL,
	`event_name` text NOT NULL,
	`direction` text DEFAULT '' NOT NULL,
	`source` text DEFAULT '' NOT NULL,
	`content_id` text DEFAULT '' NOT NULL,
	`depth` text DEFAULT '' NOT NULL,
	`event_count` integer DEFAULT 0 NOT NULL,
	`updated_at` text NOT NULL,
	`expires_at` text NOT NULL,
	PRIMARY KEY(`event_date`, `event_name`, `direction`, `source`, `content_id`, `depth`)
);
--> statement-breakpoint
CREATE INDEX `analytics_daily_counts_expires_at_idx` ON `analytics_daily_counts` (`expires_at`);
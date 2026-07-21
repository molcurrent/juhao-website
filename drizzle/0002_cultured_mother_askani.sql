CREATE TABLE `consultation_rate_limits` (
	`key_hash` text PRIMARY KEY NOT NULL,
	`window_started_at` text NOT NULL,
	`request_count` integer DEFAULT 1 NOT NULL,
	`expires_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `consultation_rate_limits_expires_at_idx` ON `consultation_rate_limits` (`expires_at`);
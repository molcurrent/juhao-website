ALTER TABLE `consultation_leads` ADD `notification_last_attempt_at` text;--> statement-breakpoint
ALTER TABLE `consultation_leads` ADD `notification_next_attempt_at` text;--> statement-breakpoint
CREATE INDEX `consultation_leads_notification_retry_idx` ON `consultation_leads` (`notification_status`,`notification_next_attempt_at`);
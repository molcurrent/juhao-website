CREATE TABLE `consultation_leads` (
	`id` text PRIMARY KEY NOT NULL,
	`client_request_id` text NOT NULL,
	`request_hash` text NOT NULL,
	`direction` text NOT NULL,
	`source` text NOT NULL,
	`source_detail` text,
	`scene` text NOT NULL,
	`intent` text NOT NULL,
	`project` text NOT NULL,
	`stage` text NOT NULL,
	`need` text NOT NULL,
	`contact_name` text NOT NULL,
	`contact_channel` text NOT NULL,
	`contact_value` text NOT NULL,
	`privacy_version` text NOT NULL,
	`consent_at` text NOT NULL,
	`status` text DEFAULT 'received' NOT NULL,
	`notification_status` text DEFAULT 'not_configured' NOT NULL,
	`notification_attempts` integer DEFAULT 0 NOT NULL,
	`notification_last_error` text,
	`created_at` text NOT NULL,
	`expires_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `consultation_leads_client_request_id_unique` ON `consultation_leads` (`client_request_id`);--> statement-breakpoint
CREATE INDEX `consultation_leads_created_at_idx` ON `consultation_leads` (`created_at`);--> statement-breakpoint
CREATE INDEX `consultation_leads_notification_status_idx` ON `consultation_leads` (`notification_status`);
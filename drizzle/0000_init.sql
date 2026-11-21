CREATE TABLE `check_ins` (
	`id` text PRIMARY KEY NOT NULL,
	`episode_id` text NOT NULL,
	`date` text NOT NULL,
	`answers` text NOT NULL,
	`authored_by` text NOT NULL,
	`created_at` text NOT NULL,
	`reviewed_at` text,
	`reviewed_by` text,
	`seed` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`episode_id`) REFERENCES `episodes`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `episodes` (
	`id` text PRIMARY KEY NOT NULL,
	`patient_id` text NOT NULL,
	`patient_name` text NOT NULL,
	`protocol_id` text NOT NULL,
	`start_date` text NOT NULL,
	`end_date` text NOT NULL,
	`created_at` text NOT NULL,
	`seed` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE `flags` (
	`id` text PRIMARY KEY NOT NULL,
	`episode_id` text NOT NULL,
	`source_type` text NOT NULL,
	`source_id` text NOT NULL,
	`rule_id` text NOT NULL,
	`severity` text NOT NULL,
	`quote` text NOT NULL,
	`created_at` text NOT NULL,
	`resolved_at` text,
	`seed` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`episode_id`) REFERENCES `episodes`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `logs` (
	`id` text PRIMARY KEY NOT NULL,
	`episode_id` text NOT NULL,
	`type` text NOT NULL,
	`source` text,
	`text` text,
	`media_url` text,
	`extracted` text NOT NULL,
	`authored_by` text NOT NULL,
	`created_at` text NOT NULL,
	`reviewed_at` text,
	`seed` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`episode_id`) REFERENCES `episodes`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `messages` (
	`id` text PRIMARY KEY NOT NULL,
	`episode_id` text NOT NULL,
	`from_user_id` text NOT NULL,
	`from_name` text NOT NULL,
	`body` text NOT NULL,
	`created_at` text NOT NULL,
	`read_at` text,
	`ref_type` text,
	`ref_id` text,
	`seed` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`episode_id`) REFERENCES `episodes`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);

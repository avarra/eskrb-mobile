CREATE TABLE `message_reads` (
	`message_id` text PRIMARY KEY NOT NULL,
	`read_at` text NOT NULL
);
--> statement-breakpoint
DROP TABLE `check_ins`;--> statement-breakpoint
DROP TABLE `flags`;--> statement-breakpoint
DROP TABLE `logs`;--> statement-breakpoint
DROP TABLE `messages`;--> statement-breakpoint
DROP TABLE `episodes`;

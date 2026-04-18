CREATE TABLE `internal_notes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orgId` int NOT NULL,
	`leadId` int NOT NULL,
	`authorId` int NOT NULL,
	`body` text NOT NULL,
	`mentionedUserIds` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `internal_notes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `leads` ADD `assignedToId` int;
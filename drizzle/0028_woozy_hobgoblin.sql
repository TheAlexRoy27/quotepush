CREATE TABLE `dnc_numbers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orgId` int NOT NULL,
	`phoneNormalized` varchar(20) NOT NULL,
	`areaCode` varchar(3),
	`uploadedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `dnc_numbers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `leads` ADD `dncFlagged` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `leads` ADD `dncCheckedAt` timestamp;
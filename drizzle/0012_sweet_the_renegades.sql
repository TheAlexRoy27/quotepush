CREATE TABLE `template_folders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orgId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`icon` varchar(64) NOT NULL DEFAULT 'Folder',
	`color` varchar(64) NOT NULL DEFAULT 'blue',
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `template_folders_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `flow_templates` ADD `folderId` int;
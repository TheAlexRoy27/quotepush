CREATE TABLE `bot_configs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orgId` int NOT NULL,
	`enabled` boolean NOT NULL DEFAULT false,
	`botName` varchar(100) NOT NULL DEFAULT 'Alex',
	`tone` enum('friendly','professional','casual','empathetic','direct') NOT NULL DEFAULT 'friendly',
	`identity` text,
	`customInstructions` text,
	`maxRepliesPerLead` int NOT NULL DEFAULT 5,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `bot_configs_id` PRIMARY KEY(`id`),
	CONSTRAINT `bot_configs_orgId_unique` UNIQUE(`orgId`)
);

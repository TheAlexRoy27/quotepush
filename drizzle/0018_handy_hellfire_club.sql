CREATE TABLE `appointments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orgId` int NOT NULL,
	`leadId` int NOT NULL,
	`token` varchar(64) NOT NULL,
	`agentName` varchar(255) NOT NULL,
	`agentNote` text,
	`availableSlots` text NOT NULL,
	`bookedSlot` varchar(64),
	`status` enum('pending','booked','cancelled') NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `appointments_id` PRIMARY KEY(`id`),
	CONSTRAINT `appointments_token_unique` UNIQUE(`token`)
);

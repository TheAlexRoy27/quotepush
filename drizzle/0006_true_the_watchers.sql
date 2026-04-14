CREATE TABLE `drip_sequences` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orgId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`triggerCategory` enum('Interested','Wants More Info') NOT NULL,
	`isActive` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `drip_sequences_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `drip_steps` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sequenceId` int NOT NULL,
	`stepNumber` int NOT NULL,
	`delayDays` int NOT NULL DEFAULT 3,
	`name` varchar(255) NOT NULL,
	`body` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `drip_steps_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `lead_drip_enrollments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`leadId` int NOT NULL,
	`orgId` int NOT NULL,
	`sequenceId` int NOT NULL,
	`currentStep` int NOT NULL DEFAULT 1,
	`status` enum('active','paused','completed','stopped') NOT NULL DEFAULT 'active',
	`enrolledAt` timestamp NOT NULL DEFAULT (now()),
	`nextSendAt` timestamp NOT NULL,
	`lastSentAt` timestamp,
	`stoppedReason` varchar(64),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `lead_drip_enrollments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `flow_rules` MODIFY COLUMN `category` enum('Interested','Not Interested','Wants More Info','Unsubscribe') NOT NULL;--> statement-breakpoint
ALTER TABLE `flow_templates` MODIFY COLUMN `category` enum('Interested','Not Interested','Wants More Info','Unsubscribe') NOT NULL;--> statement-breakpoint
ALTER TABLE `message_classifications` MODIFY COLUMN `category` enum('Interested','Not Interested','Wants More Info','Unsubscribe') NOT NULL;
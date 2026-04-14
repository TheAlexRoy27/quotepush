CREATE TABLE `flow_rules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`category` enum('Interested','Not Interested','Wants More Info','Already a Customer','Unsubscribe','Other') NOT NULL,
	`templateId` int,
	`autoSend` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `flow_rules_id` PRIMARY KEY(`id`),
	CONSTRAINT `flow_rules_category_unique` UNIQUE(`category`)
);
--> statement-breakpoint
CREATE TABLE `flow_templates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`category` enum('Interested','Not Interested','Wants More Info','Already a Customer','Unsubscribe','Other') NOT NULL,
	`body` text NOT NULL,
	`isActive` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `flow_templates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `message_classifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`messageId` int NOT NULL,
	`category` enum('Interested','Not Interested','Wants More Info','Already a Customer','Unsubscribe','Other') NOT NULL,
	`confidence` varchar(16),
	`classifiedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `message_classifications_id` PRIMARY KEY(`id`),
	CONSTRAINT `message_classifications_messageId_unique` UNIQUE(`messageId`)
);

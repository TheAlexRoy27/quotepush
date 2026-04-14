CREATE TABLE `email_credentials` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`email` varchar(320) NOT NULL,
	`passwordHash` varchar(255) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `email_credentials_id` PRIMARY KEY(`id`),
	CONSTRAINT `email_credentials_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE TABLE `org_members` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orgId` int NOT NULL,
	`userId` int NOT NULL,
	`role` enum('owner','admin','member') NOT NULL DEFAULT 'member',
	`inviteToken` varchar(128),
	`inviteEmail` varchar(320),
	`invitePhone` varchar(32),
	`inviteAccepted` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `org_members_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `org_twilio_configs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orgId` int NOT NULL,
	`accountSid` varchar(64) NOT NULL,
	`authToken` varchar(64) NOT NULL,
	`phoneNumber` varchar(32) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `org_twilio_configs_id` PRIMARY KEY(`id`),
	CONSTRAINT `org_twilio_configs_orgId_unique` UNIQUE(`orgId`)
);
--> statement-breakpoint
CREATE TABLE `organizations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`slug` varchar(128) NOT NULL,
	`plan` enum('base','elite') NOT NULL DEFAULT 'base',
	`stripeCustomerId` varchar(64),
	`stripeSubscriptionId` varchar(64),
	`subscriptionStatus` enum('active','trialing','past_due','canceled','incomplete') DEFAULT 'incomplete',
	`trialEndsAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `organizations_id` PRIMARY KEY(`id`),
	CONSTRAINT `organizations_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `phone_otp` (
	`id` int AUTO_INCREMENT NOT NULL,
	`phone` varchar(32) NOT NULL,
	`code` varchar(8) NOT NULL,
	`expiresAt` timestamp NOT NULL,
	`verified` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `phone_otp_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `flow_rules` DROP INDEX `flow_rules_category_unique`;--> statement-breakpoint
ALTER TABLE `flow_rules` ADD `orgId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `flow_templates` ADD `orgId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `leads` ADD `orgId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `messages` ADD `orgId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `sms_templates` ADD `orgId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `phone` varchar(32);--> statement-breakpoint
ALTER TABLE `webhook_configs` ADD `orgId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `webhook_logs` ADD `orgId` int;
ALTER TABLE `bot_configs` MODIFY COLUMN `tone` enum('friendly','professional','casual','empathetic','direct','karen','kevin') NOT NULL DEFAULT 'friendly';--> statement-breakpoint
ALTER TABLE `bot_configs` ADD `firstMessageDelay` enum('instant','1min','random') DEFAULT 'instant' NOT NULL;--> statement-breakpoint
ALTER TABLE `leads` ADD `consentConfirmed` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `leads` ADD `optedOut` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `leads` ADD `optedOutAt` timestamp;
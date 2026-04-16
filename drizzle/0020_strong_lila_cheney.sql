ALTER TABLE `bot_configs` MODIFY COLUMN `maxRepliesPerLead` int NOT NULL DEFAULT 10;--> statement-breakpoint
ALTER TABLE `bot_configs` ADD `openingMessage` text;--> statement-breakpoint
ALTER TABLE `bot_configs` ADD `businessContext` text;--> statement-breakpoint
ALTER TABLE `bot_configs` ADD `replyDelay` enum('instant','1min','random') DEFAULT 'instant' NOT NULL;--> statement-breakpoint
ALTER TABLE `messages` ADD `isBot` boolean DEFAULT false NOT NULL;
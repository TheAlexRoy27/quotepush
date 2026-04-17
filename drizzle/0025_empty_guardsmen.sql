ALTER TABLE `bot_configs` ADD `quietHoursEnabled` boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `bot_configs` ADD `quietHoursStart` int DEFAULT 8 NOT NULL;--> statement-breakpoint
ALTER TABLE `bot_configs` ADD `quietHoursEnd` int DEFAULT 21 NOT NULL;--> statement-breakpoint
ALTER TABLE `bot_configs` ADD `quietHoursTimezone` varchar(64) DEFAULT 'America/New_York' NOT NULL;--> statement-breakpoint
ALTER TABLE `leads` ADD `source` varchar(100);--> statement-breakpoint
ALTER TABLE `leads` ADD `doNotContact` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `leads` ADD `doNotContactAt` timestamp;--> statement-breakpoint
ALTER TABLE `leads` ADD `age` int;--> statement-breakpoint
ALTER TABLE `leads` ADD `state` varchar(50);--> statement-breakpoint
ALTER TABLE `leads` ADD `productType` varchar(100);
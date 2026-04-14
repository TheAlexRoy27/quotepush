ALTER TABLE `drip_steps` ADD `delayAmount` int DEFAULT 3 NOT NULL;--> statement-breakpoint
ALTER TABLE `drip_steps` ADD `delayUnit` enum('minutes','days') DEFAULT 'days' NOT NULL;
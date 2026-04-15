ALTER TABLE `drip_steps` ADD `branchType` enum('positive','negative');--> statement-breakpoint
ALTER TABLE `drip_steps` ADD `parentStepId` int;
ALTER TABLE `org_twilio_configs` ADD `sendblueApiKeyId` varchar(128);--> statement-breakpoint
ALTER TABLE `org_twilio_configs` ADD `sendblueApiSecret` varchar(128);--> statement-breakpoint
ALTER TABLE `org_twilio_configs` ADD `sendblueFromNumber` varchar(32);--> statement-breakpoint
ALTER TABLE `organizations` ADD `smsProvider` enum('twilio','sendblue') DEFAULT 'twilio' NOT NULL;
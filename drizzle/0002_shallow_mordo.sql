CREATE TABLE `webhook_configs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL DEFAULT 'CRM Webhook',
	`secret` varchar(64) NOT NULL,
	`fieldMappings` text NOT NULL,
	`autoSend` int NOT NULL DEFAULT 1,
	`schedulingLink` varchar(512),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `webhook_configs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `webhook_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`status` enum('success','error','skipped') NOT NULL,
	`payload` text,
	`message` text,
	`leadId` int,
	`receivedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `webhook_logs_id` PRIMARY KEY(`id`)
);

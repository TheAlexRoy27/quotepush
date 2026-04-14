import { createConnection } from "mysql2/promise";
import * as dotenv from "dotenv";
dotenv.config();

const db = await createConnection(process.env.DATABASE_URL);
await db.execute(`
  CREATE TABLE IF NOT EXISTS \`phone_credentials\` (
    \`id\` int AUTO_INCREMENT NOT NULL,
    \`userId\` int NOT NULL,
    \`phone\` varchar(32) NOT NULL,
    \`passwordHash\` varchar(255) NOT NULL,
    \`createdAt\` timestamp NOT NULL DEFAULT (now()),
    \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT \`phone_credentials_id\` PRIMARY KEY(\`id\`),
    CONSTRAINT \`phone_credentials_phone_unique\` UNIQUE(\`phone\`)
  )
`);
console.log("✅ phone_credentials table created");
await db.end();

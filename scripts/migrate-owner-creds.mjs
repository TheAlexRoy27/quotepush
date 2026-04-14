import { createConnection } from "mysql2/promise";
import * as dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "../.env") });

const conn = await createConnection(process.env.DATABASE_URL);

await conn.execute(`
  CREATE TABLE IF NOT EXISTS \`owner_credentials\` (
    \`id\` int AUTO_INCREMENT NOT NULL,
    \`phone\` varchar(32) NOT NULL,
    \`passwordHash\` varchar(255) NOT NULL,
    \`createdAt\` timestamp NOT NULL DEFAULT (now()),
    \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT \`owner_credentials_id\` PRIMARY KEY(\`id\`),
    CONSTRAINT \`owner_credentials_phone_unique\` UNIQUE(\`phone\`)
  )
`);

console.log("✅ owner_credentials table created");
await conn.end();

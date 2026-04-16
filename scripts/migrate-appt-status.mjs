import { createConnection } from "mysql2/promise";
import { config } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../.env") });

const url = process.env.DATABASE_URL;
if (!url) { console.error("No DATABASE_URL"); process.exit(1); }

const conn = await createConnection(url);
try {
  await conn.execute("ALTER TABLE `appointments` MODIFY COLUMN `status` enum('pending','booked','cancelled','completed','no_answer') NOT NULL DEFAULT 'pending'");
  console.log("Migration applied: appointment status enum extended");
} catch (e) {
  console.error("Migration failed:", e.message);
  process.exit(1);
} finally {
  await conn.end();
}

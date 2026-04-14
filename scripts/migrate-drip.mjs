/**
 * Migration script: create drip_sequences, drip_steps, lead_drip_enrollments tables
 * Run: node scripts/migrate-drip.mjs
 */
import { createConnection } from "mysql2/promise";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import dotenv from "dotenv";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "../.env") });

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

const sqlFile = join(__dirname, "../drizzle/0006_true_the_watchers.sql");
const sql = readFileSync(sqlFile, "utf8");
const statements = sql
  .split("--> statement-breakpoint")
  .map((s) => s.trim())
  .filter(Boolean);

const conn = await createConnection(url);

// Clean up any legacy category values before altering enum columns
console.log("Cleaning up legacy category values...");
const cleanups = [
  `UPDATE flow_rules SET category = 'Wants More Info' WHERE category NOT IN ('Interested','Not Interested','Wants More Info','Unsubscribe')`,
  `UPDATE flow_templates SET category = 'Wants More Info' WHERE category NOT IN ('Interested','Not Interested','Wants More Info','Unsubscribe')`,
  `UPDATE message_classifications SET category = 'Wants More Info' WHERE category NOT IN ('Interested','Not Interested','Wants More Info','Unsubscribe')`,
];
for (const c of cleanups) {
  try { await conn.execute(c); console.log("  ✓ Cleanup OK"); } catch (e) { console.log("  ⚠ Cleanup:", e.message); }
}

for (const stmt of statements) {
  console.log("Executing:", stmt.substring(0, 80), "...");
  try {
    await conn.execute(stmt);
    console.log("  ✓ OK");
  } catch (err) {
    if (err.code === "ER_TABLE_EXISTS_ERROR" || err.message?.includes("already exists")) {
      console.log("  ⚠ Already exists, skipping");
    } else {
      console.error("  ✗ Error:", err.message);
    }
  }
}

await conn.end();
console.log("Migration complete.");

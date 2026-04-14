import { createConnection } from "mysql2/promise";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import dotenv from "dotenv";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "../.env") });

const url = process.env.DATABASE_URL;
if (!url) { console.error("DATABASE_URL not set"); process.exit(1); }

const sqlFile = join(__dirname, "../drizzle/0007_huge_nico_minoru.sql");
const sql = readFileSync(sqlFile, "utf8");
const statements = sql.split("--> statement-breakpoint").map(s => s.trim()).filter(Boolean);

const conn = await createConnection(url);
for (const stmt of statements) {
  console.log("Executing:", stmt.substring(0, 100));
  try {
    await conn.execute(stmt);
    console.log("  ✓ OK");
  } catch (err) {
    if (err.message?.includes("Duplicate column")) {
      console.log("  ⚠ Column already exists, skipping");
    } else {
      console.error("  ✗ Error:", err.message);
    }
  }
}

// Also backfill delayAmount from delayDays for existing rows
console.log("Backfilling delayAmount from delayDays...");
try {
  await conn.execute("UPDATE drip_steps SET delayAmount = delayDays WHERE delayAmount = 3 AND delayDays != 3");
  console.log("  ✓ Backfill OK");
} catch (e) {
  console.log("  ⚠ Backfill:", e.message);
}

await conn.end();
console.log("Migration complete.");

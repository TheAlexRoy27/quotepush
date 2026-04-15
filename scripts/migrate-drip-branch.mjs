import { config } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { createConnection } from "mysql2/promise";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../.env") });

const conn = await createConnection(process.env.DATABASE_URL);
try {
  await conn.execute(`ALTER TABLE \`drip_steps\` ADD COLUMN IF NOT EXISTS \`branchType\` enum('positive','negative') DEFAULT NULL`);
  console.log("✅ branchType column added");
  await conn.execute(`ALTER TABLE \`drip_steps\` ADD COLUMN IF NOT EXISTS \`parentStepId\` int DEFAULT NULL`);
  console.log("✅ parentStepId column added");
} catch (err) {
  // Column may already exist
  if (err.code === "ER_DUP_FIELDNAME") {
    console.log("ℹ️  Columns already exist, skipping");
  } else {
    throw err;
  }
} finally {
  await conn.end();
}
console.log("✅ Migration complete");

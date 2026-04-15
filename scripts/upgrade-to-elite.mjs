import { createConnection } from "mysql2/promise";
import * as dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "../.env") });

const conn = await createConnection(process.env.DATABASE_URL);

// Show all orgs first
const [orgs] = await conn.execute("SELECT id, name, plan, subscriptionStatus FROM organizations");
console.log("Current orgs:", orgs);

if (orgs.length === 0) {
  console.log("No orgs found. User needs to create an account first.");
  await conn.end();
  process.exit(0);
}

// Upgrade all orgs to Elite (or just the first/owner org)
const [result] = await conn.execute(
  "UPDATE organizations SET plan = 'elite', subscriptionStatus = 'active' WHERE id = ?",
  [orgs[0].id]
);
console.log(`✅ Upgraded org "${orgs[0].name}" (id: ${orgs[0].id}) to Elite plan. Rows affected: ${result.affectedRows}`);

// Verify
const [updated] = await conn.execute("SELECT id, name, plan, subscriptionStatus FROM organizations WHERE id = ?", [orgs[0].id]);
console.log("Updated org:", updated[0]);

await conn.end();

// Seed sample flows for all existing orgs
import { createRequire } from "module";
import { config } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../.env") });

// We need to run this via tsx since the server code is TypeScript
import { execSync } from "child_process";

const script = `
import { seedDefaultTemplates, seedFlowRules } from "./server/flowDb";
import { seedDefaultDripSequences } from "./server/dripDb";
import { getDb } from "./server/db";
import { organizations } from "./drizzle/schema";

const db = await getDb();
if (!db) { console.error("No DB"); process.exit(1); }

const orgs = await db.select().from(organizations);
console.log(\`Found \${orgs.length} org(s)\`);

for (const org of orgs) {
  console.log(\`Seeding org \${org.id}: \${org.name}\`);
  await seedFlowRules(org.id);
  await seedDefaultTemplates(org.id);
  await seedDefaultDripSequences(org.id);
  console.log(\`  ✅ Done\`);
}
console.log("All orgs seeded!");
process.exit(0);
`;

import { writeFileSync, unlinkSync } from "fs";
const tmpFile = resolve(__dirname, "../_seed_tmp.ts");
writeFileSync(tmpFile, script);

try {
  execSync(`cd ${resolve(__dirname, "..")} && npx tsx _seed_tmp.ts`, { stdio: "inherit" });
} finally {
  try { unlinkSync(tmpFile); } catch {}
}

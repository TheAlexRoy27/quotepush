import { getDb } from "../server/db";
import { sql } from "drizzle-orm";

async function migrate() {
  const db = await getDb();
  if (!db) throw new Error("No DB connection");

  try {
    await db.execute(sql`ALTER TABLE \`leads\` ADD COLUMN \`optedOut\` boolean DEFAULT false NOT NULL`);
    console.log("Added optedOut column");
  } catch (e: any) {
    if (e?.message?.includes("Duplicate column")) {
      console.log("optedOut column already exists");
    } else {
      throw e;
    }
  }

  try {
    await db.execute(sql`ALTER TABLE \`leads\` ADD COLUMN \`optedOutAt\` timestamp NULL DEFAULT NULL`);
    console.log("Added optedOutAt column");
  } catch (e: any) {
    if (e?.message?.includes("Duplicate column")) {
      console.log("optedOutAt column already exists");
    } else {
      throw e;
    }
  }

  console.log("Migration complete");
  process.exit(0);
}

migrate().catch((e) => {
  console.error("Migration failed:", e);
  process.exit(1);
});

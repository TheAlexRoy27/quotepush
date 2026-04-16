import { createConnection } from 'mysql2/promise';
import { config } from 'dotenv';
config();

const conn = await createConnection(process.env.DATABASE_URL);
try {
  await conn.execute("ALTER TABLE `organizations` ADD `lightLogoUrl` varchar(512)");
  console.log("Migration applied: lightLogoUrl column added");
} catch (e) {
  if (e.code === 'ER_DUP_FIELDNAME') {
    console.log("Column already exists, skipping");
  } else {
    throw e;
  }
} finally {
  await conn.end();
}

const { Client } = require('pg');

async function migrate() {
  const client = new Client({
    connectionString: 'postgresql://postgres.fqfhamxgnlidccwpfswt:9QwYh5XTYxbRwjw8@aws-0-ap-southeast-2.pooler.supabase.com:6543/postgres'
  });

  await client.connect();
  console.log('Connected to PostgreSQL successfully');

  await client.query(`
    ALTER TABLE "Order" 
    ADD COLUMN IF NOT EXISTS "billImageUrl" TEXT,
    ADD COLUMN IF NOT EXISTS "rejectionReason" TEXT,
    ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
  `);

  console.log('Columns successfully added to Order table');

  const res = await client.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'Order';
  `);
  console.log('Current Order columns:', res.rows.map(r => r.column_name));

  await client.end();
}

migrate().catch(e => {
  console.error('Migration failed:', e);
  process.exit(1);
});

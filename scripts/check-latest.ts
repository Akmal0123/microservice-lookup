import { sequelize } from '../src/database/sequelize.js';

async function check() {
  const [pos]: any = await sequelize.query('SELECT id, user_id, po_number, status, created_at FROM external_inventory_db.purchase_orders ORDER BY id DESC LIMIT 10');
  const [prs]: any = await sequelize.query('SELECT id, user_id, pr_number, status, created_at FROM external_inventory_db.purchase_requests ORDER BY id DESC LIMIT 10');
  const [eisUsers]: any = await sequelize.query('SELECT id, name, username, email FROM external_inventory_db.users ORDER BY id DESC');
  const [amsDocs]: any = await sequelize.query('SELECT id, user_id, company_id, aplikasi_id, nomor_dokumen, judul_dokumen, status, status_current, created_at FROM `tisera-ams`.dokumen ORDER BY id DESC LIMIT 10');
  const [amsUsers]: any = await sequelize.query('SELECT id, name, email FROM `tisera-ams`.users ORDER BY id DESC');

  console.log('=== LATEST EIS USERS ===\n', JSON.stringify(eisUsers, null, 2));
  console.log('=== LATEST EIS POs ===\n', JSON.stringify(pos, null, 2));
  console.log('=== LATEST EIS PRs ===\n', JSON.stringify(prs, null, 2));
  console.log('=== LATEST AMS USERS ===\n', JSON.stringify(amsUsers, null, 2));
  console.log('=== LATEST AMS DOCS ===\n', JSON.stringify(amsDocs, null, 2));

  await sequelize.close();
}

check();

/**
 * ==============================================================================
 * 🧪 Test Suite: End-to-End Synchronization AMS <-> EIS via Microservice Lookup
 * ==============================================================================
 * Menguji seluruh alur sesuai permintaan USER:
 * 1. PO-2026-8106 di EIS dengan user yang terdaftar di EIS & AMS
 *    -> Dokumen muncul di AMS berstatus 'draft' beserta PDF terlampir.
 * 2. PO di EIS dengan user yang terdaftar di EIS namun TIDAK di AMS
 *    -> Akun user muncul di User Management Superadmin AMS (username, email, password sama).
 *    -> Dokumen draft tidak dibuat terlebih dahulu.
 * 3. Update status dari AMS ke EIS melalui microservice-lookup
 *    -> Status di EIS berhasil ter-update (approved -> completed, rejected -> cancelled).
 * ==============================================================================
 */

import { sequelize } from './src/database/sequelize.js';
import {
  Company,
  Vendor,
  Item,
  User,
  PurchaseOrder,
  PurchaseOrderItem,
} from './src/database/models/index.js';
import { SyncService } from './src/modules/sync/sync.service.js';

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

async function runSyncE2eTest() {
  console.log(`\n${colors.bright}${colors.cyan}======================================================================${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}   🔄 E2E SINKRONISASI DATA EIS <-> AMS VIA MICROSERVICE LOOKUP      ${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}======================================================================${colors.reset}\n`);

  let totalTests = 0;
  let passedTests = 0;

  function assertCheck(name: string, condition: boolean, extraInfo: string = '') {
    totalTests++;
    if (condition) {
      passedTests++;
      console.log(`  ${colors.green}✔ PASS${colors.reset} [Test ${totalTests}]: ${name}`);
      if (extraInfo) console.log(`         ${colors.yellow}↳ ${extraInfo}${colors.reset}`);
    } else {
      console.log(`  ${colors.red}✖ FAIL${colors.reset} [Test ${totalTests}]: ${name}`);
      if (extraInfo) console.log(`         ${colors.red}↳ Error: ${extraInfo}${colors.reset}`);
    }
  }

  try {
    // -------------------------------------------------------------------------
    // Persiapan Master Data & Pengguna Uji
    // -------------------------------------------------------------------------
    console.log(`\n${colors.bright}Tahap 1: Setup Akun User di EIS & AMS...${colors.reset}`);

    // Pastikan Company & Vendor ada di EIS
    let company = await Company.findOne();
    if (!company) {
      company = await Company.create({ code: 'COMP01', name: 'PT Tiga Serangkai', address: 'Surakarta' });
    }
    let vendor = await Vendor.findOne();
    if (!vendor) {
      vendor = await Vendor.create({ code: 'VEND01', name: 'PT Rekanan Utama', phone: '08111222333' });
    }
    let item = await Item.findOne();
    if (!item) {
      item = await Item.create({ code: 'ITM01', name: 'Kertas HVS A4 80gr', unit: 'rim', price: 55000 });
    }

    // User A: Terdaftar di EIS dan AMS (akmalsaputro6@gmail.com)
    const existingAmsEmail = 'akmalsaputro6@gmail.com';
    let [userA] = await User.findOrCreate({
      where: { email: existingAmsEmail },
      defaults: {
        name: 'Akmal Saputro 6',
        username: 'akmalsaputro6',
        email: existingAmsEmail,
        password: '$2y$12$eRevx19p7FwY6m/1WbTfauq.w6m2e9gB7yH8zWqjV9Y1q7yJ1x3.', // Contoh hash bcrypt
      },
    });

    // User B: Terdaftar di EIS HANYA (TIDAK terdaftar di AMS)
    const eisOnlyEmail = `eis_user_${Date.now()}@example.com`;
    const eisOnlyPasswordHash = '$2y$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi'; // password
    const userB = await User.create({
      name: 'User EIS Baru',
      username: `eisuser_${Date.now()}`,
      email: eisOnlyEmail,
      password: eisOnlyPasswordHash,
    });

    // Buat PO-2026-8106 untuk User A
    const poNumberA = 'PO-2026-8106';
    let poA = await PurchaseOrder.findOne({ where: { po_number: poNumberA } });
    if (!poA) {
      poA = await PurchaseOrder.create({
        user_id: userA.id,
        po_number: poNumberA,
        company_id: company.id,
        vendor_id: vendor.id,
        order_date: '2026-10-14',
        status: 'draft',
        description: 'Pengadaan Kertas Cetak Semester Ganjil 2026',
        subtotal: 5500000,
        tax: 550000,
        total: 6050000,
      });

      await PurchaseOrderItem.create({
        purchase_order_id: poA.id,
        item_id: item.id,
        quantity: 100,
        unit_price: 55000,
        subtotal: 5500000,
        description: 'Kertas HVS A4 80gr 100 rim',
      });
    } else {
      poA.user_id = userA.id;
      poA.status = 'draft';
      await poA.save();
    }

    // Bersihkan data dokumen PO-2026-8106 di AMS sebelum pengujian agar fresh
    await sequelize.query(
      'DELETE FROM `tisera-ams`.dokumen WHERE nomor_dokumen = :nomor',
      { replacements: { nomor: poNumberA } }
    );

    // Buat PO-2026-9999 untuk User B
    const poNumberB = `PO-TEST-${Date.now().toString().slice(-4)}`;
    const poB = await PurchaseOrder.create({
      user_id: userB.id,
      po_number: poNumberB,
      company_id: company.id,
      vendor_id: vendor.id,
      order_date: '2026-10-14',
      status: 'draft',
      description: 'Pengadaan Meja Komputer Gudang',
      subtotal: 2500000,
      tax: 250000,
      total: 2750000,
    });
    await PurchaseOrderItem.create({
      purchase_order_id: poB.id,
      item_id: item.id,
      quantity: 50,
      unit_price: 50000,
      subtotal: 2500000,
      description: 'Barang pengadaan gudang',
    });

    assertCheck(
      'PO dan User berhasil disiapkan di database EIS',
      Boolean(poA && poB && userA && userB),
      `User A (dual-system): ${userA.email} | User B (EIS-only): ${userB.email}`
    );

    // -------------------------------------------------------------------------
    // SKENARIO 1: User punya akun EIS tapi TIDAK di AMS
    // -------------------------------------------------------------------------
    console.log(`\n${colors.bright}Tahap 2: Skenario 1 - User Terdaftar di EIS tapi BELUM di AMS...${colors.reset}`);
    console.log(`   Sinkronisasi PO: ${poNumberB} dengan user: ${eisOnlyEmail}`);

    const syncResultB = await SyncService.syncPurchaseOrder(poNumberB);

    assertCheck(
      'Microservice mendeteksi user belum ada di AMS dan melakukan User Provisioning',
      syncResultB.action === 'user_provisioned' && syncResultB.user_status === 'provisioned_to_ams',
      `Action: ${syncResultB.action} | Status: ${syncResultB.user_status}`
    );

    assertCheck(
      'Dokumen draft TIDAK dibuat sebelum akun user aktif di AMS',
      syncResultB.document === null,
      'Dokumen draft ditunda sesuai aturan bisnis'
    );

    // Verifikasi akun user B berhasil dibuat di tabel tisera-ams.users
    const [amsUserRows]: [any[], any] = await sequelize.query(
      'SELECT id, name, email, password FROM `tisera-ams`.users WHERE email = :email LIMIT 1',
      { replacements: { email: eisOnlyEmail } }
    );

    assertCheck(
      'User EIS berhasil muncul di tabel User AMS (User Management Superadmin)',
      amsUserRows.length > 0 && amsUserRows[0].email === eisOnlyEmail,
      `User ID AMS: ${amsUserRows[0]?.id} | Email: ${amsUserRows[0]?.email}`
    );

    assertCheck(
      'Password hash di AMS sama persis dengan password hash di EIS',
      amsUserRows[0]?.password === eisOnlyPasswordHash,
      `Password hash match: ${amsUserRows[0]?.password?.substring(0, 15)}...`
    );

    // Verifikasi bahwa otorisasi (usersauth) akun baru tetap KOSONG (menunggu konfirmasi Superadmin)
    const [authRows]: [any[], any] = await sequelize.query(
      'SELECT id, role_id, company_id FROM `tisera-ams`.usersauth WHERE user_id = :userId',
      { replacements: { userId: amsUserRows[0]?.id } }
    );
    assertCheck(
      'Otorisasi akun baru di AMS tetap KOSONG (menunggu konfirmasi Superadmin)',
      authRows.length === 0,
      `Jumlah otorisasi: ${authRows.length} (KOSONG sesuai permintaan)`
    );

    // -------------------------------------------------------------------------
    // SKENARIO 2: User punya akun di EIS DAN AMS
    // -------------------------------------------------------------------------
    console.log(`\n${colors.bright}Tahap 3: Skenario 2 - User Terdaftar di EIS DAN AMS (Dual Account)...${colors.reset}`);
    console.log(`   Sinkronisasi PO: ${poNumberA} dengan user: ${existingAmsEmail}`);

    const syncResultA = await SyncService.syncPurchaseOrder(poNumberA);

    assertCheck(
      'Microservice mendeteksi user terdaftar di kedua sistem dan membuat Dokumen Draft',
      syncResultA.action === 'document_created' && syncResultA.user_status === 'existing_in_ams',
      `Action: ${syncResultA.action} | User Status: ${syncResultA.user_status}`
    );

    assertCheck(
      "Dokumen tersimpan di AMS dengan status 'draft'",
      syncResultA.document !== null && syncResultA.document?.status === 'draft',
      `Dokumen: ${syncResultA.document?.nomor_dokumen} | Status: ${syncResultA.document?.status}`
    );

    assertCheck(
      'File PDF hasil generate berhasil dilampirkan ke dokumen draft',
      Boolean(syncResultA.document?.has_pdf),
      `Has PDF: ${syncResultA.document?.has_pdf}`
    );

    // Verifikasi dokumen di database AMS tisera-ams.dokumen & dokumen_version
    const [dokumenRows]: [any[], any] = await sequelize.query(
      'SELECT id, nomor_dokumen, status, status_current, nominal FROM `tisera-ams`.dokumen WHERE nomor_dokumen = :nomor LIMIT 1',
      { replacements: { nomor: poNumberA } }
    );
    assertCheck(
      'Dokumen PO-2026-8106 terverifikasi di database AMS (status = draft)',
      dokumenRows.length > 0 && dokumenRows[0].status === 'draft',
      `Nomor: ${dokumenRows[0]?.nomor_dokumen} | Status: ${dokumenRows[0]?.status} | Nominal: Rp ${dokumenRows[0]?.nominal}`
    );

    const [verRows]: [any[], any] = await sequelize.query(
      'SELECT id, version, nama_file, file_url, size_file FROM `tisera-ams`.dokumen_version WHERE dokumen_id = :dokumenId LIMIT 1',
      { replacements: { dokumenId: dokumenRows[0]?.id } }
    );
    assertCheck(
      'Versi dokumen & file PDF terverifikasi di dokumen_version AMS',
      verRows.length > 0 && verRows[0].size_file > 0,
      `Version: ${verRows[0]?.version} | File: ${verRows[0]?.file_url} (${verRows[0]?.size_file} bytes)`
    );

    // -------------------------------------------------------------------------
    // SKENARIO 3: Update Status dari AMS ke EIS via Microservice Lookup
    // -------------------------------------------------------------------------
    console.log(`\n${colors.bright}Tahap 4: Skenario 3 - Bidirectional Status Update AMS -> EIS...${colors.reset}`);

    // Update 1: Approved di AMS -> Completed di EIS
    console.log(`   Simulasi approval di AMS: ${poNumberA} -> 'approved'`);
    const statusResult1 = await SyncService.updateStatusFromAms(
      poNumberA,
      'approved',
      'Persetujuan resmi dari Direktur Keuangan AMS'
    );

    assertCheck(
      'Microservice berhasil menerima status approved dan memetakan ke completed di EIS',
      statusResult1.new_status === 'completed',
      `Previous: ${statusResult1.previous_status} -> New: ${statusResult1.new_status}`
    );

    const updatedPo1 = await PurchaseOrder.findOne({ where: { po_number: poNumberA } });
    assertCheck(
      'Status Purchase Order di database EIS ter-update menjadi completed',
      updatedPo1?.status === 'completed' && Boolean(updatedPo1?.description?.includes('AMS Sync: APPROVED')),
      `EIS PO Status: ${updatedPo1?.status} | Description: ${updatedPo1?.description?.slice(-45)}`
    );

    // Update 2: Rejected di AMS -> Cancelled di EIS
    console.log(`   Simulasi rejection di AMS: ${poNumberA} -> 'rejected'`);
    const statusResult2 = await SyncService.updateStatusFromAms(
      poNumberA,
      'rejected',
      'Penolakan: Anggaran dialihkan ke proyek Q4'
    );

    assertCheck(
      'Microservice berhasil menerima status rejected dan memetakan ke cancelled di EIS',
      statusResult2.new_status === 'cancelled',
      `Previous: ${statusResult2.previous_status} -> New: ${statusResult2.new_status}`
    );

    const updatedPo2 = await PurchaseOrder.findOne({ where: { po_number: poNumberA } });
    assertCheck(
      'Status Purchase Order di database EIS ter-update menjadi cancelled',
      updatedPo2?.status === 'cancelled' && Boolean(updatedPo2?.description?.includes('AMS Sync: REJECTED')),
      `EIS PO Status: ${updatedPo2?.status} | Description: ${updatedPo2?.description?.slice(-45)}`
    );

    // -------------------------------------------------------------------------
    // Hasil Akhir
    // -------------------------------------------------------------------------
    console.log(`\n${colors.bright}${colors.cyan}======================================================================${colors.reset}`);
    console.log(`  📊 HASIL PENGUJIAN SINKRONISASI: ${passedTests}/${totalTests} UJI BERHASIL (${Math.round((passedTests / totalTests) * 100)}%)`);
    if (passedTests === totalTests) {
      console.log(`  ${colors.green}🎉 SEMUA SKENARIO SINKRONISASI BERHASIL 100%!${colors.reset}`);
      console.log(`  1. PO-2026-8106 tersinkronisasi sebagai draft di AMS beserta PDF.`);
      console.log(`  2. User EIS yang belum ada di AMS langsung muncul di User Management Superadmin (password sama).`);
      console.log(`  3. Pengecekan user didelegasikan sepenuhnya ke microservice-lookup.`);
      console.log(`  4. Status update dari AMS ke EIS berjalan 2 arah via microservice-lookup.`);
    } else {
      console.log(`  ${colors.red}⚠ Beberapa uji gagal, silakan periksa log di atas.${colors.reset}`);
    }
    console.log(`${colors.bright}${colors.cyan}======================================================================${colors.reset}\n`);
  } catch (error: any) {
    console.error(`${colors.red}❌ Error tak terduga selama pengujian:${colors.reset}`, error);
  } finally {
    await sequelize.close();
  }
}

runSyncE2eTest();

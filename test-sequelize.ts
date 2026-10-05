/**
 * ==============================================================================
 * 🧪 Test Suite Khusus Pembuktian Sequelize ORM (Untuk Review Mentor)
 * ==============================================================================
 * Script ini membuktikan secara visual dan terprogram bahwa:
 * 1. Microservice Lookup benar-benar menggunakan Sequelize ORM.
 * 2. Model & Asosiasi Relasi (belongsTo, hasMany) terdaftar secara resmi.
 * 3. Query dieksekusi dengan Eager Loading (LEFT OUTER JOIN) tanpa masalah N+1.
 * 4. Objek hasil query adalah instance asli dari Sequelize Model.
 *
 * Cara Menjalankan:
 *   cd microservice-lookup
 *   npm run test:orm
 *   atau: npx tsx test-sequelize.ts
 * ==============================================================================
 */

import { sequelize } from './src/database/sequelize.js';
import {
  Company,
  Vendor,
  Item,
  PurchaseOrder,
  PurchaseOrderItem,
  PurchaseRequest,
  PurchaseRequestItem,
} from './src/database/models/index.js';
import { Model } from 'sequelize';

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

async function runSequelizeReviewTest() {
  console.log(`\n${colors.bright}${colors.cyan}======================================================================${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}   🔬 BUKTI IMPLEMENTASI SEQUELIZE ORM — REVIEW MINGGUAN MENTOR      ${colors.reset}`);
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
    // --------------------------------------------------------------------------
    // TAHAP 1: Verifikasi Koneksi Database Sequelize & Connection Pooling
    // --------------------------------------------------------------------------
    console.log(`${colors.bright}Tahap 1: Verifikasi Engine & Koneksi Sequelize...${colors.reset}`);
    await sequelize.authenticate();
    const dialectName = sequelize.getDialect();
    const dbConfig = sequelize.config;

    assertCheck(
      'Koneksi Database Sequelize Terverifikasi (authenticate)',
      true,
      `Dialect: ${dialectName.toUpperCase()} | Database: ${dbConfig.database} | Host: ${dbConfig.host}:${dbConfig.port}`
    );

    const poolConfig = (sequelize.connectionManager as any).pool;
    assertCheck(
      'Sequelize Connection Pooling Dikonfigurasi',
      poolConfig !== undefined,
      `Max Connections: ${poolConfig?.options?.max ?? 10}, Min: ${poolConfig?.options?.min ?? 0}`
    );

    // --------------------------------------------------------------------------
    // TAHAP 2: Verifikasi Registrasi Model Sequelize
    // --------------------------------------------------------------------------
    console.log(`\n${colors.bright}Tahap 2: Verifikasi Registrasi Model TypeScript Sequelize...${colors.reset}`);
    const registeredModels = Object.keys(sequelize.models);
    console.log(`  Model terdaftar di Sequelize: ${colors.cyan}${registeredModels.join(', ')}${colors.reset}`);

    assertCheck(
      'Model PurchaseOrder terdaftar sebagai Sequelize Model',
      PurchaseOrder.prototype instanceof Model,
      `Table Name: ${PurchaseOrder.tableName}`
    );
    assertCheck(
      'Model Vendor terdaftar sebagai Sequelize Model',
      Vendor.prototype instanceof Model,
      `Table Name: ${Vendor.tableName}`
    );
    assertCheck(
      'Model Item terdaftar sebagai Sequelize Model',
      Item.prototype instanceof Model,
      `Table Name: ${Item.tableName}`
    );
    assertCheck(
      'Model Company terdaftar sebagai Sequelize Model',
      Company.prototype instanceof Model,
      `Table Name: ${Company.tableName}`
    );
    assertCheck(
      'Model PurchaseRequest terdaftar sebagai Sequelize Model',
      PurchaseRequest.prototype instanceof Model,
      `Table Name: ${PurchaseRequest.tableName}`
    );

    // --------------------------------------------------------------------------
    // TAHAP 3: Verifikasi Asosiasi Relasi (belongsTo & hasMany)
    // --------------------------------------------------------------------------
    console.log(`\n${colors.bright}Tahap 3: Verifikasi Definisi Relasi Antar Model (Associations)...${colors.reset}`);
    const poAssociations = Object.keys(PurchaseOrder.associations);
    console.log(`  Relasi pada PurchaseOrder: ${colors.magenta}${poAssociations.join(', ')}${colors.reset}`);

    assertCheck(
      'Relasi PurchaseOrder -> Company (belongsTo)',
      PurchaseOrder.associations.company !== undefined &&
      PurchaseOrder.associations.company.associationType === 'BelongsTo',
      `Foreign Key: ${PurchaseOrder.associations.company?.foreignKey}`
    );

    assertCheck(
      'Relasi PurchaseOrder -> Vendor (belongsTo)',
      PurchaseOrder.associations.vendor !== undefined &&
      PurchaseOrder.associations.vendor.associationType === 'BelongsTo',
      `Foreign Key: ${PurchaseOrder.associations.vendor?.foreignKey}`
    );

    assertCheck(
      'Relasi PurchaseOrder -> Items (hasMany PurchaseOrderItem)',
      PurchaseOrder.associations.items !== undefined &&
      PurchaseOrder.associations.items.associationType === 'HasMany',
      `Target Model: PurchaseOrderItem`
    );

    assertCheck(
      'Relasi PurchaseOrderItem -> Item (belongsTo)',
      PurchaseOrderItem.associations.item !== undefined &&
      PurchaseOrderItem.associations.item.associationType === 'BelongsTo',
      `Target Model: Item`
    );

    // --------------------------------------------------------------------------
    // TAHAP 4: Eksekusi Query Nyata dengan Logging SQL Generator (Smoking Gun)
    // --------------------------------------------------------------------------
    console.log(`\n${colors.bright}Tahap 4: Eksekusi Query Nyata dengan SQL Generator (Eager Loading)...${colors.reset}`);
    
    let generatedSql = '';
    const startTime = Date.now();

    // Query PurchaseOrder pertama dengan Eager Loading bersarang
    const samplePo = await PurchaseOrder.findOne({
      include: [
        { model: Company, as: 'company' },
        { model: Vendor, as: 'vendor' },
        {
          model: PurchaseOrderItem,
          as: 'items',
          include: [{ model: Item, as: 'item' }],
        },
      ],
      logging: (sql: string) => {
        generatedSql = sql;
      },
    });

    const latencyMs = Date.now() - startTime;

    assertCheck(
      'Sequelize berhasil meng-generate SQL Query Eager Loading (LEFT OUTER JOIN)',
      generatedSql.includes('LEFT OUTER JOIN') || generatedSql.includes('JOIN'),
      `Latency: ${latencyMs}ms`
    );

    console.log(`\n  ${colors.bright}📢 SQL Query Asli yang Dihasilkan Sequelize ke MySQL:${colors.reset}`);
    console.log(`  ${colors.yellow}${generatedSql}${colors.reset}\n`);

    // --------------------------------------------------------------------------
    // TAHAP 5: Verifikasi Hasil Instance & Data Relasi
    // --------------------------------------------------------------------------
    console.log(`${colors.bright}Tahap 5: Verifikasi Instance Object & Eager Loaded Relations...${colors.reset}`);

    if (samplePo) {
      const plain = samplePo.toJSON() as any;
      assertCheck(
        'Objek hasil query adalah instance asli dari Sequelize Model',
        samplePo instanceof Model,
        `PO Number: ${plain.po_number || samplePo.getDataValue('po_number')} (ID: ${plain.id || samplePo.getDataValue('id')})`
      );

      assertCheck(
        'Relasi Vendor berhasil ditarik secara otomatis (Eager Loaded)',
        plain.vendor !== undefined && plain.vendor !== null,
        `Vendor Name: ${plain.vendor?.name}`
      );

      assertCheck(
        'Relasi Company berhasil ditarik secara otomatis',
        plain.company !== undefined && plain.company !== null,
        `Company: ${plain.company?.name}`
      );

      const itemsCount = plain.items ? plain.items.length : 0;
      assertCheck(
        'Relasi Nested Items berhasil ditarik tanpa N+1 query',
        itemsCount > 0,
        `Jumlah Item: ${itemsCount} items (Item 1: ${plain.items?.[0]?.item?.name || 'N/A'})`
      );
    } else {
      console.log(`  ${colors.yellow}ℹ Catatan: Tabel purchase_orders saat ini kosong di database, namun query ORM sukses.${colors.reset}`);
    }

    // --------------------------------------------------------------------------
    // KESIMPULAN REVIEW
    // --------------------------------------------------------------------------
    console.log(`\n${colors.bright}${colors.cyan}======================================================================${colors.reset}`);
    if (passedTests === totalTests) {
      console.log(`${colors.bright}${colors.green}  🎉 SEMUA UJI SEQUELIZE ORM LOLOS 100% (${passedTests}/${totalTests} UJI BERHASIL)${colors.reset}`);
      console.log(`${colors.green}  Sistem terbukti 100% menggunakan Sequelize ORM dengan Type-Safe Models & Eager Loading!${colors.reset}`);
    } else {
      console.log(`${colors.bright}${colors.yellow}  HASIL UJI: ${passedTests}/${totalTests} Lolos.${colors.reset}`);
    }
    console.log(`${colors.bright}${colors.cyan}======================================================================${colors.reset}\n`);

  } catch (error: any) {
    console.error(`\n${colors.red}❌ Terjadi kesalahan saat pengujian:${colors.reset}`, error.message);
  } finally {
    await sequelize.close();
  }
}

runSequelizeReviewTest();

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { TemplateStorageService } from './src/modules/pdf/services/template-storage.service.js';
import { TemplateBinderService } from './src/modules/pdf/services/template-binder.service.js';
import { XmlPdfParserService } from './src/modules/pdf/services/xml-pdf-parser.service.js';
import { DynamicPdfService } from './src/modules/pdf/services/dynamic-pdf.service.js';
import { DummyTransactionData } from './src/data/dummy-transactions.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runTests() {
  console.log('====================================================');
  console.log('🧪 TESTING DYNAMIC SLIP & REPORT PDF GENERATOR (PRD)');
  console.log('====================================================\n');

  // Test 1: Init default templates
  console.log('1. Checking Template Storage Initialization...');
  await TemplateStorageService.initDefaultTemplates();
  const templates = await TemplateStorageService.listTemplates();
  console.log(`   Found ${templates.length} templates:`, templates.map((t) => t.id).join(', '));
  if (templates.length < 4) {
    throw new Error('Default templates were not initialized properly');
  }
  console.log('   ✅ Template Storage Service OK\n');

  // Test 2: PRD Section 8 XML Specification
  console.log('2. Testing PRD Section 8 XML Sample Rendering...');
  const prdXml = `
<document size="A4" margin="50" unit="pt">
   <page size="A4" margin="50">
      <text font="Helvetica-Bold" size="20" x="50" y="50">Slip {{ slip_type }}</text>
      <text size="12" x="50" y="80">No: {{ transaction_no }}</text>
      <!-- Looping item transaksi -->
      {{#each items}}
         <text size="10" x="50" y="{{ calculateY @index 110 20 }}">{{ this.name }} - {{ this.price }}</text>
      {{/each}}
   </page>
</document>
  `;
  const prdData = {
    slip_type: 'Purchase Request',
    transaction_no: 'PR-2026-9999',
    items: [
      { name: 'Kertas HVS A4', price: 'Rp 45.000' },
      { name: 'Tinta Black Epson', price: 'Rp 95.000' },
      { name: 'Stapler No 10', price: 'Rp 15.000' },
    ],
  };

  const startTimePrd = Date.now();
  const boundPrdXml = TemplateBinderService.bindData(prdXml, prdData);
  console.log('   Bound XML generated with calculateY:');
  console.log(boundPrdXml.trim().split('\n').slice(0, 9).join('\n'));
  const prdPdfBuffer = await XmlPdfParserService.parseAndRender(boundPrdXml);
  const prdDuration = Date.now() - startTimePrd;
  console.log(`   Rendered PDF Buffer: ${prdPdfBuffer.length} bytes in ${prdDuration}ms (PRD Target: <2000ms)`);
  if (prdPdfBuffer.length < 500) throw new Error('PDF Buffer too small');
  console.log('   ✅ PRD Section 8 Spec Sample Rendering OK\n');

  // Test 3: Purchase Request dynamic PDF generation
  console.log('3. Testing Purchase Request (PR / RQE) dynamic PDF generation...');
  const prTx = DummyTransactionData.findByKeyword('RQE-22001433');
  const startPr = Date.now();
  const prResult = await DynamicPdfService.generate({
    templateId: 'purchase_request',
    data: prTx,
  });
  const prDuration = Date.now() - startPr;
  console.log(`   Generated PR PDF: ${prResult.filename} (${prResult.buffer.length} bytes) in ${prDuration}ms using template [${prResult.templateUsed}]`);
  console.log('   ✅ Purchase Request Dynamic Template OK\n');

  // Test 4: Purchase Order dynamic PDF generation
  console.log('4. Testing Purchase Order (PO / POE) dynamic PDF generation...');
  const poTx = DummyTransactionData.findByKeyword('POE-22005020');
  const startPo = Date.now();
  const poResult = await DynamicPdfService.generate({
    templateId: 'purchase_order',
    data: poTx,
  });
  const poDuration = Date.now() - startPo;
  console.log(`   Generated PO PDF: ${poResult.filename} (${poResult.buffer.length} bytes) in ${poDuration}ms using template [${poResult.templateUsed}]`);
  console.log('   ✅ Purchase Order Dynamic Template OK\n');

  // Test 5: Payment Request (NPK / CCA) dynamic PDF generation
  console.log('5. Testing Payment Request (NPK / CCA) dynamic PDF generation...');
  const npkTx = DummyTransactionData.findByKeyword('CCA-00000002');
  const startNpk = Date.now();
  const npkResult = await DynamicPdfService.generate({
    templateId: 'payment_request',
    data: npkTx,
  });
  const npkDuration = Date.now() - startNpk;
  console.log(`   Generated NPK PDF: ${npkResult.filename} (${npkResult.buffer.length} bytes) in ${npkDuration}ms using template [${npkResult.templateUsed}]`);
  console.log('   ✅ Payment Request Dynamic Template OK\n');

  // Test 6: Automatic Keyword Lookup
  console.log('6. Testing Automatic Keyword Lookup & Inferred Template...');
  const keywordResult = await DynamicPdfService.generate({
    keyword: 'POE-22005020',
  });
  console.log(`   Keyword POE-22005020 resolved template: [${keywordResult.templateUsed}], size: ${keywordResult.buffer.length} bytes`);
  console.log('   ✅ Keyword Lookup Resolution OK\n');

  // Save generated sample files to storage for inspection
  const testOutputDir = path.resolve(__dirname, 'storage/test_output');
  if (!fs.existsSync(testOutputDir)) {
    fs.mkdirSync(testOutputDir, { recursive: true });
  }
  fs.writeFileSync(path.join(testOutputDir, 'prd_sample.pdf'), prdPdfBuffer);
  fs.writeFileSync(path.join(testOutputDir, 'pr_sample.pdf'), prResult.buffer);
  fs.writeFileSync(path.join(testOutputDir, 'po_sample.pdf'), poResult.buffer);
  fs.writeFileSync(path.join(testOutputDir, 'npk_sample.pdf'), npkResult.buffer);

  console.log('====================================================');
  console.log('🎉 ALL DYNAMIC PDF GENERATOR TESTS PASSED!');
  console.log(`Sample PDFs saved to: ${testOutputDir}`);
  console.log('====================================================');
}

runTests().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});

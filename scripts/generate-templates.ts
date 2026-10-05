import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { DummyTransactionData } from '../src/data/dummy-transactions.js';
import { PdfTemplateService } from '../src/modules/pdf/pdf-template.service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  const outputDir = path.resolve(__dirname, '../storage/dummy_templates');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  console.log('Generating realistic & responsive PDF templates in Microservice Lookup...');

  const allTransactions = DummyTransactionData.all();
  let count = 0;

  for (const [key, tx] of Object.entries(allTransactions)) {
    const targetFile = path.join(outputDir, `${key}.pdf`);
    console.log(`  -> Generating [${tx.tipe || 'DOC'}] ${key}: ${targetFile}`);
    await PdfTemplateService.generateToFile(tx, targetFile);
    count++;
  }

  console.log(`Successfully generated ${count} PDF templates in: ${outputDir}`);
}

main().catch((err) => {
  console.error('Failed to generate templates:', err);
  process.exit(1);
});

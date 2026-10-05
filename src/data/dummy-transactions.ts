import dummyData from './dummy-transactions.json' with { type: 'json' };

export class DummyTransactionData {
  static all(): Record<string, any> {
    return dummyData as Record<string, any>;
  }

  static findByKeyword(keyword: string): any | null {
    const clean = keyword.trim().toUpperCase();
    if (!clean) return null;

    const all = this.all();
    if (all[clean]) {
      return all[clean];
    }

    for (const [key, item] of Object.entries(all)) {
      if (
        clean.includes(key) ||
        key.includes(clean) ||
        (item.nomor_dokumen && item.nomor_dokumen.toUpperCase().includes(clean)) ||
        (item.kode && item.kode.toUpperCase().includes(clean))
      ) {
        return item;
      }

      // Check numeric part e.g. 22001434
      const numericPart = key.replace(/\D/g, '');
      const cleanNumeric = clean.replace(/\D/g, '');
      if (cleanNumeric && numericPart && (numericPart.includes(cleanNumeric) || cleanNumeric.includes(numericPart))) {
        return item;
      }
    }

    return null;
  }
}

import Handlebars from 'handlebars';

export class TemplateBinderService {
  private static hb: typeof Handlebars;

  public static getHandlebarsInstance(): typeof Handlebars {
    if (!this.hb) {
      this.hb = Handlebars.create();
      this.registerHelpers(this.hb);
    }
    return this.hb;
  }

  /**
   * Register custom helper functions for PDF rendering and formatting
   */
  private static registerHelpers(hb: typeof Handlebars): void {
    // 1. Dynamic Coordinate Helpers (PRD Section 8: {{ calculateY @index }})
    hb.registerHelper('calculateY', function (index: any, startY: any, stepY: any) {
      const idx = typeof index === 'number' ? index : parseInt(String(index || 0), 10);
      const start = typeof startY === 'number' ? startY : parseFloat(String(startY || 100));
      const step = typeof stepY === 'number' ? stepY : parseFloat(String(stepY || 20));
      return (start + idx * step).toFixed(1);
    });

    hb.registerHelper('calculateX', function (index: any, startX: any, stepX: any) {
      const idx = typeof index === 'number' ? index : parseInt(String(index || 0), 10);
      const start = typeof startX === 'number' ? startX : parseFloat(String(startX || 50));
      const step = typeof stepX === 'number' ? stepX : parseFloat(String(stepX || 80));
      return (start + idx * step).toFixed(1);
    });

    // 2. Numeric and Currency Formatting Helpers
    hb.registerHelper('formatNumber', function (value: any, decimals: any) {
      if (value === undefined || value === null || value === '') return '0';
      const num = typeof value === 'number' ? value : parseFloat(String(value));
      if (isNaN(num)) return '0';
      const dec = typeof decimals === 'number' ? decimals : parseInt(String(decimals ?? 2), 10);
      return num.toLocaleString('en-US', {
        minimumFractionDigits: dec,
        maximumFractionDigits: dec,
      });
    });

    hb.registerHelper('formatCurrency', function (value: any, prefix: any) {
      if (value === undefined || value === null || value === '') return prefix && typeof prefix === 'string' ? `${prefix}0` : '0';
      const num = typeof value === 'number' ? value : parseFloat(String(value));
      if (isNaN(num)) return '0';
      const pfx = typeof prefix === 'string' ? prefix : 'Rp ';
      return `${pfx}${num.toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
    });

    hb.registerHelper('formatRupiah', function (value: any) {
      if (value === undefined || value === null || value === '') return 'Rp 0';
      const num = typeof value === 'number' ? value : parseFloat(String(value));
      if (isNaN(num)) return 'Rp 0';
      return `Rp ${num.toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
    });

    // 3. Date Formatting Helpers
    hb.registerHelper('formatDate', function (dateValue: any) {
      if (!dateValue) return '-';
      try {
        const d = new Date(dateValue);
        if (isNaN(d.getTime())) return String(dateValue);
        return d.toLocaleDateString('id-ID', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });
      } catch {
        return String(dateValue);
      }
    });

    // 4. Arithmetic Helpers
    hb.registerHelper('add', function (a: any, b: any) {
      return (Number(a || 0) + Number(b || 0));
    });

    hb.registerHelper('sub', function (a: any, b: any) {
      return (Number(a || 0) - Number(b || 0));
    });

    hb.registerHelper('multiply', function (a: any, b: any) {
      return (Number(a || 0) * Number(b || 0));
    });

    hb.registerHelper('divide', function (a: any, b: any) {
      const divisor = Number(b || 1);
      return divisor === 0 ? 0 : Number(a || 0) / divisor;
    });

    // 5. Logical and Comparison Helpers
    hb.registerHelper('eq', function (a: any, b: any) {
      return a === b;
    });

    hb.registerHelper('ne', function (a: any, b: any) {
      return a !== b;
    });

    hb.registerHelper('gt', function (a: any, b: any) {
      return Number(a) > Number(b);
    });

    hb.registerHelper('gte', function (a: any, b: any) {
      return Number(a) >= Number(b);
    });

    hb.registerHelper('lt', function (a: any, b: any) {
      return Number(a) < Number(b);
    });

    hb.registerHelper('lte', function (a: any, b: any) {
      return Number(a) <= Number(b);
    });

    hb.registerHelper('and', function (...args: any[]) {
      // Last argument is handlebars options object
      const conditions = args.slice(0, -1);
      return conditions.every(Boolean);
    });

    hb.registerHelper('or', function (...args: any[]) {
      const conditions = args.slice(0, -1);
      return conditions.some(Boolean);
    });

    hb.registerHelper('not', function (value: any) {
      return !value;
    });

    // 6. String and Fallback Helpers (PRD Section 9: Error handling fallback text)
    hb.registerHelper('default', function (...args: any[]) {
      const values = args.slice(0, -1);
      for (const val of values) {
        if (val !== undefined && val !== null && val !== '') {
          return val;
        }
      }
      const lastArg = values[values.length - 1];
      if (lastArg === '') return '';
      return 'N/A';
    });

    hb.registerHelper('upper', function (str: any) {
      return String(str || '').toUpperCase();
    });

    hb.registerHelper('lower', function (str: any) {
      return String(str || '').toLowerCase();
    });

    hb.registerHelper('ternary', function (condition: any, trueVal: any, falseVal: any) {
      return condition ? trueVal : falseVal;
    });

    hb.registerHelper('json', function (obj: any) {
      try {
        return JSON.stringify(obj);
      } catch {
        return '';
      }
    });

    hb.registerHelper('count', function (arr: any) {
      if (typeof arr === 'string') return arr.length;
      return Array.isArray(arr) ? arr.length : 0;
    });

    hb.registerHelper('sumBy', function (arr: any, key: any) {
      if (!Array.isArray(arr)) return 0;
      const prop = typeof key === 'string' ? key : 'qty';
      return arr.reduce((acc, curr) => {
        const val = curr && typeof curr === 'object' ? curr[prop] : 0;
        const num = typeof val === 'number' ? val : parseFloat(String(val || 0));
        return acc + (isNaN(num) ? 0 : num);
      }, 0);
    });
  }

  /**
   * Bind dynamic JSON data into template XML string using Handlebars
   * Implements PRD Section 5.3 (Data Binding)
   */
  public static bindData(templateXml: string, data: any): string {
    if (!templateXml) {
      throw new Error('Template XML tidak boleh kosong');
    }

    const hb = this.getHandlebarsInstance();
    const safeData = data && typeof data === 'object' ? data : {};

    try {
      const compiled = hb.compile(templateXml, { noEscape: false });
      return compiled(safeData);
    } catch (err: any) {
      throw new Error(`Data binding error (Handlebars): ${err.message}`);
    }
  }
}

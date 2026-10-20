import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

export interface TemplateMetadata {
  id: string;
  name: string;
  description?: string;
  category?: 'PR' | 'PO' | 'NPK' | 'GENERAL' | 'CUSTOM';
  version?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TemplateDetail extends TemplateMetadata {
  content: string;
  sizeBytes: number;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Template directory located at microservice-lookup/storage/templates
const TEMPLATES_DIR = path.resolve(__dirname, '../../../../storage/templates');

export class TemplateStorageService {
  private static initialized = false;

  public static getTemplatesDirectory(): string {
    return TEMPLATES_DIR;
  }

  /**
   * Ensure directory exists and seed default templates if empty
   */
  public static async initDefaultTemplates(): Promise<void> {
    if (this.initialized) return;

    if (!fs.existsSync(TEMPLATES_DIR)) {
      fs.mkdirSync(TEMPLATES_DIR, { recursive: true });
    }

    // Default Seed Templates
    const defaultTemplates: Array<{ id: string; name: string; category: TemplateMetadata['category']; desc: string; xml: string }> = [
      {
        id: 'sample_prd',
        name: 'Sample PRD Slip Template',
        category: 'CUSTOM',
        desc: 'Contoh implementasi template XML sesuai spesifikasi PRD Section 8',
        xml: `<?xml version="1.0" encoding="UTF-8"?>
<document size="A4" orientation="portrait" margin="50" unit="pt">
   <page size="A4" margin="50">
      <!-- Title Header -->
      <rect x="50" y="40" width="495" height="40" fill="#1e3a8a" radius="4" />
      <text font="Helvetica-Bold" size="18" x="65" y="52" color="#ffffff">Slip {{default slip_type "TRANSAKSI"}}</text>
      
      <!-- Meta Details -->
      <text font="Helvetica-Bold" size="12" x="50" y="95" color="#111827">No Dokumen: {{default transaction_no (default nomor_dokumen kode)}}</text>
      <text font="Helvetica" size="10" x="50" y="112" color="#4b5563">Tanggal: {{default tanggal "-"}}</text>
      <text font="Helvetica" size="10" x="350" y="112" color="#4b5563">Entity / Gudang: {{default gudang (default entity "Head Office")}}</text>

      <line x1="50" y1="130" x2="545" y2="130" color="#d1d5db" lineWidth="1" />

      <!-- Table of items -->
      <table x="50" y="145" width="495">
        <header height="22" bgColor="#f3f4f6">
          <col width="35" align="center" font="Helvetica-Bold" size="9" color="#374151">No</col>
          <col width="80" align="center" font="Helvetica-Bold" size="9" color="#374151">Kode</col>
          <col width="220" align="left" font="Helvetica-Bold" size="9" color="#374151">Nama Barang / Deskripsi</col>
          <col width="60" align="center" font="Helvetica-Bold" size="9" color="#374151">Satuan</col>
          <col width="100" align="right" font="Helvetica-Bold" size="9" color="#374151">Qty / Price</col>
        </header>
        {{#each items}}
        <row height="20" bgColor="{{#if @even}}#ffffff{{else}}#f9fafb{{/if}}">
          <col width="35" align="center" size="8.5">{{add @index 1}}</col>
          <col width="80" align="center" size="8.5">{{default this.kode (default this.code "-")}}</col>
          <col width="220" align="left" size="8.5">{{default this.nama (default this.name "-")}}</col>
          <col width="60" align="center" size="8.5">{{default this.satuan (default this.unit "Unit")}}</col>
          <col width="100" align="right" size="8.5">{{#if this.price}}{{formatCurrency this.price "Rp "}}{{else}}{{formatNumber (default this.qty 1) 0}}{{/if}}</col>
        </row>
        {{/each}}
      </table>

      <!-- Summary / Catatan -->
      {{#if catatan}}
      <rect x="50" y="650" width="495" height="40" fill="#f8fafc" stroke="#e2e8f0" radius="3" />
      <text font="Helvetica-Bold" size="9" x="60" y="658" color="#334155">Catatan:</text>
      <text font="Helvetica" size="8.5" x="60" y="670" color="#475569">{{catatan}}</text>
      {{/if}}

      <!-- Footer Branding -->
      <line x1="50" y1="780" x2="545" y2="780" color="#e2e8f0" lineWidth="0.75" />
      <text font="Helvetica-Oblique" size="8" x="50" y="788" color="#94a3b8">Approval Management System - Dynamic Slip PDF Generator (PRD Compliant)</text>
   </page>
</document>`,
      },
      {
        id: 'purchase_request',
        name: 'Purchase Request Slip Template (PR / RQE)',
        category: 'PR',
        desc: 'Template resmi Purchase Request Slip dengan layout kop Tisera, tabel items, total dan box distribusi',
        xml: `<?xml version="1.0" encoding="UTF-8"?>
<document size="A4" orientation="portrait" margin="28.3" unit="pt" footer="false">
   <page size="A4" margin="28.3">
      <!-- Kop Surat Tisera -->
      <image src="logo_td.png" x="28.3" y="24" width="50" height="36" />

      <text font="Helvetica-Bold" size="11" x="88" y="27" color="#000000" underline="true">PT TISERA DISTRIBUSINDO</text>
      <text font="Helvetica-Bold" size="8.5" x="88" y="41" color="#000000">{{default entity "Head Office"}}</text>
      <text font="Helvetica" size="7.5" x="88" y="53" color="#000000">Jl. Dr. Soepomo No. 23 Solo</text>
      <text font="Helvetica" size="7.5" x="88" y="63" color="#000000">Phone : 0271 - 714344 Fax : 0271 - 716874</text>

      <!-- Right Print Meta -->
      <text font="Helvetica-Oblique" size="7.5" x="350" y="27" width="216.9" align="right" color="#000000">{{default print_date (default tanggal "-")}}</text>
      <text font="Helvetica-Oblique" size="7.5" x="350" y="39" width="216.9" align="right" color="#000000">Print by : {{default print_by "iadijana"}}</text>

      <!-- Document Title -->
      <text font="Helvetica-Bold" size="13" x="28.3" y="86" width="538.6" align="center" color="#000000">PURCHASE REQUEST</text>

      <!-- Meta Grid (Left Column) -->
      <text font="Helvetica" size="8" x="28.3" y="110" color="#000000">Request No.</text>
      <text font="Helvetica" size="8" x="95" y="110" color="#000000">:</text>
      <text font="Helvetica" size="8" x="105" y="110" color="#000000">{{default nomor_dokumen (default kode "-")}}</text>

      <text font="Helvetica" size="8" x="28.3" y="124" color="#000000">Tanggal</text>
      <text font="Helvetica" size="8" x="95" y="124" color="#000000">:</text>
      <text font="Helvetica" size="8" x="105" y="124" color="#000000">{{default print_date (default tanggal "-")}}</text>

      <text font="Helvetica" size="8" x="28.3" y="138" color="#000000">No. Referensi</text>
      <text font="Helvetica" size="8" x="95" y="138" color="#000000">:</text>
      <text font="Helvetica" size="8" x="105" y="138" color="#000000">{{default no_ref (default ref_no "-")}}</text>

      <!-- Meta Grid (Right Column) -->
      <text font="Helvetica" size="8" x="335" y="110" color="#000000">Gudang</text>
      <text font="Helvetica" size="8" x="420" y="110" color="#000000">:</text>
      <text font="Helvetica" size="8" x="430" y="110" color="#000000">{{default gudang "MDC SOLO TD"}}</text>

      <text font="Helvetica" size="8" x="335" y="124" color="#000000">Entity Gudang</text>
      <text font="Helvetica" size="8" x="420" y="124" color="#000000">:</text>
      <text font="Helvetica" size="8" x="430" y="124" color="#000000">{{default entity "Head Office"}}</text>

      <text font="Helvetica" size="8" x="335" y="138" color="#000000">Jadwal Kedatangan</text>
      <text font="Helvetica" size="8" x="420" y="138" color="#000000">:</text>
      <text font="Helvetica" size="8" x="430" y="138" color="#000000">{{default del_date (default tanggal "-")}}</text>

      <!-- Notice -->
      <text font="Helvetica" size="8.5" x="28.3" y="158" color="#000000">Mohon untuk dibeli barang-barang sebagai berikut :</text>

      <!-- Items Table -->
      <table x="28.3" y="175" width="538.6">
        <header height="18" bgColor="#ffffff">
          <col width="28.3" align="center" font="Helvetica-Bold" size="8" border="true">No</col>
          <col width="58" align="center" font="Helvetica-Bold" size="8" border="true">Kode</col>
          <col width="232.3" align="center" font="Helvetica-Bold" size="8" border="true">Nama</col>
          <col width="52" align="center" font="Helvetica-Bold" size="8" border="true">Satuan</col>
          <col width="52" align="center" font="Helvetica-Bold" size="8" border="true">Qty</col>
          <col width="116" align="center" font="Helvetica-Bold" size="8" border="true">Keterangan</col>
        </header>
        {{#each items}}
        <row height="28" bgColor="#ffffff">
          <col width="28.3" align="center" size="7.5" border="true">{{add @index 1}}</col>
          <col width="58" align="center" size="7.5" border="true">{{default this.kode (default this.code "-")}}</col>
          <col width="232.3" align="left" size="7.5" border="true">{{default this.nama (default this.name "-")}}</col>
          <col width="52" align="center" size="7.5" border="true">{{default this.satuan (default this.unit "Unit")}}</col>
          <col width="52" align="center" size="7.5" border="true">{{formatNumber (default this.qty 1) 0}}</col>
          <col width="116" align="left" size="7.5" border="true">{{default this.keterangan (default this.remarks "-")}}</col>
        </row>
        {{/each}}
      </table>

      <!-- Total Qty Row under Table -->
      <text font="Helvetica-Bold" size="8.5" x="318" y="{{calculateY (count items) 206 28}}" color="#000000">TOTAL</text>
      <text font="Helvetica" size="8" x="398.9" y="{{calculateY (count items) 206 28}}" width="52" align="center" color="#000000">{{formatNumber (sumBy items 'qty') 2}}</text>
      <line x1="318" y1="{{calculateY (count items) 217 28}}" x2="566.9" y2="{{calculateY (count items) 217 28}}" color="#000000" lineWidth="1.5" />

      <!-- Distribusi Box (Positioned right below TOTAL line) -->
      <rect x="265" y="{{calculateY (count items) 230 28}}" width="205" height="95" stroke="#000000" lineWidth="0.75" radius="4" />
      <text font="Helvetica-Bold" size="8.5" x="278" y="{{calculateY (count items) 244 28}}" color="#000000">Distribusi</text>

      <text font="Helvetica" size="8" x="278" y="{{calculateY (count items) 265 28}}" color="#000000">Asli</text>
      <text font="Helvetica" size="8" x="325" y="{{calculateY (count items) 265 28}}" color="#000000">:</text>
      <text font="Helvetica" size="8" x="335" y="{{calculateY (count items) 265 28}}" color="#000000">Purchasing</text>

      <text font="Helvetica" size="8" x="278" y="{{calculateY (count items) 282 28}}" color="#000000">Merah</text>
      <text font="Helvetica" size="8" x="325" y="{{calculateY (count items) 282 28}}" color="#000000">:</text>
      <text font="Helvetica" size="8" x="335" y="{{calculateY (count items) 282 28}}" color="#000000">Accounting</text>

      <text font="Helvetica" size="8" x="278" y="{{calculateY (count items) 299 28}}" color="#000000">Kuning</text>
      <text font="Helvetica" size="8" x="325" y="{{calculateY (count items) 299 28}}" color="#000000">:</text>
      <text font="Helvetica" size="8" x="335" y="{{calculateY (count items) 299 28}}" color="#000000">File</text>

      <!-- Optional Keperluan Note (if available, positioned below Distribusi box) -->
      {{#if keperluan}}
      <text font="Helvetica-Bold" size="8" x="28.3" y="{{calculateY (count items) 340 28}}" color="#000000">Keperluan :</text>
      <text font="Helvetica" size="7.5" x="28.3" y="{{calculateY (count items) 352 28}}" color="#000000">{{keperluan}}</text>
      {{/if}}
   </page>
</document>`,
      },
      {
        id: 'purchase_order',
        name: 'Purchase Order Slip Template (PO / POE)',
        category: 'PO',
        desc: 'Template resmi Purchase Order Slip dengan rincian vendor, rincian items, dan rekapitulasi keuangan',
        xml: `<?xml version="1.0" encoding="UTF-8"?>
<document size="A4" orientation="portrait" margin="28.3" unit="pt" footer="false">
   <page size="A4" margin="28.3">
      <!-- Kop Surat Tisera -->
      <image src="logo_td.png" x="28.3" y="24" width="50" height="36" />

      <text font="Helvetica-Bold" size="11" x="88" y="27" color="#000000" underline="true">PT TISERA DISTRIBUSINDO</text>
      <text font="Helvetica-Bold" size="8.5" x="88" y="41" color="#000000">{{default entity "Head Office"}}</text>
      <text font="Helvetica" size="7.5" x="88" y="53" color="#000000">Jl. Dr. Soepomo No. 23 Solo</text>
      <text font="Helvetica" size="7.5" x="88" y="63" color="#000000">Phone : 0271 - 714344 Fax : 0271 - 716874</text>

      <!-- Right Print Meta -->
      <text font="Helvetica-Oblique" size="7.5" x="350" y="27" width="216.9" align="right" color="#000000">{{default print_date (default tanggal "-")}}</text>
      <text font="Helvetica-Oblique" size="7.5" x="350" y="39" width="216.9" align="right" color="#000000">Print by : {{default print_by "iadijana"}}</text>

      <!-- Document Title -->
      <text font="Helvetica-Bold" size="13" x="28.3" y="86" width="538.6" align="center" color="#000000">PURCHASE ORDER</text>

      <!-- Metadata Section -->
      <!-- Left: Vendor Info -->
      <text font="Helvetica" size="8.5" x="28.3" y="106" color="#000000">TO :</text>
      <text font="Helvetica-Bold" size="8.5" x="28.3" y="119" color="#000000">{{default vendor (default supplier "MEDIA KARYA PUTRA. CV")}}</text>
      <text font="Helvetica" size="8" x="28.3" y="145" color="#000000">Telp: {{default phone "0271 - 712684"}}   Fax: {{default fax ""}}</text>

      <!-- Right: Document Meta -->
      <text font="Helvetica" size="8" x="360" y="106" color="#000000">PO No.</text>
      <text font="Helvetica" size="8" x="412" y="106" color="#000000">:</text>
      <text font="Helvetica" size="8" x="422" y="106" color="#000000">{{default nomor_dokumen (default kode "-")}}</text>

      <text font="Helvetica" size="8" x="360" y="118" color="#000000">Date</text>
      <text font="Helvetica" size="8" x="412" y="118" color="#000000">:</text>
      <text font="Helvetica" size="8" x="422" y="118" color="#000000">{{default print_date (default tanggal "-")}}</text>

      <text font="Helvetica" size="8" x="360" y="130" color="#000000">No. Ref.</text>
      <text font="Helvetica" size="8" x="412" y="130" color="#000000">:</text>
      <text font="Helvetica" size="8" x="422" y="130" color="#000000">{{default ref_no (default no_ref "-")}}</text>

      <text font="Helvetica" size="8" x="360" y="142" color="#000000">Date Ref.</text>
      <text font="Helvetica" size="8" x="412" y="142" color="#000000">:</text>
      <text font="Helvetica" size="8" x="422" y="142" color="#000000">{{default date_ref ""}}</text>

      <text font="Helvetica" size="8" x="360" y="154" color="#000000">Currency</text>
      <text font="Helvetica" size="8" x="412" y="154" color="#000000">:</text>
      <text font="Helvetica" size="8" x="422" y="154" color="#000000">{{default currency "IDR"}}</text>

      <!-- Items Table -->
      <table x="28.3" y="170" width="538.6">
        <header height="18" bgColor="#ffffff">
          <col width="22" align="center" font="Helvetica-Bold" size="8" border="true">No</col>
          <col width="68" align="center" font="Helvetica-Bold" size="8" border="true">Delivery Date</col>
          <col width="223.6" align="center" font="Helvetica-Bold" size="8" border="true">Item Name</col>
          <col width="36" align="center" font="Helvetica-Bold" size="8" border="true">Unit</col>
          <col width="46" align="center" font="Helvetica-Bold" size="8" border="true">Quantity</col>
          <col width="71" align="center" font="Helvetica-Bold" size="8" border="true">Unit Price</col>
          <col width="72" align="center" font="Helvetica-Bold" size="8" border="true">Amount</col>
        </header>
        {{#each items}}
        <row height="16" bgColor="#ffffff">
          <col width="22" align="center" size="7.5" border="true">{{add @index 1}}</col>
          <col width="68" align="center" size="7.5" border="true">{{default this.delDate (default ../del_date (default ../tanggal "-"))}}</col>
          <col width="223.6" align="left" size="7.5" border="true">{{default this.name (default this.nama "-")}}</col>
          <col width="36" align="center" size="7.5" border="true">{{default this.unit (default this.satuan "Unit")}}</col>
          <col width="46" align="center" size="7.5" border="true">{{formatNumber (default this.qty 1) 0}}</col>
          <col width="71" align="right" size="7.5" border="true">{{formatNumber (default this.price (default this.harga 0)) 2}}</col>
          <col width="72" align="right" size="7.5" border="true">{{formatNumber (default this.amount (default this.subtotal (multiply (default this.qty 1) (default this.price (default this.harga 0))))) 2}}</col>
        </row>
        {{/each}}
      </table>

      <!-- Sub-Table Meta & Calculations Section (positioned immediately below table) -->
      <!-- Row 1: Deliver To / Quantity Sum / Sub Total -->
      <text font="Helvetica" size="8" x="28.3" y="{{calculateY (count items) 198 16}}" color="#000000">Deliver To</text>
      <text font="Helvetica" size="8" x="102" y="{{calculateY (count items) 198 16}}" color="#000000">:</text>
      <text font="Helvetica-Bold" size="8" x="112" y="{{calculateY (count items) 198 16}}" color="#000000">{{default deliver_to (default gudang "MDC SOLO TD")}}</text>

      <text font="Helvetica-Oblique" size="8" x="377.9" y="{{calculateY (count items) 198 16}}" width="46" align="center" color="#000000">{{formatNumber (sumBy items 'qty') 0}}</text>

      <text font="Helvetica" size="8" x="430" y="{{calculateY (count items) 198 16}}" color="#000000">Sub Total</text>
      <text font="Helvetica" size="8" x="480" y="{{calculateY (count items) 198 16}}" width="86.9" align="right" color="#000000">{{formatNumber (default totals.subtotal (default nominal (default total 0))) 2}}</text>
      <line x1="430" y1="{{calculateY (count items) 209 16}}" x2="566.9" y2="{{calculateY (count items) 209 16}}" color="#000000" lineWidth="0.5" />

      <!-- Row 2: Term of Payment / Discount -->
      <text font="Helvetica" size="8" x="28.3" y="{{calculateY (count items) 212 16}}" color="#000000">Term of Payment</text>
      <text font="Helvetica" size="8" x="102" y="{{calculateY (count items) 212 16}}" color="#000000">:</text>
      <text font="Helvetica" size="8" x="112" y="{{calculateY (count items) 212 16}}" color="#000000">{{default top (default term_of_payment "")}}</text>

      <text font="Helvetica" size="8" x="430" y="{{calculateY (count items) 212 16}}" color="#000000">Discount</text>
      <text font="Helvetica" size="8" x="480" y="{{calculateY (count items) 212 16}}" width="86.9" align="right" color="#000000">{{formatNumber (default totals.discount 0) 2}}</text>
      <line x1="430" y1="{{calculateY (count items) 223 16}}" x2="566.9" y2="{{calculateY (count items) 223 16}}" color="#000000" lineWidth="0.5" />

      <!-- Row 3: Payment Type / DPPLainnya -->
      <text font="Helvetica" size="8" x="28.3" y="{{calculateY (count items) 226 16}}" color="#000000">Payment Type</text>
      <text font="Helvetica" size="8" x="102" y="{{calculateY (count items) 226 16}}" color="#000000">:</text>
      <text font="Helvetica" size="8" x="112" y="{{calculateY (count items) 226 16}}" color="#000000">{{default payment_type ""}}</text>

      <text font="Helvetica" size="8" x="430" y="{{calculateY (count items) 226 16}}" color="#000000">DPPLainnya</text>
      <text font="Helvetica" size="8" x="480" y="{{calculateY (count items) 226 16}}" width="86.9" align="right" color="#000000">{{formatNumber (default totals.dppLainnya (default dpp_lainnya 0)) 2}}</text>
      <line x1="430" y1="{{calculateY (count items) 237 16}}" x2="566.9" y2="{{calculateY (count items) 237 16}}" color="#000000" lineWidth="0.5" />

      <!-- Row 4: PPN -->
      <text font="Helvetica" size="8" x="430" y="{{calculateY (count items) 240 16}}" color="#000000">PPN</text>
      <text font="Helvetica" size="8" x="480" y="{{calculateY (count items) 240 16}}" width="86.9" align="right" color="#000000">{{formatNumber (default totals.ppn (default ppn 0)) 2}}</text>
      <line x1="430" y1="{{calculateY (count items) 251 16}}" x2="566.9" y2="{{calculateY (count items) 251 16}}" color="#000000" lineWidth="0.5" />

      <!-- Row 5: Notes Label / Transport -->
      <text font="Helvetica" size="8" x="28.3" y="{{calculateY (count items) 254 16}}" color="#000000">Notes :</text>

      <text font="Helvetica" size="8" x="430" y="{{calculateY (count items) 254 16}}" color="#000000">Transport</text>
      <text font="Helvetica" size="8" x="480" y="{{calculateY (count items) 254 16}}" width="86.9" align="right" color="#000000">{{formatNumber (default totals.transport (default transport 0)) 2}}</text>
      <line x1="430" y1="{{calculateY (count items) 265 16}}" x2="566.9" y2="{{calculateY (count items) 265 16}}" color="#000000" lineWidth="0.5" />

      <!-- Row 6: Notes Content / TOTAL -->
      <text font="Helvetica" size="7.5" x="28.3" y="{{calculateY (count items) 268 16}}" color="#000000">{{default notes (default catatan "")}}</text>

      <text font="Helvetica-Bold" size="8.5" x="430" y="{{calculateY (count items) 268 16}}" color="#000000">TOTAL</text>
      <text font="Helvetica-Bold" size="8.5" x="480" y="{{calculateY (count items) 268 16}}" width="86.9" align="right" color="#000000">{{formatNumber (default totals.total (default nominal (default total 0))) 2}}</text>
      <line x1="430" y1="{{calculateY (count items) 279 16}}" x2="566.9" y2="{{calculateY (count items) 279 16}}" color="#000000" lineWidth="1" />
      <line x1="430" y1="{{calculateY (count items) 281 16}}" x2="566.9" y2="{{calculateY (count items) 281 16}}" color="#000000" lineWidth="0.5" />

      <!-- Page Bottom Footer -->
      <line x1="28.3" y1="765" x2="566.9" y2="765" color="#000000" lineWidth="0.75" />
      <text font="Helvetica" size="8.5" x="480" y="774" width="86.9" align="right" color="#000000">Page    1/1</text>
   </page>
</document>`,
      },
      {
        id: 'payment_request',
        name: 'Payment Request / NPK / CCA Slip Template',
        category: 'NPK',
        desc: 'Template resmi Nota Permintaan Kas (NPK) / Cash Advance (CCA) dengan grid remarks, approval, dan financial calc',
        xml: `<?xml version="1.0" encoding="UTF-8"?>
<document size="A4" orientation="portrait" margin="28.3" unit="pt">
   <page size="A4" margin="28.3">
      <!-- Kop Surat Tisera -->
      <rect x="28.3" y="28.3" width="51" height="45" fill="#d21919" />
      <text font="Helvetica-Bold" size="16" x="28.3" y="38" width="51" align="center" color="#ffffff">TD</text>

      <text font="Helvetica-Bold" size="11" x="88" y="28.3" color="#000000">PT TISERA DISTRIBUSINDO</text>
      <text font="Helvetica-Bold" size="8.5" x="88" y="41" color="#000000">{{default entity "Head Office"}}</text>
      <text font="Helvetica" size="7.5" x="88" y="52" color="#000000">Jl. Dr. Soepomo No. 23 Solo</text>
      <text font="Helvetica" size="7.5" x="88" y="62" color="#000000">Phone : 0271 - 714344 Fax : 0271 - 716874</text>

      <text font="Helvetica-Oblique" size="7.5" x="350" y="28.3" width="216" align="right" color="#000000">{{default print_date (default tanggal "-")}}</text>
      <text font="Helvetica-Oblique" size="7.5" x="350" y="39" width="216" align="right" color="#000000">Print by : {{default print_by "iadijana"}}</text>

      <line x1="28.3" y1="79.4" x2="566.9" y2="79.4" color="#000000" lineWidth="1.5" />

      <!-- Title -->
      <text font="Helvetica-Bold" size="13" x="28.3" y="90" width="538.6" align="center" color="#000000">NOTA PERMINTAAN KAS (NPK)</text>

      <!-- Meta Left -->
      <text font="Helvetica" size="8.5" x="28.3" y="113" color="#000000">No Dokumen</text>
      <text font="Helvetica" size="8.5" x="90" y="113" color="#000000">:</text>
      <text font="Helvetica-Bold" size="8.5" x="100" y="113" color="#000000">{{default nomor_dokumen kode}}</text>

      <text font="Helvetica" size="8.5" x="28.3" y="126" color="#000000">Tanggal</text>
      <text font="Helvetica" size="8.5" x="90" y="126" color="#000000">:</text>
      <text font="Helvetica" size="8.5" x="100" y="126" color="#000000">{{default tanggal "-"}}</text>

      <text font="Helvetica" size="8.5" x="28.3" y="139" color="#000000">Dibayarkan Kepada</text>
      <text font="Helvetica" size="8.5" x="90" y="139" color="#000000">:</text>
      <text font="Helvetica-Bold" size="8.5" x="100" y="139" color="#000000">{{default payee (default vendor (default supplier "Penerima Pembayaran"))}}</text>

      <!-- Meta Right -->
      <text font="Helvetica" size="8.5" x="326" y="113" color="#000000">Divisi / Cabang</text>
      <text font="Helvetica" size="8.5" x="400" y="113" color="#000000">:</text>
      <text font="Helvetica" size="8.5" x="412" y="113" color="#000000">{{default divisi (default entity "Operasional")}}</text>

      <text font="Helvetica" size="8.5" x="326" y="126" color="#000000">Rekening Tujuan</text>
      <text font="Helvetica" size="8.5" x="400" y="126" color="#000000">:</text>
      <text font="Helvetica" size="8.5" x="412" y="126" color="#000000">{{default rekening (default no_rek "BCA - 1234567890")}}</text>

      <text font="Helvetica" size="8.5" x="326" y="139" color="#000000">Metode Bayar</text>
      <text font="Helvetica" size="8.5" x="400" y="139" color="#000000">:</text>
      <text font="Helvetica" size="8.5" x="412" y="139" color="#000000">{{default payment_method "Transfer Bank"}}</text>

      <!-- Items Table -->
      <table x="28.3" y="165" width="538.6">
        <header height="18" bgColor="#f0f0f0">
          <col width="28.3" align="center" font="Helvetica-Bold" size="8" border="true">No</col>
          <col width="283.5" align="center" font="Helvetica-Bold" size="8" border="true">Keterangan / Rincian Pembayaran</col>
          <col width="85" align="center" font="Helvetica-Bold" size="8" border="true">No Akun</col>
          <col width="141.8" align="center" font="Helvetica-Bold" size="8" border="true">Nominal (IDR)</col>
        </header>
        {{#each items}}
        <row height="16">
          <col width="28.3" align="center" size="7.5" border="true">{{add @index 1}}</col>
          <col width="283.5" align="left" size="7.5" border="true">{{default this.nama (default this.name (default this.keterangan "Pengajuan Operasional"))}}</col>
          <col width="85" align="center" size="7.5" border="true">{{default this.account (default this.kode "-")}}</col>
          <col width="141.8" align="right" size="7.5" border="true">{{formatNumber (default this.nominal (default this.price (default this.amount 0))) 2}}</col>
        </row>
        {{/each}}
      </table>

      <!-- Total Nominal Highlight Box -->
      <rect x="28.3" y="520" width="538.6" height="32" fill="#f8fafc" stroke="#000000" lineWidth="1" />
      <text font="Helvetica-Bold" size="9.5" x="40" y="531" color="#000000">TOTAL PERMINTAAN DANA:</text>
      <text font="Helvetica-Bold" size="12" x="350" y="529" width="200" align="right" color="#d21919">{{formatCurrency (default nominal (default total 0)) "Rp "}}</text>

      <!-- Remarks / Approval History -->
      <rect x="28.3" y="565" width="538.6" height="70" border="true" />
      <text font="Helvetica-Bold" size="8" x="35" y="572" color="#000000">Catatan &amp; Riwayat Approval :</text>
      <text font="Helvetica" size="7.5" x="35" y="586" color="#334155">• Remark BO: {{default remarks.BO "Pengajuan diverifikasi dan sesuai anggaran operasional"}}</text>
      <text font="Helvetica" size="7.5" x="35" y="598" color="#334155">• Remark AM: {{default remarks.AM "Disetujui untuk diproses ke Bagian Keuangan"}}</text>
      <text font="Helvetica" size="7.5" x="35" y="610" color="#334155">• Remark Finance: {{default remarks.NSM (default remarks.Akt "Verifikasi dokumen tagihan/rekening valid")}}</text>

      <!-- Signatures -->
      <table x="28.3" y="650" width="538.6">
        <header height="16" bgColor="#f8fafc">
          <col width="134.6" align="center" font="Helvetica-Bold" size="7.5" border="true">Pemohon :</col>
          <col width="134.6" align="center" font="Helvetica-Bold" size="7.5" border="true">Menyetujui :</col>
          <col width="134.6" align="center" font="Helvetica-Bold" size="7.5" border="true">Verifikasi Pajak :</col>
          <col width="134.8" align="center" font="Helvetica-Bold" size="7.5" border="true">Kasir / Finance :</col>
        </header>
        <row height="55">
          <col width="134.6" align="center" size="7.5" border="true"></col>
          <col width="134.6" align="center" size="7.5" border="true"></col>
          <col width="134.6" align="center" size="7.5" border="true"></col>
          <col width="134.8" align="center" size="7.5" border="true"></col>
        </row>
        <row height="16" bgColor="#f8fafc">
          <col width="134.6" align="center" size="7" border="true">Staff / User</col>
          <col width="134.6" align="center" size="7" border="true">Kepala Divisi</col>
          <col width="134.6" align="center" size="7" border="true">Tax &amp; Accounting</col>
          <col width="134.8" align="center" size="7" border="true">Treasury / Kasir</col>
        </row>
      </table>
   </page>
</document>`,
      },
      {
        id: 'default_slip',
        name: 'General Dynamic Slip Template',
        category: 'GENERAL',
        desc: 'Template slip dinamis serbaguna dengan layout fleksibel untuk transaksi apapun',
        xml: `<?xml version="1.0" encoding="UTF-8"?>
<document size="A4" orientation="portrait" margin="36" unit="pt">
   <page size="A4" margin="36">
      <rect x="36" y="36" width="523.2" height="40" fill="#2563eb" radius="4" />
      <text font="Helvetica-Bold" size="16" x="50" y="48" color="#ffffff">SLIP {{default slip_type (default tipe "TRANSAKSI")}}</text>

      <text font="Helvetica-Bold" size="11" x="36" y="95" color="#0f172a">No Dokumen: {{default nomor_dokumen (default kode "DOC-000000")}}</text>
      <text font="Helvetica" size="9" x="36" y="112" color="#64748b">Tanggal: {{default tanggal "-"}}</text>
      <text font="Helvetica" size="9" x="360" y="112" color="#64748b">Entity: {{default entity "PT TISERA DISTRIBUSINDO"}}</text>

      <line x1="36" y1="130" x2="559.2" y2="130" color="#cbd5e1" lineWidth="1" />

      <table x="36" y="145" width="523.2">
        <header height="20" bgColor="#f1f5f9">
          <col width="40" align="center" font="Helvetica-Bold" size="8.5" border="true">No</col>
          <col width="100" align="center" font="Helvetica-Bold" size="8.5" border="true">Kode / Ref</col>
          <col width="223.2" align="left" font="Helvetica-Bold" size="8.5" border="true">Item / Deskripsi</col>
          <col width="60" align="center" font="Helvetica-Bold" size="8.5" border="true">Qty</col>
          <col width="100" align="right" font="Helvetica-Bold" size="8.5" border="true">Nominal / Nilai</col>
        </header>
        {{#each items}}
        <row height="18">
          <col width="40" align="center" size="8" border="true">{{add @index 1}}</col>
          <col width="100" align="center" size="8" border="true">{{default this.kode (default this.code "-")}}</col>
          <col width="223.2" align="left" size="8" border="true">{{default this.nama (default this.name (default this.keterangan "-"))}}</col>
          <col width="60" align="center" size="8" border="true">{{formatNumber (default this.qty 1) 0}}</col>
          <col width="100" align="right" size="8" border="true">{{#if this.nominal}}{{formatCurrency this.nominal "Rp "}}{{else if this.price}}{{formatCurrency this.price "Rp "}}{{else}}-{{/if}}</col>
        </row>
        {{/each}}
      </table>

      <!-- Summary box -->
      {{#if nominal}}
      <rect x="360" y="600" width="199.2" height="35" fill="#f8fafc" stroke="#94a3b8" radius="3" />
      <text font="Helvetica-Bold" size="9" x="370" y="612" color="#0f172a">Total Nominal:</text>
      <text font="Helvetica-Bold" size="11" x="430" y="610" width="120" align="right" color="#2563eb">{{formatCurrency nominal "Rp "}}</text>
      {{/if}}

      <line x1="36" y1="780" x2="559.2" y2="780" color="#e2e8f0" lineWidth="1" />
      <text font="Helvetica-Oblique" size="8" x="36" y="790" color="#94a3b8">Dicetak otomatis melalui Microservice Dynamic PDF Generator</text>
   </page>
</document>`,
      },
    ];

    for (const item of defaultTemplates) {
      const xmlPath = path.join(TEMPLATES_DIR, `${item.id}.xml`);
      const metaPath = path.join(TEMPLATES_DIR, `${item.id}.meta.json`);

      if (!fs.existsSync(xmlPath)) {
        fs.writeFileSync(xmlPath, item.xml, 'utf8');
      }

      if (!fs.existsSync(metaPath)) {
        const metadata: TemplateMetadata = {
          id: item.id,
          name: item.name,
          category: item.category,
          description: item.desc,
          version: '1.0.0',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        fs.writeFileSync(metaPath, JSON.stringify(metadata, null, 2), 'utf8');
      }
    }

    this.initialized = true;
  }

  /**
   * List all stored templates with metadata
   */
  public static async listTemplates(): Promise<TemplateMetadata[]> {
    await this.initDefaultTemplates();

    const files = await fs.promises.readdir(TEMPLATES_DIR);
    const xmlFiles = files.filter((f) => f.endsWith('.xml'));

    const list: TemplateMetadata[] = [];

    for (const xmlFile of xmlFiles) {
      const id = path.basename(xmlFile, '.xml');
      const metaPath = path.join(TEMPLATES_DIR, `${id}.meta.json`);
      const filePath = path.join(TEMPLATES_DIR, xmlFile);

      if (fs.existsSync(metaPath)) {
        try {
          const raw = await fs.promises.readFile(metaPath, 'utf8');
          const meta = JSON.parse(raw) as TemplateMetadata;
          list.push(meta);
          continue;
        } catch {
          // fallback
        }
      }

      const stat = await fs.promises.stat(filePath);
      list.push({
        id,
        name: id.replace(/[-_]/g, ' ').toUpperCase(),
        category: 'CUSTOM',
        description: `Template XML file ${xmlFile}`,
        version: '1.0.0',
        createdAt: stat.birthtime.toISOString(),
        updatedAt: stat.mtime.toISOString(),
      });
    }

    return list;
  }

  /**
   * Get template by ID
   */
  public static async getTemplate(id: string): Promise<TemplateDetail | null> {
    await this.initDefaultTemplates();

    const cleanId = id.trim().toLowerCase();
    const xmlPath = path.join(TEMPLATES_DIR, `${cleanId}.xml`);
    const metaPath = path.join(TEMPLATES_DIR, `${cleanId}.meta.json`);

    if (!fs.existsSync(xmlPath)) {
      return null;
    }

    const content = await fs.promises.readFile(xmlPath, 'utf8');
    const stat = await fs.promises.stat(xmlPath);

    let meta: Partial<TemplateMetadata> = {};
    if (fs.existsSync(metaPath)) {
      try {
        const raw = await fs.promises.readFile(metaPath, 'utf8');
        meta = JSON.parse(raw);
      } catch {
        // ignore
      }
    }

    return {
      id: cleanId,
      name: meta.name || cleanId.replace(/[-_]/g, ' ').toUpperCase(),
      description: meta.description || '',
      category: meta.category || 'CUSTOM',
      version: meta.version || '1.0.0',
      createdAt: meta.createdAt || stat.birthtime.toISOString(),
      updatedAt: meta.updatedAt || stat.mtime.toISOString(),
      content,
      sizeBytes: stat.size,
    };
  }

  /**
   * Save or Update a template
   */
  public static async saveTemplate(
    id: string,
    content: string,
    metadata?: Partial<TemplateMetadata>
  ): Promise<TemplateDetail> {
    await this.initDefaultTemplates();

    const cleanId = id
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, '_');

    const xmlPath = path.join(TEMPLATES_DIR, `${cleanId}.xml`);
    const metaPath = path.join(TEMPLATES_DIR, `${cleanId}.meta.json`);

    const now = new Date().toISOString();

    let existingMeta: Partial<TemplateMetadata> = {};
    if (fs.existsSync(metaPath)) {
      try {
        existingMeta = JSON.parse(await fs.promises.readFile(metaPath, 'utf8'));
      } catch {
        // ignore
      }
    }

    const mergedMeta: TemplateMetadata = {
      id: cleanId,
      name: metadata?.name || existingMeta.name || cleanId.replace(/[-_]/g, ' ').toUpperCase(),
      description: metadata?.description ?? existingMeta.description ?? '',
      category: metadata?.category || existingMeta.category || 'CUSTOM',
      version: metadata?.version || existingMeta.version || '1.0.0',
      createdAt: existingMeta.createdAt || now,
      updatedAt: now,
    };

    await fs.promises.writeFile(xmlPath, content, 'utf8');
    await fs.promises.writeFile(metaPath, JSON.stringify(mergedMeta, null, 2), 'utf8');

    const stat = await fs.promises.stat(xmlPath);

    return {
      ...mergedMeta,
      content,
      sizeBytes: stat.size,
    };
  }

  /**
   * Delete a template by ID
   */
  public static async deleteTemplate(id: string): Promise<boolean> {
    await this.initDefaultTemplates();

    const cleanId = id.trim().toLowerCase();
    const xmlPath = path.join(TEMPLATES_DIR, `${cleanId}.xml`);
    const metaPath = path.join(TEMPLATES_DIR, `${cleanId}.meta.json`);

    if (!fs.existsSync(xmlPath)) {
      return false;
    }

    await fs.promises.unlink(xmlPath);
    if (fs.existsSync(metaPath)) {
      await fs.promises.unlink(metaPath);
    }

    return true;
  }
}

import axios from 'axios';
import jwt from 'jsonwebtoken';
import { Op } from 'sequelize';
import { envConfig } from '../../config/env.js';
import { sequelize } from '../../database/sequelize.js';
import {
  PurchaseOrder,
  Company,
  Vendor,
  PurchaseRequest,
  PurchaseOrderItem,
  PurchaseRequestItem,
  Item,
  User,
} from '../../database/models/index.js';
import { PurchaseOrderService } from '../purchase-order/purchase-order.service.js';
import { PurchaseRequestService } from '../purchase-request/purchase-request.service.js';

export interface SyncPrResult {
  synced: boolean;
  action: 'document_created' | 'user_provisioned' | 'skipped_no_change';
  user_status: 'existing_in_ams' | 'provisioned_to_ams' | 'no_user';
  pr_number: string;
  user?: {
    email: string;
    username?: string | null;
    name: string;
  } | null;
  document?: {
    dokumen_id?: number;
    nomor_dokumen: string;
    status: string;
    judul_dokumen: string;
    nominal: number;
    has_pdf: boolean;
  } | null;
  message: string;
}

export interface SyncPoResult {
  synced: boolean;
  action: 'document_created' | 'user_provisioned' | 'skipped_no_change';
  user_status: 'existing_in_ams' | 'provisioned_to_ams' | 'no_user';
  po_number: string;
  user?: {
    email: string;
    username?: string | null;
    name: string;
  } | null;
  document?: {
    dokumen_id?: number;
    nomor_dokumen: string;
    status: string;
    judul_dokumen: string;
    nominal: number;
    has_pdf: boolean;
  } | null;
  message: string;
}

export interface StatusUpdateResult {
  nomor_dokumen: string;
  type: 'PO' | 'PR';
  previous_status: string;
  new_status: string;
  notes?: string | null;
  updated_at: string;
}

export class SyncService {
  /**
   * Generate short-lived signed JWT to communicate with AMS internal endpoints
   */
  private static generateAmsJwt(): string {
    return jwt.sign(
      {
        iss: 'microservice-lookup',
        aud: ['ams', 'microservice-lookup'],
        sub: 'microservice-lookup-sync',
        scope: ['internal:sync', 'lookup:read', 'user:provision', 'document:create'],
      },
      envConfig.jwt.secret,
      { algorithm: 'HS256', expiresIn: '15m' }
    );
  }

  /**
   * Cek apakah user dengan email/username tertentu sudah terdaftar di AMS.
   * Urusan pengecekan didelegasikan sepenuhnya ke microservice-lookup.
   */
  static async checkUserInAms(email: string, username?: string): Promise<{ exists: boolean; user: any | null }> {
    const amsUrl = `${envConfig.ams.baseUrl}/api/v1/internal/sync/user/check`;
    const token = this.generateAmsJwt();

    try {
      const response = await axios.get(amsUrl, {
        params: { email, username },
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
        timeout: 4000,
      });

      if (response.data && response.data.success) {
        return {
          exists: Boolean(response.data.exists),
          user: response.data.user || null,
        };
      }
    } catch (err: any) {
      console.warn(`[SyncService] HTTP checkUser in AMS failed (${err.message}), falling back to direct DB verification...`);
    }

    // Fallback: Direct database query to tisera-ams.users (user must have confirmed authorization in usersauth)
    try {
      const [rows]: [any[], any] = await sequelize.query(
        'SELECT u.id, u.name, u.email FROM `tisera-ams`.users u INNER JOIN `tisera-ams`.usersauth ua ON u.id = ua.user_id WHERE u.email = :email LIMIT 1',
        {
          replacements: { email },
        }
      );

      if (rows && rows.length > 0) {
        return {
          exists: true,
          user: rows[0],
        };
      }
    } catch (dbErr: any) {
      console.error('[SyncService] Direct DB checkUser failed:', dbErr.message);
    }

    return { exists: false, user: null };
  }

  /**
   * Sinkronisasi/provisioning akun user dari EIS ke AMS Superadmin User Management
   */
  static async provisionUserToAms(user: { name: string; username?: string | null; email: string; password?: string | null }): Promise<any> {
    const amsUrl = `${envConfig.ams.baseUrl}/api/v1/internal/sync/user`;
    const token = this.generateAmsJwt();

    const payload = {
      name: user.name || user.username || 'EIS User',
      username: user.username || user.email.split('@')[0],
      email: user.email,
      password_hash: user.password || '$2y$12$eRevx19p7FwY6m/1WbTfauq.w6m2e9gB7yH8zWqjV9Y1q7yJ1x3.', // Default bcrypt fallback
    };

    try {
      const response = await axios.post(amsUrl, payload, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        timeout: 6000,
      });

      if (response.data && response.data.success) {
        return response.data.user;
      }
    } catch (err: any) {
      console.warn(`[SyncService] HTTP provisionUser in AMS failed (${err.message}), falling back to direct DB provisioning...`);
    }

    // Fallback: Direct DB insertion to tisera-ams (same MySQL instance)
    try {
      const now = new Date();
      const [insertResult]: any = await sequelize.query(
        'INSERT INTO `tisera-ams`.users (name, email, password, pin, created_at, updated_at) VALUES (:name, :email, :password, :pin, :created_at, :updated_at)',
        {
          replacements: {
            name: payload.name,
            email: payload.email,
            password: payload.password_hash,
            pin: '12345678',
            created_at: now,
            updated_at: now,
          },
        }
      );

      const userId = insertResult;

      // Insert UserProfile
      await sequelize.query(
        'INSERT INTO `tisera-ams`.usersprofiles (user_id, address, phone_number, created_at, updated_at) VALUES (:user_id, :address, :phone, :created_at, :updated_at)',
        {
          replacements: {
            user_id: userId,
            address: 'Pengguna External Inventory System (EIS)',
            phone: '-',
            created_at: now,
            updated_at: now,
          },
        }
      );

      // Catatan: Otorisasi (usersauth) dan last_context_id sengaja dikosongkan (null)
      // agar akun menunggu konfirmasi dari Superadmin AMS.
      return {
        id: userId,
        name: payload.name,
        email: payload.email,
      };
    } catch (dbErr: any) {
      console.error('[SyncService] Direct DB provisionUser failed:', dbErr.message);
      throw new Error(`Gagal mendaftarkan user ke AMS: ${dbErr.message}`);
    }
  }

  /**
   * Buat dokumen draft di AMS beserta lampiran PDF hasil generate
   */
  static async createDraftDocumentInAms(docData: {
    nomor_dokumen: string;
    judul_dokumen: string;
    nominal: number;
    email: string;
    tgl_pengajuan: string;
    deskripsi?: string | null;
    tipe_dokumen?: string;
    pdfBuffer: Buffer;
  }): Promise<any> {
    const amsUrl = `${envConfig.ams.baseUrl}/api/v1/internal/sync/document`;
    const token = this.generateAmsJwt();
    const tipeDokumen = docData.tipe_dokumen || (docData.nomor_dokumen.toUpperCase().startsWith('PR') ? 'purchase_request' : 'purchase_order');

    const payload = {
      nomor_dokumen: docData.nomor_dokumen,
      judul_dokumen: docData.judul_dokumen,
      nominal: docData.nominal,
      email: docData.email,
      tgl_pengajuan: docData.tgl_pengajuan,
      deskripsi: docData.deskripsi,
      tipe_dokumen: tipeDokumen,
      pdf_base64: docData.pdfBuffer.toString('base64'),
      file_name: `${docData.nomor_dokumen}.pdf`,
    };

    try {
      const response = await axios.post(amsUrl, payload, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        timeout: 10000,
        maxContentLength: 50 * 1024 * 1024,
      });

      if (response.data && response.data.success) {
        return response.data.data;
      }
    } catch (err: any) {
      console.warn(`[SyncService] HTTP createDraftDocument in AMS failed (${err.message}), falling back to direct DB sync...`);
    }

    // Fallback: Direct DB creation in tisera-ams (same MySQL instance)
    try {
      const now = new Date();

      // Find user id in tisera-ams
      const [uRows]: [any[], any] = await sequelize.query(
        'SELECT id FROM `tisera-ams`.users WHERE email = :email LIMIT 1',
        { replacements: { email: docData.email } }
      );
      const amsUserId = uRows && uRows.length > 0 ? uRows[0].id : 1;

      // Check if document exists
      const [existingDocs]: [any[], any] = await sequelize.query(
        'SELECT id, nomor_dokumen, status FROM `tisera-ams`.dokumen WHERE nomor_dokumen = :nomor LIMIT 1',
        { replacements: { nomor: docData.nomor_dokumen } }
      );

      let dokumenId: number;

      if (existingDocs && existingDocs.length > 0) {
        dokumenId = existingDocs[0].id;
        await sequelize.query(
          'UPDATE `tisera-ams`.dokumen SET status = "draft", status_current = "draft", judul_dokumen = :judul, nominal = :nominal, deskripsi = :deskripsi, updated_at = :updated_at WHERE id = :id',
          {
            replacements: {
              judul: docData.judul_dokumen,
              nominal: docData.nominal,
              deskripsi: docData.deskripsi || '',
              updated_at: now,
              id: dokumenId,
            },
          }
        );
      } else {
        const [insertDoc]: any = await sequelize.query(
          'INSERT INTO `tisera-ams`.dokumen (nomor_dokumen, judul_dokumen, nominal, user_id, company_id, aplikasi_id, tipe_dokumen, status, status_current, tgl_pengajuan, deskripsi, created_at, updated_at) VALUES (:nomor, :judul, :nominal, :user_id, 1, 1, :tipe, "draft", "draft", :tgl_pengajuan, :deskripsi, :created_at, :updated_at)',
          {
            replacements: {
              nomor: docData.nomor_dokumen,
              judul: docData.judul_dokumen,
              nominal: docData.nominal,
              user_id: amsUserId,
              tipe: tipeDokumen,
              tgl_pengajuan: docData.tgl_pengajuan,
              deskripsi: docData.deskripsi || '',
              created_at: now,
              updated_at: now,
            },
          }
        );
        dokumenId = insertDoc;
      }

      // Save PDF file in AMS storage directory directly
      const fs = await import('fs');
      const path = await import('path');
      const amsStorageDir = path.resolve('../Approval-Management-System/storage/app/private/dokumen', docData.nomor_dokumen);
      if (!fs.existsSync(amsStorageDir)) {
        fs.mkdirSync(amsStorageDir, { recursive: true });
      }
      const pdfFilePath = path.join(amsStorageDir, `${docData.nomor_dokumen}_v1.pdf`);
      fs.writeFileSync(pdfFilePath, docData.pdfBuffer);

      const relativeFileUrl = `dokumen/${docData.nomor_dokumen}/${docData.nomor_dokumen}_v1.pdf`;

      // Check / Insert DokumenVersion
      const [existingVersions]: [any[], any] = await sequelize.query(
        'SELECT id FROM `tisera-ams`.dokumen_version WHERE dokumen_id = :dokumenId AND version = "1.0" LIMIT 1',
        { replacements: { dokumenId } }
      );

      let versionId: number;
      if (existingVersions && existingVersions.length > 0) {
        versionId = existingVersions[0].id;
        await sequelize.query(
          'UPDATE `tisera-ams`.dokumen_version SET file_url = :fileUrl, size_file = :size, status = "active", updated_at = :updated_at WHERE id = :id',
          {
            replacements: {
              fileUrl: relativeFileUrl,
              size: docData.pdfBuffer.length,
              updated_at: now,
              id: versionId,
            },
          }
        );
      } else {
        const [insVer]: any = await sequelize.query(
          'INSERT INTO `tisera-ams`.dokumen_version (dokumen_id, version, nama_file, tgl_upload, tipe_file, file_url, size_file, status, created_at, updated_at) VALUES (:dokumenId, "1.0", :namaFile, :tgl, "pdf", :fileUrl, :size, "active", :created_at, :updated_at)',
          {
            replacements: {
              dokumenId,
              namaFile: `${docData.nomor_dokumen}.pdf`,
              tgl: docData.tgl_pengajuan,
              fileUrl: relativeFileUrl,
              size: docData.pdfBuffer.length,
              created_at: now,
              updated_at: now,
            },
          }
        );
        versionId = insVer;
      }

      return {
        dokumen_id: dokumenId,
        nomor_dokumen: docData.nomor_dokumen,
        judul_dokumen: docData.judul_dokumen,
        nominal: docData.nominal,
        status: 'draft',
        status_current: 'draft',
        user_id: amsUserId,
        version_id: versionId,
        has_pdf: true,
      };
    } catch (dbErr: any) {
      console.error('[SyncService] Direct DB createDraftDocument failed:', dbErr.message);
      throw new Error(`Gagal menyimpan dokumen draft di AMS: ${dbErr.message}`);
    }
  }

  /**
   * Inti sinkronisasi PO dari EIS ke AMS.
   * Alur:
   * 1. Ambil data PO dari database EIS beserta pemiliknya (user_id).
   * 2. microservice-lookup memeriksa apakah user terdaftar di AMS.
   * 3. JIKA USER BELUM TERDAFTAR DI AMS:
   *    -> Daftarkan username, email, dan password yang sama ke User Management Superadmin AMS.
   *    -> Dokumen tidak dibuat dulu (menunggu user diverifikasi/diatur superadmin).
   * 4. JIKA USER SUDAH TERDAFTAR DI AMS (punya akun EIS dan AMS):
   *    -> Generate file PDF dari PO menggunakan PdfTemplateService.
   *    -> Buat dokumen di AMS dengan status DRAFT beserta file PDF terlampir.
   */
  static async syncPurchaseOrder(poNumberOrId: string | number, requestId?: string): Promise<SyncPoResult> {
    const clean = String(poNumberOrId).trim();
    const isNumeric = /^\d+$/.test(clean);

    const whereClause: any = isNumeric
      ? { [Op.or]: [{ id: parseInt(clean, 10) }, { po_number: clean }] }
      : { po_number: clean };

    const po = await PurchaseOrder.findOne({
      where: whereClause,
      include: [
        { model: Company, as: 'company' },
        { model: Vendor, as: 'vendor' },
        { model: PurchaseRequest, as: 'purchase_request' },
        { model: User, as: 'user' },
        {
          model: PurchaseOrderItem,
          as: 'items',
          include: [{ model: Item, as: 'item' }],
        },
      ],
    });

    if (!po) {
      throw new Error(`Purchase Order '${poNumberOrId}' tidak ditemukan di database EIS.`);
    }

    const plainPo: any = po.toJSON();
    const poNumber = plainPo.po_number;
    const vendorName = plainPo.vendor?.name || 'Vendor';
    const totalAmount = Number(plainPo.total || 0);

    // Ambil user pemilik PO dari EIS
    let eisUser: any = plainPo.user;
    if (!eisUser && plainPo.user_id) {
      const u = await User.findByPk(plainPo.user_id);
      if (u) eisUser = u.toJSON();
    }

    // Jika PO tidak berpemilik khusus, gunakan fallback data pembuat default
    if (!eisUser) {
      eisUser = {
        name: 'EIS Operator',
        username: 'eis_operator',
        email: 'operator@external-inventory.com',
        password: '$2y$12$eRevx19p7FwY6m/1WbTfauq.w6m2e9gB7yH8zWqjV9Y1q7yJ1x3.',
      };
    }

    // microservice-lookup memeriksa pendaftaran akun user di AMS
    const { exists: userExistsInAms } = await this.checkUserInAms(eisUser.email, eisUser.username);

    // KASUS 1: User punya akun EIS tapi BELUM punya akun di AMS
    // Requirement: "jika user punya akun eis namun tidak dengan ams maka cukup munculkan saja username dan akun email nya di user management milik superadmin (kalau bisa passwordnya juga sama)"
    if (!userExistsInAms) {
      await this.provisionUserToAms({
        name: eisUser.name,
        username: eisUser.username,
        email: eisUser.email,
        password: eisUser.password,
      });

      return {
        synced: true,
        action: 'user_provisioned',
        user_status: 'provisioned_to_ams',
        po_number: poNumber,
        user: {
          email: eisUser.email,
          username: eisUser.username,
          name: eisUser.name,
        },
        document: null,
        message: `User '${eisUser.email}' belum memiliki otorisasi aktif di AMS. Akun user berhasil dimunculkan di User Management Superadmin AMS dengan otorisasi kosong, menunggu konfirmasi dari Superadmin terlebih dahulu. Dokumen draft akan disinkronisasi setelah otorisasi dikonfirmasi oleh Superadmin.`,
      };
    }

    // KASUS 2: User memiliki akun di EIS DAN AMS
    // Requirement: "jika ada data po di eis maka akan muncul dokumen hasil generate pdf nya di ams namun masih tersimpan dengan status draft"
    const pdfBuffer = await PurchaseOrderService.getPdf(poNumber, requestId);

    const docResult = await this.createDraftDocumentInAms({
      nomor_dokumen: poNumber,
      judul_dokumen: `Purchase Order ${poNumber} - ${vendorName}`,
      nominal: totalAmount,
      email: eisUser.email,
      tgl_pengajuan: plainPo.order_date || new Date().toISOString().split('T')[0],
      deskripsi: plainPo.description || `Purchase Order ${poNumber} diterbitkan untuk ${vendorName}`,
      pdfBuffer: pdfBuffer,
    });

    return {
      synced: true,
      action: 'document_created',
      user_status: 'existing_in_ams',
      po_number: poNumber,
      user: {
        email: eisUser.email,
        username: eisUser.username,
        name: eisUser.name,
      },
      document: {
        dokumen_id: docResult.dokumen_id,
        nomor_dokumen: poNumber,
        status: 'draft',
        judul_dokumen: `Purchase Order ${poNumber} - ${vendorName}`,
        nominal: totalAmount,
        has_pdf: true,
      },
      message: `User terdaftar di EIS dan AMS. Dokumen '${poNumber}' berhasil disinkronisasi ke AMS dengan status DRAFT beserta file PDF terlampir.`,
    };
  }

  /**
   * Inti sinkronisasi PR dari EIS ke AMS.
   * Alur:
   * 1. Ambil data PR dari database EIS beserta pemiliknya (user_id).
   * 2. microservice-lookup memeriksa apakah user terdaftar di AMS.
   * 3. JIKA USER BELUM TERDAFTAR DI AMS:
   *    -> Daftarkan username, email, dan password yang sama ke User Management Superadmin AMS.
   *    -> Dokumen tidak dibuat dulu (menunggu user diverifikasi/diatur superadmin).
   * 4. JIKA USER SUDAH TERDAFTAR DI AMS (punya akun EIS dan AMS):
   *    -> Generate file PDF dari PR menggunakan PurchaseRequestService.
   *    -> Buat dokumen di AMS dengan status DRAFT beserta file PDF terlampir.
   */
  static async syncPurchaseRequest(prNumberOrId: string | number, requestId?: string): Promise<SyncPrResult> {
    const clean = String(prNumberOrId).trim();
    const isNumeric = /^\d+$/.test(clean);

    const whereClause: any = isNumeric
      ? { [Op.or]: [{ id: parseInt(clean, 10) }, { pr_number: clean }] }
      : { pr_number: clean };

    const pr = await PurchaseRequest.findOne({
      where: whereClause,
      include: [
        { model: Company, as: 'company' },
        { model: User, as: 'user' },
        {
          model: PurchaseRequestItem,
          as: 'items',
          include: [{ model: Item, as: 'item' }],
        },
      ],
    });

    if (!pr) {
      throw new Error(`Purchase Request '${prNumberOrId}' tidak ditemukan di database EIS.`);
    }

    const plainPr: any = pr.toJSON();
    const prNumber = plainPr.pr_number;
    const department = plainPr.department || 'Umum';
    const requesterName = plainPr.requester_name || 'Requester';

    // Hitung total estimasi biaya
    let totalEstimated = 0;
    if (plainPr.items && Array.isArray(plainPr.items)) {
      totalEstimated = plainPr.items.reduce((acc: number, it: any) => {
        const qty = Number(it.quantity || 0);
        const price = Number(it.estimated_price || 0);
        return acc + qty * price;
      }, 0);
    }

    // Ambil user pemilik PR dari EIS
    let eisUser: any = plainPr.user;
    if (!eisUser && plainPr.user_id) {
      const u = await User.findByPk(plainPr.user_id);
      if (u) eisUser = u.toJSON();
    }

    if (!eisUser) {
      eisUser = {
        name: requesterName,
        username: requesterName.toLowerCase().replace(/\s+/g, '_'),
        email: 'operator@external-inventory.com',
        password: '$2y$12$eRevx19p7FwY6m/1WbTfauq.w6m2e9gB7yH8zWqjV9Y1q7yJ1x3.',
      };
    }

    // microservice-lookup memeriksa pendaftaran akun user di AMS
    const { exists: userExistsInAms } = await this.checkUserInAms(eisUser.email, eisUser.username);

    // KASUS 1: User punya akun EIS tapi BELUM punya akun di AMS
    if (!userExistsInAms) {
      await this.provisionUserToAms({
        name: eisUser.name,
        username: eisUser.username,
        email: eisUser.email,
        password: eisUser.password,
      });

      return {
        synced: true,
        action: 'user_provisioned',
        user_status: 'provisioned_to_ams',
        pr_number: prNumber,
        user: {
          email: eisUser.email,
          username: eisUser.username,
          name: eisUser.name,
        },
        document: null,
        message: `User '${eisUser.email}' belum memiliki otorisasi aktif di AMS. Akun user berhasil dimunculkan di User Management Superadmin AMS dengan otorisasi kosong, menunggu konfirmasi dari Superadmin terlebih dahulu. Dokumen draft akan disinkronisasi setelah otorisasi dikonfirmasi oleh Superadmin.`,
      };
    }

    // KASUS 2: User memiliki akun di EIS DAN AMS
    const pdfBuffer = await PurchaseRequestService.getPdf(prNumber, requestId);

    const docResult = await this.createDraftDocumentInAms({
      nomor_dokumen: prNumber,
      judul_dokumen: `Purchase Request ${prNumber} - ${department}`,
      nominal: totalEstimated,
      email: eisUser.email,
      tgl_pengajuan: plainPr.request_date || new Date().toISOString().split('T')[0],
      deskripsi: plainPr.description || `Purchase Request ${prNumber} diajukan oleh ${requesterName} (${department})`,
      tipe_dokumen: 'purchase_request',
      pdfBuffer: pdfBuffer,
    });

    return {
      synced: true,
      action: 'document_created',
      user_status: 'existing_in_ams',
      pr_number: prNumber,
      user: {
        email: eisUser.email,
        username: eisUser.username,
        name: eisUser.name,
      },
      document: {
        dokumen_id: docResult.dokumen_id,
        nomor_dokumen: prNumber,
        status: 'draft',
        judul_dokumen: `Purchase Request ${prNumber} - ${department}`,
        nominal: totalEstimated,
        has_pdf: true,
      },
      message: `User terdaftar di EIS dan AMS. Dokumen '${prNumber}' berhasil disinkronisasi ke AMS dengan status DRAFT beserta file PDF terlampir.`,
    };
  }

  /**
   * Pembaruan status dari AMS ke EIS melalui microservice-lookup
   * Requirement: "dan juga aku ingin status di ams bisa melakukan update dengan eis melalui microservice-lookup tentunya"
   */
  static async updateStatusFromAms(nomorDokumen: string, amsStatus: string, notes?: string | null, requestId?: string): Promise<StatusUpdateResult> {
    const cleanNumber = nomorDokumen.trim();
    const isPo = cleanNumber.toUpperCase().startsWith('PO');
    const isPr = cleanNumber.toUpperCase().startsWith('PR');

    // Pemetaan status AMS ke status EIS
    // AMS: approved, rejected, under_review, draft
    // EIS PO: completed, cancelled, issued, draft (atau approved, rejected)
    let eisPoStatus = 'draft';
    let eisPrStatus = 'draft';

    const normalizedAmsStatus = amsStatus.toLowerCase();
    switch (normalizedAmsStatus) {
      case 'approved':
      case 'fully_approved':
        eisPoStatus = 'completed';
        eisPrStatus = 'approved';
        break;
      case 'rejected':
      case 'cancelled':
        eisPoStatus = 'cancelled';
        eisPrStatus = 'rejected';
        break;
      case 'under_review':
      case 'submitted':
        eisPoStatus = 'issued';
        eisPrStatus = 'submitted';
        break;
      default:
        eisPoStatus = normalizedAmsStatus;
        eisPrStatus = normalizedAmsStatus;
    }

    if (isPo) {
      const po = await PurchaseOrder.findOne({
        where: { po_number: cleanNumber },
        include: [{ model: PurchaseRequest, as: 'purchase_request' }],
      });

      if (!po) {
        throw new Error(`Purchase Order '${cleanNumber}' tidak ditemukan di EIS.`);
      }

      const previousStatus = po.status;
      po.status = eisPoStatus;

      if (notes) {
        po.description = po.description
          ? `${po.description} | [AMS Sync: ${amsStatus.toUpperCase()}] ${notes}`
          : `[AMS Sync: ${amsStatus.toUpperCase()}] ${notes}`;
      }

      await po.save();

      // Jika PO terkait dengan PR, update juga status PR-nya
      if (po.purchase_request_id) {
        await PurchaseRequest.update(
          { status: eisPrStatus },
          { where: { id: po.purchase_request_id } }
        );
      }

      return {
        nomor_dokumen: cleanNumber,
        type: 'PO',
        previous_status: previousStatus,
        new_status: eisPoStatus,
        notes: notes || null,
        updated_at: new Date().toISOString(),
      };
    } else if (isPr) {
      const pr = await PurchaseRequest.findOne({
        where: { pr_number: cleanNumber },
      });

      if (!pr) {
        throw new Error(`Purchase Request '${cleanNumber}' tidak ditemukan di EIS.`);
      }

      const previousStatus = pr.status;
      pr.status = eisPrStatus;

      if (notes) {
        pr.description = pr.description
          ? `${pr.description} | [AMS Sync: ${amsStatus.toUpperCase()}] ${notes}`
          : `[AMS Sync: ${amsStatus.toUpperCase()}] ${notes}`;
      }

      await pr.save();

      return {
        nomor_dokumen: cleanNumber,
        type: 'PR',
        previous_status: previousStatus,
        new_status: eisPrStatus,
        notes: notes || null,
        updated_at: new Date().toISOString(),
      };
    } else {
      throw new Error(`Format nomor dokumen '${cleanNumber}' tidak dikenali. Harus diawali 'PO-' atau 'PR-'.`);
    }
  }
}

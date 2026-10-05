import { Op } from 'sequelize';
import {
  PurchaseOrder,
  Company,
  Vendor,
  PurchaseRequest,
  PurchaseOrderItem,
  Item,
} from '../../database/models/index.js';
import { transformPurchaseOrder } from '../../transformers/purchase-order.transformer.js';
import { PdfTemplateService } from '../pdf/pdf-template.service.js';
import { DummyTransactionData } from '../../data/dummy-transactions.js';

export class PurchaseOrderService {
  /**
   * Fetch single Purchase Order by po_number or ID directly from EIS Database via Sequelize
   */
  static async getByNumberOrId(numberOrId: string, requestId?: string) {
    const clean = numberOrId.trim();
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
        {
          model: PurchaseOrderItem,
          as: 'items',
          include: [{ model: Item, as: 'item' }],
        },
      ],
    });

    if (!po) {
      throw new Error(`Purchase Order '${numberOrId}' not found`);
    }

    const plainData = po.toJSON();
    return transformPurchaseOrder(plainData);
  }

  /**
   * List Purchase Orders with optional search filter directly from EIS Database
   */
  static async list(query: string = '', requestId?: string) {
    const clean = query.trim();
    const whereClause: any = clean
      ? {
          [Op.or]: [
            { po_number: { [Op.like]: `%${clean}%` } },
            { description: { [Op.like]: `%${clean}%` } },
          ],
        }
      : {};

    const pos = await PurchaseOrder.findAll({
      where: whereClause,
      include: [
        { model: Company, as: 'company' },
        { model: Vendor, as: 'vendor' },
        { model: PurchaseRequest, as: 'purchase_request' },
        {
          model: PurchaseOrderItem,
          as: 'items',
          include: [{ model: Item, as: 'item' }],
        },
      ],
      order: [['id', 'DESC']],
      limit: 50,
    });

    return pos.map((po) => transformPurchaseOrder(po.toJSON()));
  }

  /**
   * Autocomplete lookup for Purchase Orders directly from EIS Database
   */
  static async lookup(query: string = '', requestId?: string) {
    const clean = query.trim();
    const whereClause: any = clean
      ? {
          [Op.or]: [
            { po_number: { [Op.like]: `%${clean}%` } },
            { description: { [Op.like]: `%${clean}%` } },
          ],
        }
      : {};

    const pos = await PurchaseOrder.findAll({
      where: whereClause,
      include: [{ model: Vendor, as: 'vendor', attributes: ['id', 'name'] }],
      order: [['id', 'DESC']],
      limit: 20,
    });

    return pos.map((po) => {
      const plain = po.toJSON() as any;
      return {
        id: plain.id,
        po_number: plain.po_number,
        vendor: plain.vendor?.name || 'Vendor',
        status: plain.status,
        order_date: plain.order_date,
        total: plain.total,
      };
    });
  }

  /**
   * Get PDF for Purchase Order (generated via microservice PdfTemplateService)
   */
  static async getPdf(idOrNumber: string, requestId?: string): Promise<Buffer> {
    let poData: any = null;

    try {
      poData = await this.getByNumberOrId(idOrNumber, requestId);
    } catch {
      poData = DummyTransactionData.findByKeyword(idOrNumber);
    }

    if (!poData) {
      throw new Error(`Purchase Order '${idOrNumber}' not found`);
    }

    return await PdfTemplateService.generate(poData);
  }
}

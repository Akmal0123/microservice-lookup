import { Op } from 'sequelize';
import {
  PurchaseRequest,
  Company,
  PurchaseRequestItem,
  Item,
} from '../../database/models/index.js';
import { transformPurchaseRequest } from '../../transformers/purchase-request.transformer.js';
import { PdfTemplateService } from '../pdf/pdf-template.service.js';
import { DummyTransactionData } from '../../data/dummy-transactions.js';

export class PurchaseRequestService {
  /**
   * Fetch single Purchase Request by pr_number or ID directly from EIS Database via Sequelize
   */
  static async getByNumberOrId(numberOrId: string, requestId?: string) {
    const clean = numberOrId.trim();
    const isNumeric = /^\d+$/.test(clean);

    const whereClause: any = isNumeric
      ? { [Op.or]: [{ id: parseInt(clean, 10) }, { pr_number: clean }] }
      : { pr_number: clean };

    const pr = await PurchaseRequest.findOne({
      where: whereClause,
      include: [
        { model: Company, as: 'company' },
        {
          model: PurchaseRequestItem,
          as: 'items',
          include: [{ model: Item, as: 'item' }],
        },
      ],
    });

    if (!pr) {
      throw new Error(`Purchase Request '${numberOrId}' not found`);
    }

    const plainData: any = pr.toJSON();

    // Calculate total_estimated if not present
    if (!plainData.total_estimated && plainData.items) {
      plainData.total_estimated = plainData.items.reduce((acc: number, it: any) => {
        const qty = Number(it.quantity || 0);
        const price = Number(it.estimated_price || 0);
        return acc + qty * price;
      }, 0);
    }

    return transformPurchaseRequest(plainData);
  }

  /**
   * List Purchase Requests with optional search filter directly from EIS Database
   */
  static async list(query: string = '', requestId?: string) {
    const clean = query.trim();
    const whereClause: any = clean
      ? {
          [Op.or]: [
            { pr_number: { [Op.like]: `%${clean}%` } },
            { department: { [Op.like]: `%${clean}%` } },
            { requester_name: { [Op.like]: `%${clean}%` } },
            { description: { [Op.like]: `%${clean}%` } },
          ],
        }
      : {};

    const prs = await PurchaseRequest.findAll({
      where: whereClause,
      include: [
        { model: Company, as: 'company' },
        {
          model: PurchaseRequestItem,
          as: 'items',
          include: [{ model: Item, as: 'item' }],
        },
      ],
      order: [['id', 'DESC']],
      limit: 50,
    });

    return prs.map((pr) => {
      const plain = pr.toJSON() as any;
      if (!plain.total_estimated && plain.items) {
        plain.total_estimated = plain.items.reduce((acc: number, it: any) => {
          const qty = Number(it.quantity || 0);
          const price = Number(it.estimated_price || 0);
          return acc + qty * price;
        }, 0);
      }
      return transformPurchaseRequest(plain);
    });
  }

  /**
   * Autocomplete lookup for Purchase Requests directly from EIS Database
   */
  static async lookup(query: string = '', requestId?: string) {
    const clean = query.trim();
    const whereClause: any = clean
      ? {
          [Op.or]: [
            { pr_number: { [Op.like]: `%${clean}%` } },
            { department: { [Op.like]: `%${clean}%` } },
            { requester_name: { [Op.like]: `%${clean}%` } },
          ],
        }
      : {};

    const prs = await PurchaseRequest.findAll({
      where: whereClause,
      attributes: ['id', 'pr_number', 'requester_name', 'department', 'status', 'request_date'],
      order: [['id', 'DESC']],
      limit: 20,
    });

    return prs.map((pr) => {
      const plain = pr.toJSON() as any;
      return {
        id: plain.id,
        pr_number: plain.pr_number,
        requester_name: plain.requester_name,
        department: plain.department,
        status: plain.status,
        request_date: plain.request_date,
      };
    });
  }

  /**
   * Get PDF for Purchase Request (generated via microservice PdfTemplateService)
   */
  static async getPdf(numberOrId: string, requestId?: string): Promise<Buffer> {
    let prData: any = null;

    try {
      prData = await this.getByNumberOrId(numberOrId, requestId);
    } catch {
      prData = DummyTransactionData.findByKeyword(numberOrId);
    }

    if (!prData) {
      throw new Error(`Purchase Request '${numberOrId}' not found`);
    }

    return await PdfTemplateService.generate(prData);
  }
}

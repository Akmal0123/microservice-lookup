import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../sequelize.js';

// --- 1. Company Model ---
export interface CompanyAttributes {
  id: number;
  code: string;
  name: string;
  address?: string | null;
  created_at?: Date;
  updated_at?: Date;
}
export interface CompanyCreationAttributes extends Optional<CompanyAttributes, 'id'> {}

export class Company extends Model<CompanyAttributes, CompanyCreationAttributes> implements CompanyAttributes {
  public id!: number;
  public code!: string;
  public name!: string;
  public address!: string | null;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

Company.init(
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    code: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    address: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'companies',
  }
);

// --- 2. Item Model ---
export interface ItemAttributes {
  id: number;
  code: string;
  name: string;
  description?: string | null;
  unit: string;
  price: number;
  created_at?: Date;
  updated_at?: Date;
}
export interface ItemCreationAttributes extends Optional<ItemAttributes, 'id'> {}

export class Item extends Model<ItemAttributes, ItemCreationAttributes> implements ItemAttributes {
  public id!: number;
  public code!: string;
  public name!: string;
  public description!: string | null;
  public unit!: string;
  public price!: number;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

Item.init(
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    code: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    unit: {
      type: DataTypes.STRING(50),
      defaultValue: 'unit',
      allowNull: false,
    },
    price: {
      type: DataTypes.DECIMAL(15, 2),
      defaultValue: 0,
      allowNull: false,
    },
  },
  {
    sequelize,
    tableName: 'items',
  }
);

// --- 3. Vendor Model ---
export interface VendorAttributes {
  id: number;
  code: string;
  name: string;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  created_at?: Date;
  updated_at?: Date;
}
export interface VendorCreationAttributes extends Optional<VendorAttributes, 'id'> {}

export class Vendor extends Model<VendorAttributes, VendorCreationAttributes> implements VendorAttributes {
  public id!: number;
  public code!: string;
  public name!: string;
  public address!: string | null;
  public phone!: string | null;
  public email!: string | null;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

Vendor.init(
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    code: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    address: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    phone: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    email: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'vendors',
  }
);

// --- 4. PurchaseRequest Model ---
export interface PurchaseRequestAttributes {
  id: number;
  pr_number: string;
  company_id: number;
  requester_name: string;
  department: string;
  request_date: string;
  status: string;
  description?: string | null;
  created_at?: Date;
  updated_at?: Date;
}
export interface PurchaseRequestCreationAttributes extends Optional<PurchaseRequestAttributes, 'id'> {}

export class PurchaseRequest extends Model<PurchaseRequestAttributes, PurchaseRequestCreationAttributes> implements PurchaseRequestAttributes {
  public id!: number;
  public pr_number!: string;
  public company_id!: number;
  public requester_name!: string;
  public department!: string;
  public request_date!: string;
  public status!: string;
  public description!: string | null;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;

  // Relations
  public company?: Company;
  public items?: PurchaseRequestItem[];
  public purchase_orders?: PurchaseOrder[];
}

PurchaseRequest.init(
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    pr_number: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
    },
    company_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
    },
    requester_name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    department: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    request_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    status: {
      type: DataTypes.STRING(30),
      defaultValue: 'draft',
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'purchase_requests',
  }
);

// --- 5. PurchaseRequestItem Model ---
export interface PurchaseRequestItemAttributes {
  id: number;
  purchase_request_id: number;
  item_id: number;
  quantity: number;
  estimated_price: number;
  description?: string | null;
  created_at?: Date;
  updated_at?: Date;
}
export interface PurchaseRequestItemCreationAttributes extends Optional<PurchaseRequestItemAttributes, 'id'> {}

export class PurchaseRequestItem extends Model<PurchaseRequestItemAttributes, PurchaseRequestItemCreationAttributes> implements PurchaseRequestItemAttributes {
  public id!: number;
  public purchase_request_id!: number;
  public item_id!: number;
  public quantity!: number;
  public estimated_price!: number;
  public description!: string | null;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;

  // Relations
  public item?: Item;
  public purchase_request?: PurchaseRequest;
}

PurchaseRequestItem.init(
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    purchase_request_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
    },
    item_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
    },
    quantity: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
      allowNull: false,
    },
    estimated_price: {
      type: DataTypes.DECIMAL(15, 2),
      defaultValue: 0,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'purchase_request_items',
  }
);

// --- 6. PurchaseOrder Model ---
export interface PurchaseOrderAttributes {
  id: number;
  po_number: string;
  purchase_request_id?: number | null;
  company_id: number;
  vendor_id: number;
  order_date: string;
  status: string;
  description?: string | null;
  subtotal: number;
  tax: number;
  total: number;
  created_at?: Date;
  updated_at?: Date;
}
export interface PurchaseOrderCreationAttributes extends Optional<PurchaseOrderAttributes, 'id'> {}

export class PurchaseOrder extends Model<PurchaseOrderAttributes, PurchaseOrderCreationAttributes> implements PurchaseOrderAttributes {
  public id!: number;
  public po_number!: string;
  public purchase_request_id!: number | null;
  public company_id!: number;
  public vendor_id!: number;
  public order_date!: string;
  public status!: string;
  public description!: string | null;
  public subtotal!: number;
  public tax!: number;
  public total!: number;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;

  // Relations
  public company?: Company;
  public vendor?: Vendor;
  public purchase_request?: PurchaseRequest;
  public items?: PurchaseOrderItem[];
}

PurchaseOrder.init(
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    po_number: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
    },
    purchase_request_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true,
    },
    company_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
    },
    vendor_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
    },
    order_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    status: {
      type: DataTypes.STRING(30),
      defaultValue: 'draft',
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    subtotal: {
      type: DataTypes.DECIMAL(15, 2),
      defaultValue: 0,
      allowNull: false,
    },
    tax: {
      type: DataTypes.DECIMAL(15, 2),
      defaultValue: 0,
      allowNull: false,
    },
    total: {
      type: DataTypes.DECIMAL(15, 2),
      defaultValue: 0,
      allowNull: false,
    },
  },
  {
    sequelize,
    tableName: 'purchase_orders',
  }
);

// --- 7. PurchaseOrderItem Model ---
export interface PurchaseOrderItemAttributes {
  id: number;
  purchase_order_id: number;
  item_id: number;
  quantity: number;
  unit_price: number;
  subtotal: number;
  description?: string | null;
  created_at?: Date;
  updated_at?: Date;
}
export interface PurchaseOrderItemCreationAttributes extends Optional<PurchaseOrderItemAttributes, 'id'> {}

export class PurchaseOrderItem extends Model<PurchaseOrderItemAttributes, PurchaseOrderItemCreationAttributes> implements PurchaseOrderItemAttributes {
  public id!: number;
  public purchase_order_id!: number;
  public item_id!: number;
  public quantity!: number;
  public unit_price!: number;
  public subtotal!: number;
  public description!: string | null;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;

  // Relations
  public item?: Item;
  public purchase_order?: PurchaseOrder;
}

PurchaseOrderItem.init(
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    purchase_order_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
    },
    item_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
    },
    quantity: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
      allowNull: false,
    },
    unit_price: {
      type: DataTypes.DECIMAL(15, 2),
      defaultValue: 0,
      allowNull: false,
    },
    subtotal: {
      type: DataTypes.DECIMAL(15, 2),
      defaultValue: 0,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'purchase_order_items',
  }
);

// --- Define Model Associations ---

// PurchaseOrder Associations
PurchaseOrder.belongsTo(Company, { foreignKey: 'company_id', as: 'company' });
Company.hasMany(PurchaseOrder, { foreignKey: 'company_id', as: 'purchase_orders' });

PurchaseOrder.belongsTo(Vendor, { foreignKey: 'vendor_id', as: 'vendor' });
Vendor.hasMany(PurchaseOrder, { foreignKey: 'vendor_id', as: 'purchase_orders' });

PurchaseOrder.belongsTo(PurchaseRequest, { foreignKey: 'purchase_request_id', as: 'purchase_request' });
PurchaseRequest.hasMany(PurchaseOrder, { foreignKey: 'purchase_request_id', as: 'purchase_orders' });

PurchaseOrder.hasMany(PurchaseOrderItem, { foreignKey: 'purchase_order_id', as: 'items' });
PurchaseOrderItem.belongsTo(PurchaseOrder, { foreignKey: 'purchase_order_id', as: 'purchase_order' });

PurchaseOrderItem.belongsTo(Item, { foreignKey: 'item_id', as: 'item' });
Item.hasMany(PurchaseOrderItem, { foreignKey: 'item_id', as: 'purchase_order_items' });

// PurchaseRequest Associations
PurchaseRequest.belongsTo(Company, { foreignKey: 'company_id', as: 'company' });
Company.hasMany(PurchaseRequest, { foreignKey: 'company_id', as: 'purchase_requests' });

PurchaseRequest.hasMany(PurchaseRequestItem, { foreignKey: 'purchase_request_id', as: 'items' });
PurchaseRequestItem.belongsTo(PurchaseRequest, { foreignKey: 'purchase_request_id', as: 'purchase_request' });

PurchaseRequestItem.belongsTo(Item, { foreignKey: 'item_id', as: 'item' });
Item.hasMany(PurchaseRequestItem, { foreignKey: 'item_id', as: 'purchase_request_items' });

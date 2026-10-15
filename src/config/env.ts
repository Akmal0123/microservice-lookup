import dotenv from 'dotenv';

dotenv.config();

export interface Config {
  port: number;
  host: string;
  db: {
    host: string;
    port: number;
    database: string;
    username: string;
    password: string;
    dialect: 'mysql';
  };
  jwt: {
    secret: string;
    issuer: string;
    audience: string;
  };
  eis: {
    baseUrl: string;
    timeoutMs: number;
  };
  ams: {
    baseUrl: string;
    jwtSecret: string;
  };
}

export const envConfig: Config = {
  port: parseInt(process.env.PORT || '5000', 10),
  host: process.env.HOST || '0.0.0.0',
  db: {
    host: process.env.EIS_DB_HOST || '127.0.0.1',
    port: parseInt(process.env.EIS_DB_PORT || '3306', 10),
    database: process.env.EIS_DB_DATABASE || 'external_inventory_db',
    username: process.env.EIS_DB_USERNAME || 'root',
    password: process.env.EIS_DB_PASSWORD || '',
    dialect: 'mysql',
  },
  jwt: {
    secret: process.env.JWT_SECRET || process.env.JWT_A_SECRET || 'ams-microservice-lookup-secret-key-jwt-auth',
    issuer: process.env.JWT_ISSUER || process.env.JWT_A_ISSUER || 'ams',
    audience: process.env.JWT_AUDIENCE || process.env.JWT_A_AUDIENCE || 'microservice-lookup',
  },
  eis: {
    baseUrl: process.env.EIS_BASE_URL || 'http://localhost:9000/api/v1',
    timeoutMs: parseInt(process.env.EIS_TIMEOUT_MS || '10000', 10),
  },
  ams: {
    baseUrl: process.env.AMS_BASE_URL || 'http://localhost:8000',
    jwtSecret: process.env.JWT_SECRET || 'ams-microservice-lookup-secret-key-jwt-auth',
  },
};

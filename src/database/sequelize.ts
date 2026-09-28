import { Sequelize } from 'sequelize';
import { envConfig } from '../config/env.js';

export const sequelize = new Sequelize(
  envConfig.db.database,
  envConfig.db.username,
  envConfig.db.password,
  {
    host: envConfig.db.host,
    port: envConfig.db.port,
    dialect: envConfig.db.dialect,
    logging: false, // Set to console.log if debugging queries
    define: {
      underscored: true,
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
  }
);

export async function testDatabaseConnection(): Promise<boolean> {
  try {
    await sequelize.authenticate();
    return true;
  } catch (error) {
    console.error('Unable to connect to the EIS database via Sequelize:', error);
    return false;
  }
}

import { buildApp } from './app.js';
import { envConfig } from './config/env.js';
import { testDatabaseConnection } from './database/sequelize.js';

const start = async () => {
  try {
    const isDbConnected = await testDatabaseConnection();
    if (isDbConnected) {
      console.log(`✅ Connected directly to EIS Database (${envConfig.db.database} on ${envConfig.db.host}:${envConfig.db.port}) via Sequelize ORM`);
    } else {
      console.warn(`⚠️ Warning: Could not connect to EIS Database. Please check your MySQL service.`);
    }

    const app = await buildApp();
    await app.listen({ port: envConfig.port, host: envConfig.host });

    console.log(`\n======================================================`);
    console.log(`🚀 Microservice Lookup (AMS <-> EIS Database via Sequelize)`);
    console.log(`📡 URL: http://${envConfig.host === '0.0.0.0' ? 'localhost' : envConfig.host}:${envConfig.port}`);
    console.log(`🗄️ Database: MySQL ${envConfig.db.database} (Sequelize ORM - Direct Access)`);
    console.log(`🔐 AMS -> Microservice: JWT Auth verified (iss: ${envConfig.jwt.issuer}, aud: ${envConfig.jwt.audience})`);
    console.log(`🚫 JWT B: Removed (Direct database connection replaces HTTP forwarding)`);
    console.log(`======================================================\n`);
  } catch (err) {
    console.error('Failed to start Microservice Lookup server:', err);
    process.exit(1);
  }
};

start();

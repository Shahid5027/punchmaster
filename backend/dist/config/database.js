"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const pg_1 = __importDefault(require("pg"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const { Pool } = pg_1.default;
const isProduction = process.env.NODE_ENV === 'production';
// Connection pool setup, accommodating single-string DATABASE_URL or individual local options
const pool = new Pool(process.env.DATABASE_URL
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: isProduction ? { rejectUnauthorized: false } : undefined,
    }
    : {
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres',
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        database: process.env.DB_NAME || 'geoshield_db',
    });
// Verify database connection pool health
pool.on('connect', () => {
    console.log('⚡ PostgreSQL pool successfully connected to database');
});
pool.on('error', (err) => {
    console.error('❌ Unexpected database pool connection error', err);
});
exports.default = pool;

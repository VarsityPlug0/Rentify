/**
 * Database Configuration
 * Centralized PostgreSQL connection pool
 */

const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config();

// Production configuration for Render
const isProduction = process.env.NODE_ENV === 'production';

const connectionConfig = {
    connectionString: process.env.DATABASE_URL,
    ssl: isProduction ? { rejectUnauthorized: false } : false
};

// Only create pool if DATABASE_URL is present
let pool;

if (process.env.DATABASE_URL) {
    pool = new Pool(connectionConfig);

    pool.on('error', (err) => {
        console.error('Unexpected error on idle client', err);
        process.exit(-1);
    });
} else {
    console.warn('⚠️  DATABASE_URL not found. Database features will be disabled.');
}

module.exports = {
    query: (text, params) => {
        if (!pool) {
            console.error('Attempted to query database without DATABASE_URL');
            throw new Error('Database not configured');
        }
        return pool.query(text, params);
    },
    pool
};

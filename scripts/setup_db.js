/**
 * Database Setup Script
 * Creates necessary tables for the event-driven email system
 */

const { pool } = require('../src/config/database');

async function setupDatabase() {
    if (!pool) {
        console.error('❌ Cannot run migration: DATABASE_URL not set.');
        process.exit(1);
    }

    try {
        console.log('🔌 Connecting to database...');
        const client = await pool.connect();

        try {
            console.log('🛠️  Creating tables...');

            // 1. Events Table
            await client.query(`
                CREATE TABLE IF NOT EXISTS events (
                    id SERIAL PRIMARY KEY,
                    type VARCHAR(50) NOT NULL,
                    entity_id VARCHAR(50),
                    payload JSONB NOT NULL,
                    status VARCHAR(20) DEFAULT 'pending', -- pending, processing, processed, failed
                    retries INTEGER DEFAULT 0,
                    error_message TEXT,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                );
            `);
            console.log('✅ Events table ready');

            // 2. Email Logs Table
            await client.query(`
                CREATE TABLE IF NOT EXISTS email_logs (
                    id SERIAL PRIMARY KEY,
                    event_id INTEGER REFERENCES events(id),
                    recipient VARCHAR(255) NOT NULL,
                    template_name VARCHAR(100) NOT NULL,
                    status VARCHAR(20) NOT NULL, -- sent, failed
                    provider_id VARCHAR(100), -- ID from SendGrid/Mailgun
                    sent_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                );
            `);
            console.log('✅ Email logs table ready');

            // Index for faster worker polling
            await client.query(`
                CREATE INDEX IF NOT EXISTS idx_events_status 
                ON events(status) 
                WHERE status = 'pending';
            `);
            console.log('✅ Indexes ready');

        } finally {
            client.release();
        }

    } catch (err) {
        console.error('❌ Migration failed:', err);
    } finally {
        await pool.end();
    }
}

setupDatabase();

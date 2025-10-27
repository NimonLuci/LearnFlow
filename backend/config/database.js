const mysql = require('mysql2');
require('dotenv').config();

// Remove unsupported options
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'online_learning',
    charset: 'utf8mb4',
    timezone: '+00:00',
    connectionLimit: 20,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0
});

// Convert to promise-based interface
const promisePool = pool.promise();

// Connection test
promisePool.getConnection()
    .then(connection => {
        console.log('✅ Database connected successfully');
        connection.release();
    })
    .catch(error => {
        console.error('❌ Database connection failed:', error.message);
        process.exit(1);
    });

// Handle pool errors
pool.on('error', (err) => {
    console.error('Database pool error:', err);
    if (err.code === 'PROTOCOL_CONNECTION_LOST') {
        console.log('Database connection was closed.');
    }
    if (err.code === 'ER_CON_COUNT_ERROR') {
        console.log('Database has too many connections.');
    }
    if (err.code === 'ECONNREFUSED') {
        console.log('Database connection was refused.');
    }
});

module.exports = promisePool;
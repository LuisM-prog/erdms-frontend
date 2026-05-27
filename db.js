import mysql from 'mysql2';
import env from './config/db.config.js';

// used createPool for multiple requests since concurrent users daw 
const pool = mysql.createPool({
    host: env.DB_HOST,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,    
    queueLimit: 0           
});

pool.getConnection((err, connection) => {
    if (err) {
        console.error('[DB] Connection failed:', err.message);
        return;
    }
    console.log('[DB] Connected to MySQL successfully');
    connection.release();
});

export default pool;
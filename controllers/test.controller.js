import db from '../db.js';

export const healthCheck = (req, res) => {
    res.status(200).json({
        message: 'ERDMS server is up and running',
        timestamp: new Date().toISOString(),
    });
};

export const dbCheck = (req, res) => {
    db.query('SELECT 1 + 1 AS result', (err, rows) => {
        if (err) {
            return res.status(500).json({
                message: 'Database query failed',
                error: err.message,
            });
        }
        res.status(200).json({
            message: 'Database connection is working',
            query_result: rows[0].result,
        });
    });
};

export const listTables = (req, res) => {
    db.query('SHOW TABLES', (err, rows) => {
        if (err) {
            return res.status(500).json({
                message: 'Could not retrieve tables',
                error: err.message,
            });
        }
        res.status(200).json({
            message: 'Tables in Database',
            tables: rows,
        });
    });
};
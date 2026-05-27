import db from '../db.js';

// GET all logs with pagination and filters
export const getAllLogs = (req, res) => {
    const { page = 1, limit = 20, startDate, endDate, action } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    let query = `
        SELECT l.log_id, l.user_id, l.action, l.document_id, l.timestamp,
               u.name as user_name, u.email as user_email,
               d.title as document_title
        FROM Logs l
        LEFT JOIN Users u ON l.user_id = u.user_id
        LEFT JOIN Documents d ON l.document_id = d.document_id
        WHERE 1=1
    `;
    
    let countQuery = 'SELECT COUNT(*) as total FROM Logs l WHERE 1=1';
    let params = [];
    let countParams = [];
    
    // Filter by date range
    if (startDate) {
        query += ' AND DATE(l.timestamp) >= ?';
        countQuery += ' AND DATE(l.timestamp) >= ?';
        params.push(startDate);
        countParams.push(startDate);
    }
    
    if (endDate) {
        query += ' AND DATE(l.timestamp) <= ?';
        countQuery += ' AND DATE(l.timestamp) <= ?';
        params.push(endDate);
        countParams.push(endDate);
    }
    
    // Filter by action type
    if (action) {
        const validActions = ['login', 'logout', 'upload', 'download', 'delete', 'edit'];
        if (!validActions.includes(action)) {
            return res.status(400).json({ message: 'Invalid action type' });
        }
        query += ' AND l.action = ?';
        countQuery += ' AND l.action = ?';
        params.push(action);
        countParams.push(action);
    }
    
    query += ' ORDER BY l.timestamp DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);
    
    // Get total count
    db.query(countQuery, countParams, (err, countResult) => {
        if (err) {
            return res.status(500).json({ message: 'Database error', error: err.message });
        }
        
        const total = countResult[0].total;
        
        // Get paginated results
        db.query(query, params, (err, results) => {
            if (err) {
                return res.status(500).json({ message: 'Database error', error: err.message });
            }
            
            res.json({
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                total_pages: Math.ceil(total / parseInt(limit)),
                logs: results
            });
        });
    });
};

// GET logs for a specific user
export const getLogsByUser = (req, res) => {
    const { userId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    // Check if user exists
    db.query('SELECT * FROM Users WHERE user_id = ?', [userId], (err, userResults) => {
        if (err) {
            return res.status(500).json({ message: 'Database error', error: err.message });
        }
        if (userResults.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        const query = `
            SELECT l.log_id, l.user_id, l.action, l.document_id, l.timestamp,
                   d.title as document_title
            FROM Logs l
            LEFT JOIN Documents d ON l.document_id = d.document_id
            WHERE l.user_id = ?
            ORDER BY l.timestamp DESC
            LIMIT ? OFFSET ?
        `;
        
        const countQuery = 'SELECT COUNT(*) as total FROM Logs WHERE user_id = ?';
        
        db.query(countQuery, [userId], (err, countResult) => {
            if (err) {
                return res.status(500).json({ message: 'Database error', error: err.message });
            }
            
            const total = countResult[0].total;
            
            db.query(query, [userId, parseInt(limit), offset], (err, results) => {
                if (err) {
                    return res.status(500).json({ message: 'Database error', error: err.message });
                }
                
                res.json({
                    user: {
                        user_id: userId,
                        name: userResults[0].name,
                        email: userResults[0].email
                    },
                    total,
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total_pages: Math.ceil(total / parseInt(limit)),
                    logs: results
                });
            });
        });
    });
};

// GET logs for a specific document
export const getLogsByDocument = (req, res) => {
    const { documentId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    // Check if document exists
    db.query('SELECT * FROM Documents WHERE document_id = ?', [documentId], (err, docResults) => {
        if (err) {
            return res.status(500).json({ message: 'Database error', error: err.message });
        }
        if (docResults.length === 0) {
            return res.status(404).json({ message: 'Document not found' });
        }
        
        const query = `
            SELECT l.log_id, l.user_id, l.action, l.document_id, l.timestamp,
                   u.name as user_name, u.email as user_email
            FROM Logs l
            LEFT JOIN Users u ON l.user_id = u.user_id
            WHERE l.document_id = ?
            ORDER BY l.timestamp DESC
            LIMIT ? OFFSET ?
        `;
        
        const countQuery = 'SELECT COUNT(*) as total FROM Logs WHERE document_id = ?';
        
        db.query(countQuery, [documentId], (err, countResult) => {
            if (err) {
                return res.status(500).json({ message: 'Database error', error: err.message });
            }
            
            const total = countResult[0].total;
            
            db.query(query, [documentId, parseInt(limit), offset], (err, results) => {
                if (err) {
                    return res.status(500).json({ message: 'Database error', error: err.message });
                }
                
                res.json({
                    document: {
                        document_id: documentId,
                        title: docResults[0].title,
                        category: docResults[0].category
                    },
                    total,
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total_pages: Math.ceil(total / parseInt(limit)),
                    logs: results
                });
            });
        });
    });
};

// GET logs by action type
export const getLogsByAction = (req, res) => {
    const { action } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    const validActions = ['login', 'logout', 'upload', 'download', 'delete', 'edit'];
    if (!validActions.includes(action)) {
        return res.status(400).json({ message: 'Invalid action type' });
    }
    
    const query = `
        SELECT l.log_id, l.user_id, l.action, l.document_id, l.timestamp,
               u.name as user_name, u.email as user_email,
               d.title as document_title
        FROM Logs l
        LEFT JOIN Users u ON l.user_id = u.user_id
        LEFT JOIN Documents d ON l.document_id = d.document_id
        WHERE l.action = ?
        ORDER BY l.timestamp DESC
        LIMIT ? OFFSET ?
    `;
    
    const countQuery = 'SELECT COUNT(*) as total FROM Logs WHERE action = ?';
    
    db.query(countQuery, [action], (err, countResult) => {
        if (err) {
            return res.status(500).json({ message: 'Database error', error: err.message });
        }
        
        const total = countResult[0].total;
        
        db.query(query, [action, parseInt(limit), offset], (err, results) => {
            if (err) {
                return res.status(500).json({ message: 'Database error', error: err.message });
            }
            
            res.json({
                action,
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                total_pages: Math.ceil(total / parseInt(limit)),
                logs: results
            });
        });
    });
};

// GET log statistics summary
export const getLogStats = (req, res) => {
    // Get counts by action type
    const actionStatsQuery = `
        SELECT action, COUNT(*) as count 
        FROM Logs 
        GROUP BY action 
        ORDER BY count DESC
    `;
    
    // Get activity by date (last 7 days)
    const dailyActivityQuery = `
        SELECT DATE(timestamp) as date, COUNT(*) as count 
        FROM Logs 
        WHERE timestamp >= DATE_SUB(NOW(), INTERVAL 7 DAY)
        GROUP BY DATE(timestamp)
        ORDER BY date DESC
    `;
    
    // Get total logs count
    const totalQuery = 'SELECT COUNT(*) as total FROM Logs';
    
    // Get most active users
    const activeUsersQuery = `
        SELECT u.user_id, u.name, u.email, COUNT(l.log_id) as activity_count
        FROM Logs l
        JOIN Users u ON l.user_id = u.user_id
        GROUP BY u.user_id
        ORDER BY activity_count DESC
        LIMIT 5
    `;
    
    // Get most accessed documents
    const popularDocsQuery = `
        SELECT d.document_id, d.title, COUNT(l.log_id) as access_count
        FROM Logs l
        JOIN Documents d ON l.document_id = d.document_id
        WHERE l.action IN ('download', 'upload')
        GROUP BY d.document_id
        ORDER BY access_count DESC
        LIMIT 5
    `;
    
    Promise.all([
        new Promise((resolve, reject) => {
            db.query(actionStatsQuery, (err, results) => {
                if (err) reject(err);
                else resolve(results);
            });
        }),
        new Promise((resolve, reject) => {
            db.query(dailyActivityQuery, (err, results) => {
                if (err) reject(err);
                else resolve(results);
            });
        }),
        new Promise((resolve, reject) => {
            db.query(totalQuery, (err, results) => {
                if (err) reject(err);
                else resolve(results[0]);
            });
        }),
        new Promise((resolve, reject) => {
            db.query(activeUsersQuery, (err, results) => {
                if (err) reject(err);
                else resolve(results);
            });
        }),
        new Promise((resolve, reject) => {
            db.query(popularDocsQuery, (err, results) => {
                if (err) reject(err);
                else resolve(results);
            });
        })
    ])
    .then(([actionStats, dailyActivity, total, activeUsers, popularDocs]) => {
        res.json({
            summary: {
                total_logs: total.total,
                by_action: actionStats,
                last_7_days_activity: dailyActivity,
                most_active_users: activeUsers,
                most_accessed_documents: popularDocs
            }
        });
    })
    .catch(err => {
        res.status(500).json({ message: 'Database error', error: err.message });
    });
};

// GET recent logs (last 10)
export const getRecentLogs = (req, res) => {
    const query = `
        SELECT l.log_id, l.user_id, l.action, l.document_id, l.timestamp,
               u.name as user_name, u.email as user_email,
               d.title as document_title
        FROM Logs l
        LEFT JOIN Users u ON l.user_id = u.user_id
        LEFT JOIN Documents d ON l.document_id = d.document_id
        ORDER BY l.timestamp DESC
        LIMIT 10
    `;
    
    db.query(query, (err, results) => {
        if (err) {
            return res.status(500).json({ message: 'Database error', error: err.message });
        }
        res.json(results);
    });
};

// CREATE new log entry (POST /api/logs)
 export const createLog = (req, res) => {
    const { user_id, action, document_id } = req.body;
    
    // Validate required fields
    if (!user_id || !action) {
        return res.status(400).json({ message: 'user_id and action are required' });
    }
    
    // Validate action type
    const validActions = [
        'login', 'logout', 'upload', 'download', 'delete', 'edit',
        'create_user', 'edit_user', 'delete_user', 'toggle_user_status',
        'create_folder', 'edit_folder', 'delete_folder'
    ];
    
    if (!validActions.includes(action)) {
        return res.status(400).json({ message: 'Invalid action type' });
    }
    
    // Insert log into database
    const query = 'INSERT INTO Logs (user_id, action, document_id) VALUES (?, ?, ?)';
    const values = [user_id, action, document_id || null];
    
    db.query(query, values, (err, result) => {
        if (err) {
            console.error('[Log Error]', err.message);
            return res.status(500).json({ message: 'Database error', error: err.message });
        }
        
        res.status(201).json({
            message: 'Log entry created successfully',
            log_id: result.insertId
        });
    });
};
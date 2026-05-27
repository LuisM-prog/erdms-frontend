import db from '../db.js';

// MAIN DASHBOARD STATISTICS
export const getDashboardStats = (req, res) => {
    const queries = {
        totalUsers: 'SELECT COUNT(*) as count FROM Users',
        activeUsers: 'SELECT COUNT(*) as count FROM Users WHERE status = "active"',
        inactiveUsers: 'SELECT COUNT(*) as count FROM Users WHERE status = "inactive"',
        totalDocuments: 'SELECT COUNT(*) as count FROM Documents',
        totalFolders: 'SELECT COUNT(*) as count FROM Folders',
        totalDownloads: 'SELECT COUNT(*) as count FROM Logs WHERE action = "download"',
        totalUploads: 'SELECT COUNT(*) as count FROM Logs WHERE action = "upload"',
        totalLogins: 'SELECT COUNT(*) as count FROM Logs WHERE action = "login"',
        storageUsed: 'SELECT COALESCE(SUM(file_size), 0) as total_bytes FROM Documents'
    };
    
    Promise.all([
        new Promise((resolve, reject) => db.query(queries.totalUsers, (err, r) => err ? reject(err) : resolve(r[0].count))),
        new Promise((resolve, reject) => db.query(queries.activeUsers, (err, r) => err ? reject(err) : resolve(r[0].count))),
        new Promise((resolve, reject) => db.query(queries.inactiveUsers, (err, r) => err ? reject(err) : resolve(r[0].count))),
        new Promise((resolve, reject) => db.query(queries.totalDocuments, (err, r) => err ? reject(err) : resolve(r[0].count))),
        new Promise((resolve, reject) => db.query(queries.totalFolders, (err, r) => err ? reject(err) : resolve(r[0].count))),
        new Promise((resolve, reject) => db.query(queries.totalDownloads, (err, r) => err ? reject(err) : resolve(r[0].count))),
        new Promise((resolve, reject) => db.query(queries.totalUploads, (err, r) => err ? reject(err) : resolve(r[0].count))),
        new Promise((resolve, reject) => db.query(queries.totalLogins, (err, r) => err ? reject(err) : resolve(r[0].count))),
        new Promise((resolve, reject) => db.query(queries.storageUsed, (err, r) => err ? reject(err) : resolve(r[0].total_bytes)))
    ])
    .then(([totalUsers, activeUsers, inactiveUsers, totalDocuments, totalFolders, totalDownloads, totalUploads, totalLogins, storageUsed]) => {
        
        // Format storage size (bytes to readable format)
        const formatBytes = (bytes) => {
            if (bytes === 0) return '0 B';
            const k = 1024;
            const sizes = ['B', 'KB', 'MB', 'GB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
        };
        
        res.json({
            users: {
                total: totalUsers,
                active: activeUsers,
                inactive: inactiveUsers,
                active_percentage: totalUsers > 0 ? ((activeUsers / totalUsers) * 100).toFixed(1) : 0
            },
            documents: {
                total: totalDocuments,
                total_downloads: totalDownloads,
                total_uploads: totalUploads
            },
            folders: {
                total: totalFolders
            },
            activity: {
                total_logins: totalLogins
            },
            storage: {
                total_bytes: storageUsed,
                formatted: formatBytes(storageUsed)
            }
        });
    })
    .catch(err => {
        res.status(500).json({ message: 'Database error', error: err.message });
    });
};

// CHART DATA - Time series for visualizations
export const getChartData = (req, res) => {
    const { days = 7 } = req.query;
    const numDays = parseInt(days);
    
    if (numDays !== 7 && numDays !== 30) {
        return res.status(400).json({ message: 'Days must be 7 or 30' });
    }
    
    // Query for documents uploaded per day
    const uploadsQuery = `
        SELECT DATE(timestamp) as date, COUNT(*) as count
        FROM Logs
        WHERE action = 'upload' 
          AND timestamp >= DATE_SUB(NOW(), INTERVAL ? DAY)
        GROUP BY DATE(timestamp)
        ORDER BY date ASC
    `;
    
    // Query for downloads per day
    const downloadsQuery = `
        SELECT DATE(timestamp) as date, COUNT(*) as count
        FROM Logs
        WHERE action = 'download' 
          AND timestamp >= DATE_SUB(NOW(), INTERVAL ? DAY)
        GROUP BY DATE(timestamp)
        ORDER BY date ASC
    `;
    
    // Query for logins per day (user activity)
    const loginsQuery = `
        SELECT DATE(timestamp) as date, COUNT(*) as count
        FROM Logs
        WHERE action = 'login' 
          AND timestamp >= DATE_SUB(NOW(), INTERVAL ? DAY)
        GROUP BY DATE(timestamp)
        ORDER BY date ASC
    `;
    
    // Query for new users per day
    const newUsersQuery = `
        SELECT DATE(created_at) as date, COUNT(*) as count
        FROM Users
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
        GROUP BY DATE(created_at)
        ORDER BY date ASC
    `;
    
    Promise.all([
        new Promise((resolve, reject) => db.query(uploadsQuery, [numDays], (err, r) => err ? reject(err) : resolve(r))),
        new Promise((resolve, reject) => db.query(downloadsQuery, [numDays], (err, r) => err ? reject(err) : resolve(r))),
        new Promise((resolve, reject) => db.query(loginsQuery, [numDays], (err, r) => err ? reject(err) : resolve(r))),
        new Promise((resolve, reject) => db.query(newUsersQuery, [numDays], (err, r) => err ? reject(err) : resolve(r)))
    ])
    .then(([uploads, downloads, logins, newUsers]) => {
        // Generate date range for last N days
        const dateRange = [];
        const today = new Date();
        for (let i = numDays - 1; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(today.getDate() - i);
            dateRange.push(date.toISOString().split('T')[0]);
        }
        
        // Helper to map data to date range
        const mapDataToDates = (data, dateRange) => {
            const dataMap = new Map();
            data.forEach(item => {
                const formattedDate = new Date(item.date).toISOString().split('T')[0];
                dataMap.set(formattedDate, item.count);
            });
            return dateRange.map(date => ({
                date,
                count: dataMap.get(date) || 0
            }));
        };
        
        res.json({
            days: numDays,
            date_range: dateRange,
            uploads: mapDataToDates(uploads, dateRange),
            downloads: mapDataToDates(downloads, dateRange),
            logins: mapDataToDates(logins, dateRange),
            new_users: mapDataToDates(newUsers, dateRange)
        });
    })
    .catch(err => {
        res.status(500).json({ message: 'Database error', error: err.message });
    });
};

// RECENT ACTIVITY FEED
export const getRecentActivity = (req, res) => {
    const { limit = 20 } = req.query;
    
    const query = `
        SELECT l.log_id, l.user_id, l.action, l.document_id, l.timestamp,
               u.name as user_name, u.email as user_email,
               d.title as document_title
        FROM Logs l
        LEFT JOIN Users u ON l.user_id = u.user_id
        LEFT JOIN Documents d ON l.document_id = d.document_id
        ORDER BY l.timestamp DESC
        LIMIT ?
    `;
    
    db.query(query, [parseInt(limit)], (err, results) => {
        if (err) {
            return res.status(500).json({ message: 'Database error', error: err.message });
        }
        
        // Format activity messages for frontend display
        const formattedResults = results.map(log => {
            let message = '';
            switch (log.action) {
                case 'login':
                    message = `${log.user_name} logged in`;
                    break;
                case 'logout':
                    message = `${log.user_name} logged out`;
                    break;
                case 'upload':
                    message = `${log.user_name} uploaded "${log.document_title}"`;
                    break;
                case 'download':
                    message = `${log.user_name} downloaded "${log.document_title}"`;
                    break;
                case 'delete':
                    message = `${log.user_name} deleted "${log.document_title}"`;
                    break;
                case 'edit':
                    message = `${log.user_name} edited "${log.document_title}"`;
                    break;
                default:
                    message = `${log.user_name} performed ${log.action}`;
            }
            
            return {
                ...log,
                message,
                time_ago: getTimeAgo(new Date(log.timestamp))
            };
        });
        
        res.json({
            total: results.length,
            activities: formattedResults
        });
    });
};

// Helper function to format "time ago" strings
const getTimeAgo = (date) => {
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);
    
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`;
    const weeks = Math.floor(days / 7);
    if (weeks < 4) return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
    const months = Math.floor(days / 30);
    return `${months} month${months > 1 ? 's' : ''} ago`;
};

// TOP USERS (most active)
export const getTopUsers = (req, res) => {
    const { limit = 5 } = req.query;
    
    const query = `
        SELECT u.user_id, u.name, u.email, u.role_id, r.role_name,
               COUNT(l.log_id) as activity_count
        FROM Users u
        JOIN Roles r ON u.role_id = r.role_id
        LEFT JOIN Logs l ON u.user_id = l.user_id
        GROUP BY u.user_id
        ORDER BY activity_count DESC
        LIMIT ?
    `;
    
    db.query(query, [parseInt(limit)], (err, results) => {
        if (err) {
            return res.status(500).json({ message: 'Database error', error: err.message });
        }
        res.json(results);
    });
};

// TOP DOCUMENTS (most downloaded)
export const getTopDocuments = (req, res) => {
    const { limit = 5 } = req.query;
    
    const query = `
        SELECT d.document_id, d.title, d.category, 
               COUNT(l.log_id) as download_count,
               u.name as uploaded_by_name
        FROM Documents d
        LEFT JOIN Logs l ON d.document_id = l.document_id AND l.action = 'download'
        LEFT JOIN Users u ON d.uploaded_by = u.user_id
        GROUP BY d.document_id
        ORDER BY download_count DESC
        LIMIT ?
    `;
    
    db.query(query, [parseInt(limit)], (err, results) => {
        if (err) {
            return res.status(500).json({ message: 'Database error', error: err.message });
        }
        res.json(results);
    });
};
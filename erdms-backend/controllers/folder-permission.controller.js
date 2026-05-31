import db from '../db.js';

// Check if a user has access to a folder
export const checkFolderAccess = (userId, folderId, requiredPermission = 'view', callback) => {
    // First, get the folder to check its permission level
    db.query('SELECT folder_id, folder_name, permissions, created_by, parent_folder_id FROM Folders WHERE folder_id = ?', [folderId], (err, folderResults) => {
        if (err) return callback(err);
        if (folderResults.length === 0) return callback(null, false);
        
        const folder = folderResults[0];
        
        // Get user's role
        db.query('SELECT role_id, role_name FROM Users u JOIN Roles r ON u.role_id = r.role_id WHERE u.user_id = ?', [userId], (err, userResults) => {
            if (err) return callback(err);
            
            const isAdmin = userResults[0]?.role_name === 'admin';
            const isSuperAdmin = userId === 3;
            
            // PUBLIC folder - everyone has access
            if (folder.permissions === 'public') {
                return callback(null, true);
            }
            
            // PRIVATE folder - admins have access, employees need permission
            if (folder.permissions === 'private') {
                if (isAdmin) {
                    return callback(null, true);
                }
                
                // Check if user is the creator
                if (folder.created_by === userId) {
                    return callback(null, true);
                }
                
                // Check Folder_permissions table
                db.query('SELECT * FROM Folder_permissions WHERE folder_id = ? AND user_id = ? AND (expires_at IS NULL OR expires_at > NOW())', 
                    [folderId, userId], (err, permResults) => {
                    if (err) return callback(err);
                    return callback(null, permResults.length > 0);
                });
                return;
            }
            
            // RESTRICTED folder - only users with explicit permission (admins need permission too)
            if (folder.permissions === 'restricted') {
                // Super Admin bypass for restricted? No - must be granted
                // Check Folder_permissions table
                db.query('SELECT * FROM Folder_permissions WHERE folder_id = ? AND user_id = ? AND (expires_at IS NULL OR expires_at > NOW())', 
                    [folderId, userId], (err, permResults) => {
                    if (err) return callback(err);
                    return callback(null, permResults.length > 0);
                });
                return;
            }
            
            callback(null, false);
        });
    });
};

// Grant folder access to a user
export const grantFolderAccess = (req, res) => {
    const { folder_id, user_id, permission_type, expires_at } = req.body;
    const granted_by = req.user.user_id;
    const isSuperAdmin = req.user.user_id === 3;
    
    if (!folder_id || !user_id) {
        return res.status(400).json({ message: 'Folder ID and User ID are required' });
    }
    
    // Only Super Admin can grant folder access
    if (!isSuperAdmin) {
        return res.status(403).json({ message: 'Only Super Admin can grant folder access' });
    }
    
    // Check if folder exists
    db.query('SELECT folder_name, permissions FROM Folders WHERE folder_id = ?', [folder_id], (err, folderResults) => {
        if (err) return res.status(500).json({ message: 'Database error', error: err.message });
        if (folderResults.length === 0) return res.status(404).json({ message: 'Folder not found' });
        
        const folderName = folderResults[0].folder_name;
        const folderPermission = folderResults[0].permissions;
        
        // Check if user exists
        db.query('SELECT name FROM Users WHERE user_id = ?', [user_id], (err, userResults) => {
            if (err) return res.status(500).json({ message: 'Database error', error: err.message });
            if (userResults.length === 0) return res.status(404).json({ message: 'User not found' });
            
            const userName = userResults[0].name;
            
            // Insert or update permission
            const validPermission = permission_type || 'view';
            const expiryDate = expires_at || null;
            
            db.query(
                `INSERT INTO Folder_permissions (folder_id, user_id, permission_type, granted_by, expires_at)
                 VALUES (?, ?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE 
                 permission_type = VALUES(permission_type),
                 expires_at = VALUES(expires_at),
                 granted_by = VALUES(granted_by)`,
                [folder_id, user_id, validPermission, granted_by, expiryDate],
                (err) => {
                    if (err) {
                        return res.status(500).json({ message: 'Failed to grant access', error: err.message });
                    }
                    
                    // Log the action
                    db.query(
                        `INSERT INTO Logs (user_id, action, details) 
                         VALUES (?, "grant_folder_access", ?)`,
                        [granted_by, `Granted ${validPermission} access to folder "${folderName}" for user "${userName}" (UID: ${user_id})`]
                    );
                    
                    res.json({ message: 'Folder access granted successfully' });
                }
            );
        });
    });
};

// Revoke folder access
export const revokeFolderAccess = (req, res) => {
    const { folder_id, user_id } = req.params;
    const userId = req.user.user_id;
    const isSuperAdmin = userId === 3;
    
    if (!isSuperAdmin) {
        return res.status(403).json({ message: 'Only Super Admin can revoke folder access' });
    }
    
    db.query('SELECT folder_name FROM Folders WHERE folder_id = ?', [folder_id], (err, folderResults) => {
        if (err) return res.status(500).json({ message: 'Database error', error: err.message });
        
        const folderName = folderResults[0]?.folder_name || 'Unknown';
        
        db.query('DELETE FROM Folder_permissions WHERE folder_id = ? AND user_id = ?', [folder_id, user_id], (err) => {
            if (err) {
                return res.status(500).json({ message: 'Failed to revoke access', error: err.message });
            }
            
            db.query(
                `INSERT INTO Logs (user_id, action, details) 
                 VALUES (?, "revoke_folder_access", ?)`,
                [userId, `Revoked access to folder "${folderName}" for user ID ${user_id}`]
            );
            
            res.json({ message: 'Folder access revoked successfully' });
        });
    });
};

// Get all users with access to a folder
export const getFolderAccessList = (req, res) => {
    const { folder_id } = req.params;
    const isSuperAdmin = req.user.user_id === 3;
    
    if (!isSuperAdmin) {
        return res.status(403).json({ message: 'Only Super Admin can view folder access lists' });
    }
    
    const query = `
        SELECT fp.*, u.name as user_name, u.email as user_email, u.role_id,
               g.name as granted_by_name
        FROM Folder_permissions fp
        JOIN Users u ON fp.user_id = u.user_id
        LEFT JOIN Users g ON fp.granted_by = g.user_id
        WHERE fp.folder_id = ?
        ORDER BY u.name
    `;
    
    db.query(query, [folder_id], (err, results) => {
        if (err) {
            return res.status(500).json({ message: 'Database error', error: err.message });
        }
        res.json(results);
    });
};
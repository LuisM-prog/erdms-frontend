import db from '../db.js';

// GET all users who have access to a specific document
export const getDocumentAccessList = (req, res) => {
    const { documentId } = req.params;
    
    // First check if document exists
    db.query('SELECT * FROM Documents WHERE document_id = ?', [documentId], (err, docResults) => {
        if (err) {
            return res.status(500).json({ message: 'Database error', error: err.message });
        }
        if (docResults.length === 0) {
            return res.status(404).json({ message: 'Document not found' });
        }
        
        const query = `
            SELECT dp.permission_id, dp.document_id, dp.user_id, dp.permission_type,
                   u.name, u.email, u.status, r.role_name
            FROM Document_permissions dp
            JOIN Users u ON dp.user_id = u.user_id
            JOIN Roles r ON u.role_id = r.role_id
            WHERE dp.document_id = ?
            ORDER BY u.name
        `;
        
        db.query(query, [documentId], (err, results) => {
            if (err) {
                return res.status(500).json({ message: 'Database error', error: err.message });
            }
            res.json({
                document_id: documentId,
                users_with_access: results
            });
        });
    });
};

// GRANT access to a user for a specific document
export const grantDocumentAccess = (req, res) => {
    const { documentId } = req.params;
    const { user_id, permission_type } = req.body;
    
    if (!user_id) {
        return res.status(400).json({ message: 'user_id is required' });
    }
    
    const permType = permission_type || 'view';
    
    if (!['view', 'download'].includes(permType)) {
        return res.status(400).json({ message: 'permission_type must be view or download' });
    }
    
    // Check if document exists
    db.query('SELECT * FROM Documents WHERE document_id = ?', [documentId], (err, docResults) => {
        if (err) {
            return res.status(500).json({ message: 'Database error', error: err.message });
        }
        if (docResults.length === 0) {
            return res.status(404).json({ message: 'Document not found' });
        }
        
        // Check if user exists
        db.query('SELECT * FROM Users WHERE user_id = ?', [user_id], (err, userResults) => {
            if (err) {
                return res.status(500).json({ message: 'Database error', error: err.message });
            }
            if (userResults.length === 0) {
                return res.status(404).json({ message: 'User not found' });
            }
            
            // Check if permission already exists
            db.query(
                'SELECT * FROM Document_permissions WHERE document_id = ? AND user_id = ?',
                [documentId, user_id],
                (err, permResults) => {
                    if (err) {
                        return res.status(500).json({ message: 'Database error', error: err.message });
                    }
                    if (permResults.length > 0) {
                        return res.status(400).json({ message: 'User already has access to this document' });
                    }
                    
                    // Grant access
                    db.query(
                        'INSERT INTO Document_permissions (document_id, user_id, permission_type) VALUES (?, ?, ?)',
                        [documentId, user_id, permType],
                        (err, result) => {
                            if (err) {
                                return res.status(500).json({ message: 'Failed to grant access', error: err.message });
                            }
                            
                            // Log the permission grant
                            db.query(
                                'INSERT INTO Logs (user_id, action, document_id) VALUES (?, "edit", ?)',
                                [req.user.user_id, documentId]
                            );
                            
                            res.status(201).json({
                                message: 'Access granted successfully',
                                permission_id: result.insertId,
                                document_id: documentId,
                                user_id: user_id,
                                permission_type: permType
                            });
                        }
                    );
                }
            );
        });
    });
};

// REVOKE access from a user for a specific document
export const revokeDocumentAccess = (req, res) => {
    const { documentId, userId } = req.params;
    
    // Check if permission exists
    db.query(
        'SELECT * FROM Document_permissions WHERE document_id = ? AND user_id = ?',
        [documentId, userId],
        (err, permResults) => {
            if (err) {
                return res.status(500).json({ message: 'Database error', error: err.message });
            }
            if (permResults.length === 0) {
                return res.status(404).json({ message: 'Permission not found' });
            }
            
            // Delete permission
            db.query(
                'DELETE FROM Document_permissions WHERE document_id = ? AND user_id = ?',
                [documentId, userId],
                (err) => {
                    if (err) {
                        return res.status(500).json({ message: 'Failed to revoke access', error: err.message });
                    }
                    
                    // Log the permission revoke
                    db.query(
                        'INSERT INTO Logs (user_id, action, document_id) VALUES (?, "edit", ?)',
                        [req.user.user_id, documentId]
                    );
                    
                    res.json({ message: 'Access revoked successfully' });
                }
            );
        }
    );
};

// GET all documents a specific user has access to (via explicit permissions)
export const getUserDocumentAccess = (req, res) => {
    const { userId } = req.params;
    
    // Check if user exists
    db.query('SELECT * FROM Users WHERE user_id = ?', [userId], (err, userResults) => {
        if (err) {
            return res.status(500).json({ message: 'Database error', error: err.message });
        }
        if (userResults.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        const query = `
            SELECT d.document_id, d.title, d.category, d.accessibility, 
                   f.folder_name, dp.permission_type
            FROM Document_permissions dp
            JOIN Documents d ON dp.document_id = d.document_id
            JOIN Folders f ON d.folder_id = f.folder_id
            WHERE dp.user_id = ?
            ORDER BY d.document_id DESC
        `;
        
        db.query(query, [userId], (err, results) => {
            if (err) {
                return res.status(500).json({ message: 'Database error', error: err.message });
            }
            res.json({
                user_id: userId,
                user_name: userResults[0].name,
                accessible_documents: results
            });
        });
    });
};

// CHECK if current user has access to a specific document
export const checkDocumentAccess = (req, res) => {
    const { document_id } = req.body;
    const userId = req.user.user_id;
    const userRole = req.user.role_name;
    
    if (!document_id) {
        return res.status(400).json({ message: 'document_id is required' });
    }
    
    // Admin has access to everything
    if (userRole === 'admin') {
        return res.json({ has_access: true, reason: 'admin' });
    }
    
    // Get document with folder info
    db.query(
        `SELECT d.*, f.permissions as folder_permissions 
         FROM Documents d
         JOIN Folders f ON d.folder_id = f.folder_id
         WHERE d.document_id = ?`,
        [document_id],
        (err, results) => {
            if (err) {
                return res.status(500).json({ message: 'Database error', error: err.message });
            }
            if (results.length === 0) {
                return res.status(404).json({ message: 'Document not found' });
            }
            
            const document = results[0];
            
            // Public folder - everyone can access
            if (document.folder_permissions === 'public') {
                return res.json({ has_access: true, reason: 'public_folder' });
            }
            
            // Uploader has access
            if (document.uploaded_by === userId) {
                return res.json({ has_access: true, reason: 'uploader' });
            }
            
            // Check explicit permission
            db.query(
                'SELECT * FROM Document_permissions WHERE document_id = ? AND user_id = ?',
                [document_id, userId],
                (err, permResults) => {
                    if (err) {
                        return res.status(500).json({ message: 'Database error', error: err.message });
                    }
                    if (permResults.length > 0) {
                        return res.json({ 
                            has_access: true, 
                            reason: 'explicit_permission',
                            permission_type: permResults[0].permission_type
                        });
                    }
                    
                    return res.json({ has_access: false, reason: 'no_permission' });
                }
            );
        }
    );
};

// GET all users (for dropdown when granting access)
export const getAllUsersSimple = (req, res) => {
    db.query(
        'SELECT user_id, name, email, role_id, status FROM Users ORDER BY name',
        (err, results) => {
            if (err) {
                return res.status(500).json({ message: 'Database error', error: err.message });
            }
            res.json(results);
        }
    );
};
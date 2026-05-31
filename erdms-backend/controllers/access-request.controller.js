import db from '../db.js';

// Request access to a folder or document
export const requestAccess = (req, res) => {
    const { target_type, target_id, requested_permission, request_message } = req.body;
    const requester_id = req.user.user_id;
    
    if (!target_type || !target_id || !requested_permission) {
        return res.status(400).json({ message: 'Target type, target ID, and requested permission are required' });
    }
    
    if (!['folder', 'document'].includes(target_type)) {
        return res.status(400).json({ message: 'Target type must be folder or document' });
    }
    
    if (!['view', 'download', 'both'].includes(requested_permission)) {
        return res.status(400).json({ message: 'Permission must be view, download, or both' });
    }
    
    // Set expiration to 7 days from now
    const expires_at = new Date();
    expires_at.setDate(expires_at.getDate() + 7);
    
    // Get target name for logging
    let nameQuery = '';
    let nameParam = '';
    if (target_type === 'folder') {
        nameQuery = 'SELECT folder_name as name FROM Folders WHERE folder_id = ?';
        nameParam = target_id;
    } else {
        nameQuery = 'SELECT title as name FROM Documents WHERE document_id = ?';
        nameParam = target_id;
    }
    
    db.query(nameQuery, [nameParam], (err, targetResults) => {
        if (err) {
            return res.status(500).json({ message: 'Database error', error: err.message });
        }
        if (targetResults.length === 0) {
            return res.status(404).json({ message: 'Target not found' });
        }
        
        const targetName = targetResults[0].name;
        
        // Check if request already exists
        db.query(
            `SELECT * FROM Access_requests 
             WHERE requester_id = ? AND target_type = ? AND target_id = ? AND status = 'pending'`,
            [requester_id, target_type, target_id],
            (err, existing) => {
                if (err) return res.status(500).json({ message: 'Database error', error: err.message });
                if (existing.length > 0) {
                    return res.status(400).json({ message: 'You already have a pending request for this item' });
                }
                
                db.query(
                    `INSERT INTO Access_requests 
                     (requester_id, target_type, target_id, requested_permission, request_message, expires_at) 
                     VALUES (?, ?, ?, ?, ?, ?)`,
                    [requester_id, target_type, target_id, requested_permission, request_message || null, expires_at],
                    (err, result) => {
                        if (err) {
                            return res.status(500).json({ message: 'Failed to create request', error: err.message });
                        }
                        
                        db.query(
                            `INSERT INTO Logs (user_id, action, details) 
                             VALUES (?, "request_access", ?)`,
                            [requester_id, `Requested ${requested_permission} access to ${target_type} "${targetName}" (ID: ${target_id})`]
                        );
                        
                        res.status(201).json({
                            message: 'Access request submitted successfully',
                            request_id: result.insertId,
                            expires_at: expires_at
                        });
                    }
                );
            }
        );
    });
};

// Get all pending access requests (Super Admin only)
export const getPendingAccessRequests = (req, res) => {
    const userId = req.user.user_id;
    
    if (userId !== 3) {
        return res.status(403).json({ message: 'Only Super Admin can view pending access requests' });
    }
    
    const query = `
        SELECT ar.*, 
               u.name as requester_name, u.email as requester_email,
               CASE 
                   WHEN ar.target_type = 'folder' THEN f.folder_name
                   WHEN ar.target_type = 'document' THEN d.title
               END as target_name
        FROM Access_requests ar
        LEFT JOIN Users u ON ar.requester_id = u.user_id
        LEFT JOIN Folders f ON ar.target_type = 'folder' AND ar.target_id = f.folder_id
        LEFT JOIN Documents d ON ar.target_type = 'document' AND ar.target_id = d.document_id
        WHERE ar.status = 'pending' AND ar.expires_at > NOW()
        ORDER BY ar.requested_at ASC
    `;
    
    db.query(query, (err, results) => {
        if (err) {
            return res.status(500).json({ message: 'Database error', error: err.message });
        }
        res.json(results);
    });
};

// Approve access request (Super Admin only)
export const approveAccessRequest = (req, res) => {
    const { id } = req.params;
    const { granted_permission } = req.body;
    const userId = req.user.user_id;
    
    if (userId !== 3) {
        return res.status(403).json({ message: 'Only Super Admin can approve access requests' });
    }
    
    db.query(
        `SELECT ar.*, u.name as requester_name 
         FROM Access_requests ar
         JOIN Users u ON ar.requester_id = u.user_id
         WHERE ar.request_id = ? AND ar.status = 'pending'`,
        [id],
        (err, results) => {
            if (err) return res.status(500).json({ message: 'Database error', error: err.message });
            if (results.length === 0) {
                return res.status(404).json({ message: 'Request not found or already processed' });
            }
            
            const request = results[0];
            const finalPermission = granted_permission || request.requested_permission;
            
            // Grant access based on target type
            if (request.target_type === 'folder') {
                db.query(
                    `INSERT INTO Folder_permissions (folder_id, user_id, permission_type, granted_by, expires_at)
                     VALUES (?, ?, ?, ?, NULL)
                     ON DUPLICATE KEY UPDATE 
                     permission_type = VALUES(permission_type),
                     granted_by = VALUES(granted_by)`,
                    [request.target_id, request.requester_id, finalPermission === 'both' ? 'download' : finalPermission, userId],
                    (err) => {
                        if (err) {
                            return res.status(500).json({ message: 'Failed to grant access', error: err.message });
                        }
                        updateRequestStatus();
                    }
                );
            } else {
                // Document permission
                db.query(
                    `INSERT INTO Document_permissions (document_id, user_id, permission_type)
                     VALUES (?, ?, ?)
                     ON DUPLICATE KEY UPDATE 
                     permission_type = VALUES(permission_type)`,
                    [request.target_id, request.requester_id, finalPermission === 'both' ? 'download' : finalPermission],
                    (err) => {
                        if (err) {
                            return res.status(500).json({ message: 'Failed to grant access', error: err.message });
                        }
                        updateRequestStatus();
                    }
                );
            }
            
            function updateRequestStatus() {
                db.query(
                    `UPDATE Access_requests 
                     SET status = 'approved', reviewed_by = ?, reviewed_at = NOW(), granted_permission = ?
                     WHERE request_id = ?`,
                    [userId, finalPermission, id],
                    (err) => {
                        if (err) {
                            return res.status(500).json({ message: 'Failed to update request status', error: err.message });
                        }
                        
                        db.query(
                            `INSERT INTO Logs (user_id, action, details) 
                             VALUES (?, "approve_access_request", ?)`,
                            [userId, `Approved access request #${id} from ${request.requester_name} for ${request.target_type} ID ${request.target_id}`]
                        );
                        
                        res.json({ message: 'Access request approved successfully' });
                    }
                );
            }
        }
    );
};

// Reject access request (Super Admin only)
export const rejectAccessRequest = (req, res) => {
    const { id } = req.params;
    const { rejection_reason } = req.body;
    const userId = req.user.user_id;
    
    if (userId !== 3) {
        return res.status(403).json({ message: 'Only Super Admin can reject access requests' });
    }
    
    db.query(
        `SELECT ar.*, u.name as requester_name 
         FROM Access_requests ar
         JOIN Users u ON ar.requester_id = u.user_id
         WHERE ar.request_id = ? AND ar.status = 'pending'`,
        [id],
        (err, results) => {
            if (err) return res.status(500).json({ message: 'Database error', error: err.message });
            if (results.length === 0) {
                return res.status(404).json({ message: 'Request not found or already processed' });
            }
            
            const request = results[0];
            
            db.query(
                `UPDATE Access_requests 
                 SET status = 'rejected', reviewed_by = ?, reviewed_at = NOW(), rejection_reason = ?
                 WHERE request_id = ?`,
                [userId, rejection_reason || 'No reason provided', id],
                (err) => {
                    if (err) {
                        return res.status(500).json({ message: 'Failed to reject request', error: err.message });
                    }
                    
                    db.query(
                        `INSERT INTO Logs (user_id, action, details) 
                         VALUES (?, "reject_access_request", ?)`,
                        [userId, `Rejected access request #${id} from ${request.requester_name}. Reason: ${rejection_reason || 'Not specified'}`]
                    );
                    
                    res.json({ message: 'Access request rejected successfully' });
                }
            );
        }
    );
};

// Check if user has access to a specific item (used by frontend)
export const checkItemAccess = (req, res) => {
    const { target_type, target_id } = req.body;
    const userId = req.user.user_id;
    
    if (!target_type || !target_id) {
        return res.status(400).json({ message: 'Target type and ID are required' });
    }
    
    if (target_type === 'folder') {
        checkFolderAccess(userId, target_id, 'view', (err, hasAccess) => {
            if (err) return res.status(500).json({ message: 'Database error', error: err.message });
            res.json({ has_access: hasAccess });
        });
    } else {
        // For documents, check via document access logic
        db.query('SELECT folder_id FROM Documents WHERE document_id = ?', [target_id], (err, docResults) => {
            if (err) return res.status(500).json({ message: 'Database error', error: err.message });
            if (docResults.length === 0) return res.json({ has_access: false });
            
            checkFolderAccess(userId, docResults[0].folder_id, 'view', (err, hasAccess) => {
                if (err) return res.status(500).json({ message: 'Database error', error: err.message });
                res.json({ has_access: hasAccess });
            });
        });
    }
};
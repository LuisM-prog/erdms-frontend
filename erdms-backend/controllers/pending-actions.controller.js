import db from '../db.js';

// Request to change user status (requires 2FA)
export const requestStatusChange = (req, res) => {
    const { target_user_id, action_type } = req.body;
    const requested_by = req.user.user_id;
    const requesterName = req.user.name;
    
    if (!target_user_id || !action_type) {
        return res.status(400).json({ message: 'Target user ID and action type are required' });
    }
    
    if (action_type !== 'activate' && action_type !== 'deactivate') {
        return res.status(400).json({ message: 'Action type must be activate or deactivate' });
    }
    
    // Get target user name for logging
    db.query('SELECT name, email FROM Users WHERE user_id = ?', [target_user_id], (err, userResults) => {
        if (err) {
            return res.status(500).json({ message: 'Database error', error: err.message });
        }
        
        const targetUserName = userResults[0]?.name || 'Unknown User';
        const targetUserEmail = userResults[0]?.email || 'Unknown';
        
        // Check if requester is the Super Admin (user_id 3)
        if (requested_by === 3) {
            // Super Admin can bypass 2FA
            const newStatus = action_type === 'activate' ? 'active' : 'inactive';
            db.query('UPDATE Users SET status = ? WHERE user_id = ?', [newStatus, target_user_id], (err) => {
                if (err) {
                    return res.status(500).json({ message: 'Database error', error: err.message });
                }
                
                // Log the Super Admin direct action
                db.query(
                    `INSERT INTO Logs (user_id, action, details) 
                     VALUES (?, "super_admin_status_change", ?)`,
                    [requested_by, `Super Admin ${requesterName} directly ${action_type}d user "${targetUserName}" (${targetUserEmail})`]
                );
                
                res.json({ message: `User ${action_type}d successfully (Super Admin bypass)`, bypassed: true });
            });
            return;
        }
        
        // For regular admins, create a pending action for Super Admin approval
        db.query(
            'INSERT INTO pending_actions (requested_by, target_user_id, action_type, status) VALUES (?, ?, ?, "pending")',
            [requested_by, target_user_id, action_type],
            (err, result) => {
                if (err) {
                    return res.status(500).json({ message: 'Database error', error: err.message });
                }
                
                // Log the request submission
                db.query(
                    `INSERT INTO Logs (user_id, action, details) 
                     VALUES (?, "request_status_change", ?)`,
                    [requested_by, `Admin "${requesterName}" requested to ${action_type} user "${targetUserName}" (UID: ${target_user_id}). Approval pending.`]
                );
                
                res.status(201).json({
                    message: `Request to ${action_type} user has been sent to Super Admin for approval`,
                    pending_id: result.insertId
                });
            }
        );
    });
};

// Get all pending actions (Super Admin only)
export const getPendingActions = (req, res) => {
    const userId = req.user.user_id;
    
    // Only Super Admin (user_id = 3) can view pending actions
    if (userId !== 3) {
        return res.status(403).json({ message: 'Only Super Admin can view pending actions' });
    }
    
    const query = `
        SELECT pa.*, 
               ru.name as requested_by_name, 
               tu.name as target_user_name, 
               tu.email as target_user_email,
               au.name as approved_by_name
        FROM pending_actions pa
        LEFT JOIN Users ru ON pa.requested_by = ru.user_id
        LEFT JOIN Users tu ON pa.target_user_id = tu.user_id
        LEFT JOIN Users au ON pa.approved_by = au.user_id
        WHERE pa.status = 'pending'
        ORDER BY pa.requested_at DESC
    `;
    
    db.query(query, (err, results) => {
        if (err) {
            return res.status(500).json({ message: 'Database error', error: err.message });
        }
        res.json(results);
    });
};

// Approve a pending action (Super Admin only)
export const approveAction = (req, res) => {
    const { id } = req.params;
    const userId = req.user.user_id;
    const adminName = req.user.name;
    
    if (userId !== 3) {
        return res.status(403).json({ message: 'Only Super Admin can approve actions' });
    }
    
    // Get the pending action with user details
    db.query(
        `SELECT pa.*, ru.name as requester_name, tu.name as target_name, tu.email as target_email
         FROM pending_actions pa
         LEFT JOIN Users ru ON pa.requested_by = ru.user_id
         LEFT JOIN Users tu ON pa.target_user_id = tu.user_id
         WHERE pa.pending_id = ? AND pa.status = "pending"`,
        [id],
        (err, results) => {
            if (err) {
                return res.status(500).json({ message: 'Database error', error: err.message });
            }
            if (results.length === 0) {
                return res.status(404).json({ message: 'Pending action not found or already processed' });
            }
            
            const action = results[0];
            const newStatus = action.action_type === 'activate' ? 'active' : 'inactive';
            const actionWord = action.action_type === 'activate' ? 'activated' : 'deactivated';
            
            // Update user status
            db.query('UPDATE Users SET status = ? WHERE user_id = ?', [newStatus, action.target_user_id], (err) => {
                if (err) {
                    return res.status(500).json({ message: 'Failed to update user status', error: err.message });
                }
                
                // Update pending action status
                db.query(
                    'UPDATE pending_actions SET status = "approved", approved_by = ?, approved_at = NOW() WHERE pending_id = ?',
                    [userId, id],
                    (err) => {
                        if (err) {
                            return res.status(500).json({ message: 'Failed to update action status', error: err.message });
                        }
                        
                        // Log the approval
                        db.query(
                            `INSERT INTO Logs (user_id, action, details) 
                             VALUES (?, "approve_status_change", ?)`,
                            [userId, `Super Admin "${adminName}" APPROVED request #${id} by "${action.requester_name}" to ${action.action_type} user "${action.target_name}" (${action.target_email}). User successfully ${actionWord}.`]
                        );
                        
                        res.json({ message: `User ${action.action_type}d successfully` });
                    }
                );
            });
        }
    );
};

// Reject a pending action (Super Admin only)
export const rejectAction = (req, res) => {
    const { id } = req.params;
    const { reason } = req.body;
    const userId = req.user.user_id;
    const adminName = req.user.name;
    
    if (userId !== 3) {
        return res.status(403).json({ message: 'Only Super Admin can reject actions' });
    }
    
    // Get the pending action with user details
    db.query(
        `SELECT pa.*, ru.name as requester_name, tu.name as target_name, tu.email as target_email
         FROM pending_actions pa
         LEFT JOIN Users ru ON pa.requested_by = ru.user_id
         LEFT JOIN Users tu ON pa.target_user_id = tu.user_id
         WHERE pa.pending_id = ? AND pa.status = "pending"`,
        [id],
        (err, results) => {
            if (err) {
                return res.status(500).json({ message: 'Database error', error: err.message });
            }
            if (results.length === 0) {
                return res.status(404).json({ message: 'Pending action not found or already processed' });
            }
            
            const action = results[0];
            const rejectReason = reason || 'No reason provided';
            
            db.query(
                'UPDATE pending_actions SET status = "rejected", rejection_reason = ?, approved_by = ?, approved_at = NOW() WHERE pending_id = ?',
                [rejectReason, userId, id],
                (err) => {
                    if (err) {
                        return res.status(500).json({ message: 'Database error', error: err.message });
                    }
                    
                    // Log the rejection
                    db.query(
                        `INSERT INTO Logs (user_id, action, details) 
                         VALUES (?, "reject_status_change", ?)`,
                        [userId, `Super Admin "${adminName}" REJECTED request #${id} by "${action.requester_name}" to ${action.action_type} user "${action.target_name}" (${action.target_email}). Reason: ${rejectReason}`]
                    );
                    
                    res.json({ message: 'Request rejected successfully' });
                }
            );
        }
    );
};

// Get all pending action history (for audit purposes)
export const getPendingActionHistory = (req, res) => {
    const userId = req.user.user_id;
    
    // Only Super Admin (user_id = 3) can view history
    if (userId !== 3) {
        return res.status(403).json({ message: 'Only Super Admin can view pending action history' });
    }
    
    const query = `
        SELECT pa.*, 
               ru.name as requested_by_name, 
               tu.name as target_user_name, 
               tu.email as target_user_email,
               au.name as approved_by_name
        FROM pending_actions pa
        LEFT JOIN Users ru ON pa.requested_by = ru.user_id
        LEFT JOIN Users tu ON pa.target_user_id = tu.user_id
        LEFT JOIN Users au ON pa.approved_by = au.user_id
        ORDER BY pa.requested_at DESC
        LIMIT 50
    `;
    
    db.query(query, (err, results) => {
        if (err) {
            return res.status(500).json({ message: 'Database error', error: err.message });
        }
        res.json(results);
    });
};
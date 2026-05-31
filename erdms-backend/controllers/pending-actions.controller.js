import db from '../db.js';
import bcrypt from 'bcryptjs';
import generatePassword from '../utils/generatePassword.js';

// Request to change user status (requires 2FA)
export const requestStatusChange = (req, res) => {
    const { target_user_id, action_type } = req.body;
    const requested_by = req.user.user_id;
    const requesterName = req.user.name;
    
    if (!target_user_id || !action_type) {
        return res.status(400).json({ message: 'Target user ID and action type are required' });
    }
    
    // Prevent modifying Super Admin (UID 3)
    if (target_user_id === 3) {
        return res.status(403).json({ message: 'Cannot modify the Super Admin account.' });
    }
    
    if (action_type !== 'activate' && action_type !== 'deactivate') {
        return res.status(400).json({ message: 'Action type must be activate or deactivate' });
    }
    
    db.query('SELECT name, email FROM Users WHERE user_id = ?', [target_user_id], (err, userResults) => {
        if (err) {
            return res.status(500).json({ message: 'Database error', error: err.message });
        }
        
        const targetUserName = userResults[0]?.name || 'Unknown User';
        const targetUserEmail = userResults[0]?.email || 'Unknown';
        
        db.query(
            'SELECT * FROM pending_actions WHERE target_user_id = ? AND action_type = ? AND status = "pending"',
            [target_user_id, action_type],
            (err, existingRequests) => {
                if (err) {
                    return res.status(500).json({ message: 'Database error', error: err.message });
                }
                
                if (existingRequests.length > 0) {
                    return res.status(400).json({ 
                        message: 'A pending request already exists for this user.' 
                    });
                }
                
                if (requested_by === 3) {
                    const newStatus = action_type === 'activate' ? 'active' : 'inactive';
                    db.query('UPDATE Users SET status = ? WHERE user_id = ?', [newStatus, target_user_id], (err) => {
                        if (err) {
                            return res.status(500).json({ message: 'Database error', error: err.message });
                        }
                        
                        db.query(
                            `INSERT INTO Logs (user_id, action, details) 
                             VALUES (?, "super_admin_status_change", ?)`,
                            [requested_by, `Super Admin ${requesterName} directly ${action_type}d user "${targetUserName}" (${targetUserEmail})`]
                        );
                        
                        res.json({ message: `User ${action_type}d successfully (Super Admin bypass)`, bypassed: true });
                    });
                    return;
                }
                
                db.query(
                    'INSERT INTO pending_actions (requested_by, target_user_id, action_type, status) VALUES (?, ?, ?, "pending")',
                    [requested_by, target_user_id, action_type],
                    (err, result) => {
                        if (err) {
                            return res.status(500).json({ message: 'Database error', error: err.message });
                        }
                        
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
            }
        );
    });
};

// Request password reset (requires 2FA for admin-to-admin)
export const requestPasswordReset = (req, res) => {
    const { target_user_id } = req.body;
    const requested_by = req.user.user_id;
    const requesterName = req.user.name;
    
    if (!target_user_id) {
        return res.status(400).json({ message: 'Target user ID is required' });
    }
    
    // Prevent modifying Super Admin (UID 3)
    if (target_user_id === 3) {
        return res.status(403).json({ message: 'Cannot modify the Super Admin account.' });
    }
    
    db.query('SELECT name, email, role_id FROM Users WHERE user_id = ?', [target_user_id], (err, userResults) => {
        if (err) {
            return res.status(500).json({ message: 'Database error', error: err.message });
        }
        if (userResults.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        const targetUser = userResults[0];
        const isTargetAdmin = targetUser.role_id === 1;
        const isSuperAdmin = requested_by === 3;
        
        if (!isTargetAdmin || isSuperAdmin) {
            const newPassword = generatePassword();
            const hashedPassword = bcrypt.hashSync(newPassword, 10);
            
            db.query('UPDATE Users SET password = ? WHERE user_id = ?', [hashedPassword, target_user_id], (err) => {
                if (err) {
                    return res.status(500).json({ message: 'Failed to reset password', error: err.message });
                }
                
                db.query(
                    `INSERT INTO Logs (user_id, action, details) 
                     VALUES (?, "reset_password", ?)`,
                    [requested_by, `Password reset for user "${targetUser.name}" (UID: ${target_user_id}) by ${requesterName}`]
                );
                
                res.json({ 
                    message: 'Password reset successful',
                    temporary_password: newPassword,
                    direct: true
                });
            });
            return;
        }
        
        db.query(
            'SELECT * FROM pending_actions WHERE target_user_id = ? AND action_type = "password_reset" AND status = "pending"',
            [target_user_id],
            (err, existingRequests) => {
                if (err) {
                    return res.status(500).json({ message: 'Database error', error: err.message });
                }
                
                if (existingRequests.length > 0) {
                    return res.status(400).json({ 
                        message: 'A pending password reset request already exists for this user.' 
                    });
                }
                
                db.query(
                    'INSERT INTO pending_actions (requested_by, target_user_id, action_type, status) VALUES (?, ?, "password_reset", "pending")',
                    [requested_by, target_user_id],
                    (err, result) => {
                        if (err) {
                            return res.status(500).json({ message: 'Failed to create request', error: err.message });
                        }
                        
                        db.query(
                            `INSERT INTO Logs (user_id, action, details) 
                             VALUES (?, "request_password_reset", ?)`,
                            [requested_by, `Admin "${requesterName}" requested password reset for user "${targetUser.name}" (UID: ${target_user_id}). Approval pending.`]
                        );
                        
                        res.status(201).json({
                            message: 'Password reset request submitted for approval',
                            pending_id: result.insertId
                        });
                    }
                );
            }
        );
    });
};

// Request role change (requires 2FA approval)
export const requestRoleChange = (req, res) => {
    let { target_user_id, new_role_id } = req.body;
    const requested_by = req.user.user_id;
    const requesterName = req.user.name;
    
    target_user_id = parseInt(target_user_id, 10);
    new_role_id = parseInt(new_role_id, 10);
    
    if (!target_user_id || !new_role_id) {
        return res.status(400).json({ message: 'Target user ID and new role ID are required' });
    }
    
    // Prevent modifying Super Admin (UID 3)
    if (target_user_id === 3) {
        return res.status(403).json({ message: 'Cannot modify the Super Admin account.' });
    }
    
    if (isNaN(target_user_id) || isNaN(new_role_id)) {
        return res.status(400).json({ message: 'Invalid user ID or role ID' });
    }
    
    if (new_role_id !== 1 && new_role_id !== 2) {
        return res.status(400).json({ message: 'Invalid role ID. Must be 1 (admin) or 2 (employee)' });
    }
    
    db.query('SELECT name, email, role_id FROM Users WHERE user_id = ?', [target_user_id], (err, userResults) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ message: 'Database error', error: err.message });
        }
        if (userResults.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        const targetUser = userResults[0];
        const isSuperAdmin = requested_by === 3;
        
        if (isSuperAdmin) {
            db.query('UPDATE Users SET role_id = ? WHERE user_id = ?', [new_role_id, target_user_id], (err) => {
                if (err) {
                    console.error('Failed to update role:', err);
                    return res.status(500).json({ message: 'Failed to update role', error: err.message });
                }
                
                const oldRole = targetUser.role_id === 1 ? 'Admin' : 'Employee';
                const newRole = new_role_id === 1 ? 'Admin' : 'Employee';
                
                db.query(
                    `INSERT INTO Logs (user_id, action, details) 
                     VALUES (?, "role_change", ?)`,
                    [requested_by, `Super Admin changed user "${targetUser.name}" role from ${oldRole} to ${newRole}`]
                );
                
                return res.json({ message: `Role changed from ${oldRole} to ${newRole} successfully`, direct: true });
            });
            return;
        }
        
        db.query(
            'SELECT * FROM pending_actions WHERE target_user_id = ? AND action_type = "role_change" AND status = "pending"',
            [target_user_id],
            (err, existingRequests) => {
                if (err) {
                    console.error('Error checking existing requests:', err);
                    return res.status(500).json({ message: 'Database error', error: err.message });
                }
                
                if (existingRequests.length > 0) {
                    return res.status(400).json({ 
                        message: 'A pending role change request already exists for this user.' 
                    });
                }
                
                const actionData = JSON.stringify({ new_role_id });
                
                db.query(
                    'INSERT INTO pending_actions (requested_by, target_user_id, action_type, action_data, status) VALUES (?, ?, "role_change", ?, "pending")',
                    [requested_by, target_user_id, actionData],
                    (err, result) => {
                        if (err) {
                            console.error('Failed to create request:', err);
                            return res.status(500).json({ message: 'Failed to create request', error: err.message });
                        }
                        
                        const newRoleName = new_role_id === 1 ? 'Admin' : 'Employee';
                        
                        db.query(
                            `INSERT INTO Logs (user_id, action, details) 
                             VALUES (?, "request_role_change", ?)`,
                            [requested_by, `Admin "${requesterName}" requested role change for user "${targetUser.name}" (UID: ${target_user_id}) to ${newRoleName}. Approval pending.`]
                        );
                        
                        res.status(201).json({
                            message: 'Role change request submitted for approval',
                            pending_id: result.insertId
                        });
                    }
                );
            }
        );
    });
};

// Get all pending actions (Super Admin only)
export const getPendingActions = (req, res) => {
    const userId = req.user.user_id;
    
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
    
    db.query(
        `SELECT pa.*, ru.name as requester_name, tu.name as target_name, tu.email as target_email, tu.role_id
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
            
            // Handle based on action_type
            if (action.action_type === 'password_reset') {
                const newPassword = generatePassword();
                const hashedPassword = bcrypt.hashSync(newPassword, 10);
                
                db.query('UPDATE Users SET password = ? WHERE user_id = ?', [hashedPassword, action.target_user_id], (err) => {
                    if (err) {
                        return res.status(500).json({ message: 'Failed to reset password', error: err.message });
                    }
                    
                    db.query(
                        'UPDATE pending_actions SET status = "approved", approved_by = ?, approved_at = NOW() WHERE pending_id = ?',
                        [userId, id],
                        (err) => {
                            if (err) {
                                return res.status(500).json({ message: 'Failed to update action status', error: err.message });
                            }
                            
                            db.query(
                                `INSERT INTO Logs (user_id, action, details) 
                                 VALUES (?, "approve_password_reset", ?)`,
                                [userId, `Super Admin "${adminName}" APPROVED password reset request for user "${action.target_name}" (UID: ${action.target_user_id}).`]
                            );
                            
                            res.json({ 
                                message: 'Password reset approved successfully',
                                temporary_password: newPassword
                            });
                        }
                    );
                });
            } 
            else if (action.action_type === 'role_change') {
                const actionData = JSON.parse(action.action_data || '{}');
                const newRoleId = actionData.new_role_id;
                
                db.query('UPDATE Users SET role_id = ? WHERE user_id = ?', [newRoleId, action.target_user_id], (err) => {
                    if (err) {
                        return res.status(500).json({ message: 'Failed to update role', error: err.message });
                    }
                    
                    db.query(
                        'UPDATE pending_actions SET status = "approved", approved_by = ?, approved_at = NOW() WHERE pending_id = ?',
                        [userId, id],
                        (err) => {
                            if (err) {
                                return res.status(500).json({ message: 'Failed to update action status', error: err.message });
                            }
                            
                            const newRoleName = newRoleId === 1 ? 'Admin' : 'Employee';
                            
                            db.query(
                                `INSERT INTO Logs (user_id, action, details) 
                                 VALUES (?, "approve_role_change", ?)`,
                                [userId, `Super Admin "${adminName}" APPROVED role change request for user "${action.target_name}" (UID: ${action.target_user_id}) to ${newRoleName}.`]
                            );
                            
                            res.json({ message: `Role changed to ${newRoleName} successfully` });
                        }
                    );
                });
            }
            else if (action.action_type === 'activate' || action.action_type === 'deactivate') {
                const newStatus = action.action_type === 'activate' ? 'active' : 'inactive';
                const actionWord = action.action_type === 'activate' ? 'activated' : 'deactivated';
                
                db.query('UPDATE Users SET status = ? WHERE user_id = ?', [newStatus, action.target_user_id], (err) => {
                    if (err) {
                        return res.status(500).json({ message: 'Failed to update user status', error: err.message });
                    }
                    
                    db.query(
                        'UPDATE pending_actions SET status = "approved", approved_by = ?, approved_at = NOW() WHERE pending_id = ?',
                        [userId, id],
                        (err) => {
                            if (err) {
                                return res.status(500).json({ message: 'Failed to update action status', error: err.message });
                            }
                            
                            db.query(
                                `INSERT INTO Logs (user_id, action, details) 
                                 VALUES (?, "approve_status_change", ?)`,
                                [userId, `Super Admin "${adminName}" APPROVED request #${id} by "${action.requester_name}" to ${action.action_type} user "${action.target_name}".`]
                            );
                            
                            res.json({ message: `User ${action.action_type}d successfully` });
                        }
                    );
                });
            }
            else {
                res.status(400).json({ message: `Unknown action type: ${action.action_type}` });
            }
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
    
    db.query(
        `SELECT pa.*, ru.name as requester_name, tu.name as target_name
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
            let actionTypeLabel = '';
            
            if (action.action_type === 'role_change') {
                actionTypeLabel = 'role change';
            } else if (action.action_type === 'password_reset') {
                actionTypeLabel = 'password reset';
            } else {
                actionTypeLabel = `${action.action_type} account`;
            }
            
            db.query(
                'UPDATE pending_actions SET status = "rejected", rejection_reason = ?, approved_by = ?, approved_at = NOW() WHERE pending_id = ?',
                [reason || 'No reason provided', userId, id],
                (err) => {
                    if (err) {
                        return res.status(500).json({ message: 'Database error', error: err.message });
                    }
                    
                    db.query(
                        `INSERT INTO Logs (user_id, action, details) 
                         VALUES (?, "reject_action", ?)`,
                        [userId, `Super Admin "${adminName}" REJECTED ${actionTypeLabel} request #${id} from "${action.requester_name}" for user "${action.target_name}". Reason: ${reason || 'Not specified'}`]
                    );
                    
                    res.json({ message: 'Request rejected successfully' });
                }
            );
        }
    );
};

// Get pending action history (Super Admin only)
export const getPendingActionHistory = (req, res) => {
    const userId = req.user.user_id;
    
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
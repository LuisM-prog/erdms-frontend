import bcrypt from 'bcryptjs';
import db from '../db.js';
import generatePassword from '../utils/generatePassword.js';

// Email validation regex
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

const isValidEmail = (email) => {
    return EMAIL_REGEX.test(email);
};

// GET all users (Admin only)
export const getAllUsers = (req, res) => {
    db.query(
        `SELECT u.user_id, u.name, u.email, u.role_id, r.role_name, u.status, u.created_at 
         FROM Users u 
         JOIN Roles r ON u.role_id = r.role_id 
         ORDER BY u.user_id`,
        (err, results) => {
            if (err) {
                return res.status(500).json({ message: 'Database error', error: err.message });
            }
            res.json(results);
        }
    );
};

// GET single user by ID (Admin only)
export const getUserById = (req, res) => {
    const { id } = req.params;
    
    db.query(
        `SELECT u.user_id, u.name, u.email, u.role_id, r.role_name, u.status, u.created_at 
         FROM Users u 
         JOIN Roles r ON u.role_id = r.role_id 
         WHERE u.user_id = ?`,
        [id],
        (err, results) => {
            if (err) {
                return res.status(500).json({ message: 'Database error', error: err.message });
            }
            if (results.length === 0) {
                return res.status(404).json({ message: 'User not found' });
            }
            res.json(results[0]);
        }
    );
};

// CREATE new user (Admin only)
export const createUser = (req, res) => {
    const { name, email, role_id } = req.body;
    const adminId = req.user.user_id;
    
    if (!name || !email || !role_id) {
        return res.status(400).json({ message: 'Name, email, and role_id are required' });
    }
    
    // Validate email format
    if (!isValidEmail(email)) {
        return res.status(400).json({ message: 'Please enter a valid email address (e.g., user@example.com)' });
    }
    
    // Check if email exists
    db.query('SELECT * FROM Users WHERE email = ?', [email], (err, results) => {
        if (err) {
            return res.status(500).json({ message: 'Database error', error: err.message });
        }
        if (results.length > 0) {
            return res.status(400).json({ message: 'Email already exists' });
        }
        
        const tempPassword = generatePassword();
        const hashedPassword = bcrypt.hashSync(tempPassword, 10);
        
        db.query(
            'INSERT INTO Users (name, email, password, role_id, status) VALUES (?, ?, ?, ?, "active")',
            [name, email, hashedPassword, role_id],
            (err, result) => {
                if (err) {
                    return res.status(500).json({ message: 'Failed to create user', error: err.message });
                }
                
                db.query(
                    'INSERT INTO Logs (user_id, action) VALUES (?, "create_user")',
                    [adminId]
                );
                
                res.status(201).json({
                    message: 'User created successfully',
                    user_id: result.insertId,
                    temporary_password: tempPassword
                });
            }
        );
    });
};

// UPDATE user (Admin only)
export const updateUser = (req, res) => {
    const { id } = req.params;
    const { name, email, role_id, status } = req.body;
    const adminId = req.user.user_id;
    
    // Validate email format if email is being updated
    if (email && !isValidEmail(email)) {
        return res.status(400).json({ message: 'Please enter a valid email address (e.g., user@example.com)' });
    }
    
    let updates = [];
    let values = [];
    
    if (name) {
        updates.push('name = ?');
        values.push(name);
    }
    if (email) {
        // Check if email already taken by another user
        db.query('SELECT * FROM Users WHERE email = ? AND user_id != ?', [email, id], (err, results) => {
            if (err) return res.status(500).json({ message: 'Database error' });
            if (results.length > 0) {
                return res.status(400).json({ message: 'Email already in use' });
            }
        });
        updates.push('email = ?');
        values.push(email);
    }
    if (role_id) {
        updates.push('role_id = ?');
        values.push(role_id);
    }
    if (status) {
        if (!['active', 'inactive'].includes(status)) {
            return res.status(400).json({ message: 'Status must be active or inactive' });
        }
        updates.push('status = ?');
        values.push(status);
    }
    
    if (updates.length === 0) {
        return res.status(400).json({ message: 'No fields to update' });
    }
    
    values.push(id);
    
    db.query(
        `UPDATE Users SET ${updates.join(', ')} WHERE user_id = ?`,
        values,
        (err, result) => {
            if (err) {
                return res.status(500).json({ message: 'Database error', error: err.message });
            }
            if (result.affectedRows === 0) {
                return res.status(404).json({ message: 'User not found' });
            }
            
            db.query(
                'INSERT INTO Logs (user_id, action) VALUES (?, "edit_user")',
                [adminId]
            );
            
            res.json({ message: 'User updated successfully' });
        }
    );
};

// TOGGLE user status
export const toggleUserStatus = (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    const adminId = req.user.user_id;
    
    if (!status || !['active', 'inactive'].includes(status)) {
        return res.status(400).json({ message: 'Status must be active or inactive' });
    }
    
    db.query('SELECT name, status FROM Users WHERE user_id = ?', [id], (err, userResult) => {
        if (err) {
            return res.status(500).json({ message: 'Database error', error: err.message });
        }
        if (userResult.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        const userName = userResult[0].name;
        const oldStatus = userResult[0].status;
        
        if (oldStatus === status) {
            return res.status(400).json({ message: `User is already ${status}` });
        }
        
        db.query(
            'UPDATE Users SET status = ? WHERE user_id = ?',
            [status, id],
            (err, result) => {
                if (err) {
                    return res.status(500).json({ message: 'Database error', error: err.message });
                }
                if (result.affectedRows === 0) {
                    return res.status(404).json({ message: 'User not found' });
                }
                
                // Log with readable message
                db.query(
                    'INSERT INTO Logs (user_id, action, details) VALUES (?, "toggle_user_status", ?)',
                    [adminId, `${status === 'active' ? 'activated' : 'deactivated'} user "${userName}"`],
                    (logErr) => { if (logErr) console.error('Log error:', logErr.message); }
                );
                
                res.json({ message: `User ${status === 'active' ? 'activated' : 'deactivated'} successfully` });
            }
        );
    });
};

// RESET user password
export const resetUserPassword = (req, res) => {
    const { id } = req.params;
    const adminId = req.user.user_id;
    
    db.query('SELECT name FROM Users WHERE user_id = ?', [id], (err, userResult) => {
        if (err) {
            return res.status(500).json({ message: 'Database error', error: err.message });
        }
        if (userResult.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        const newPassword = generatePassword();
        const hashedPassword = bcrypt.hashSync(newPassword, 10);
        
        db.query(
            'UPDATE Users SET password = ? WHERE user_id = ?',
            [hashedPassword, id],
            (err, result) => {
                if (err) {
                    return res.status(500).json({ message: 'Database error', error: err.message });
                }
                
                // Use EXACT ENUM value: 'edit_user' (since no specific reset action in ENUM)
                db.query(
                    'INSERT INTO Logs (user_id, action) VALUES (?, "edit_user")',
                    [adminId],
                    (logErr) => { if (logErr) console.error('Log error:', logErr.message); }
                );
                
                res.json({ 
                    message: 'Password reset successfully',
                    temporary_password: newPassword
                });
            }
        );
    });
};

// GET own profile
export const getMyProfile = (req, res) => {
    const userId = req.user.user_id;
    
    db.query(
        `SELECT u.user_id, u.name, u.email, r.role_name, u.status, u.created_at 
         FROM Users u 
         JOIN Roles r ON u.role_id = r.role_id 
         WHERE u.user_id = ?`,
        [userId],
        (err, results) => {
            if (err) {
                return res.status(500).json({ message: 'Database error', error: err.message });
            }
            res.json(results[0]);
        }
    );
};

// UPDATE own profile (name, email only - no role/status)
export const updateMyProfile = (req, res) => {
    const userId = req.user.user_id;
    const { name, email } = req.body;
    
    if (!name && !email) {
        return res.status(400).json({ message: 'Nothing to update' });
    }
    
    // Validate email format if email is being updated
    if (email && !isValidEmail(email)) {
        return res.status(400).json({ message: 'Please enter a valid email address (e.g., user@example.com)' });
    }
    
    let updates = [];
    let values = [];
    
    if (name) {
        updates.push('name = ?');
        values.push(name);
    }
    if (email) {
        db.query('SELECT * FROM Users WHERE email = ? AND user_id != ?', [email, userId], (err, results) => {
            if (err) return res.status(500).json({ message: 'Database error' });
            if (results.length > 0) {
                return res.status(400).json({ message: 'Email already in use' });
            }
        });
        updates.push('email = ?');
        values.push(email);
    }
    
    values.push(userId);
    
    db.query(
        `UPDATE Users SET ${updates.join(', ')} WHERE user_id = ?`,
        values,
        (err) => {
            if (err) {
                return res.status(500).json({ message: 'Database error', error: err.message });
            }
            res.json({ message: 'Profile updated successfully' });
        }
    );
};

// CHANGE own password
// CHANGE own password (requires current password)
export const changeMyPassword = (req, res) => {
    const userId = req.user.user_id;
    const { current_password, new_password } = req.body;
    
    if (!current_password || !new_password) {
        return res.status(400).json({ message: 'Current password and new password are required' });
    }
    
    if (new_password.length < 6) {
        return res.status(400).json({ message: 'New password must be at least 6 characters' });
    }
    
    // Get current hashed password
    db.query('SELECT password FROM Users WHERE user_id = ?', [userId], (err, results) => {
        if (err) {
            return res.status(500).json({ message: 'Database error', error: err.message });
        }
        
        const validPassword = bcrypt.compareSync(current_password, results[0].password);
        if (!validPassword) {
            return res.status(401).json({ message: 'Current password is incorrect' });
        }
        
        const hashedNewPassword = bcrypt.hashSync(new_password, 10);
        
        db.query(
            'UPDATE Users SET password = ? WHERE user_id = ?',
            [hashedNewPassword, userId],
            (err) => {
                if (err) {
                    return res.status(500).json({ message: 'Database error', error: err.message });
                }
                
                // Log the password change
                db.query(
                    'INSERT INTO Logs (user_id, action, details) VALUES (?, "change_password", "changed their password")',
                    [userId],
                    (logErr) => { if (logErr) console.error('Failed to log password change:', logErr.message); }
                );
                
                res.json({ message: 'Password changed successfully' });
            }
        );
    });
};
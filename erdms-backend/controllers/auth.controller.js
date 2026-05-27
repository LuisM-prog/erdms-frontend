import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../db.js';
import env from '../config/db.config.js';

// REGISTER - creates a new user (default role: employees)
export const register = (req, res) => {
    const { name, email, password } = req.body;

    // Validate required fields
    if (!name || !email || !password) {
        return res.status(400).json({ message: 'Name, email, and password are required' });
    }

    // Check if email already exists
    db.query('SELECT * FROM Users WHERE email = ?', [email], (err, results) => {
        if (err) {
            return res.status(500).json({ message: 'Database error', error: err.message });
        }
        if (results.length > 0) {
            return res.status(400).json({ message: 'Email already exists' });
        }

        // Hash password
        const hashedPassword = bcrypt.hashSync(password, 10);

        // Get employees role_id (role_id = 2 from your SQL insert)
        db.query('SELECT role_id FROM Roles WHERE role_name = "employees"', (err, roleResults) => {
            if (err) {
                return res.status(500).json({ message: 'Database error', error: err.message });
            }
            
            const role_id = roleResults[0].role_id;
            
            // Insert new user
            db.query(
                'INSERT INTO Users (name, email, password, role_id, status) VALUES (?, ?, ?, ?, "active")',
                [name, email, hashedPassword, role_id],
                (err, result) => {
                    if (err) {
                        return res.status(500).json({ message: 'Failed to create user', error: err.message });
                    }
                    res.status(201).json({ 
                        message: 'User registered successfully',
                        user_id: result.insertId
                    });
                }
            );
        });
    });
};

// LOGIN - authenticates user and returns JWT token
export const login = (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required' });
    }

    // Get user with their role name
    db.query(
        `SELECT u.*, r.role_name 
         FROM Users u 
         JOIN Roles r ON u.role_id = r.role_id 
         WHERE u.email = ?`,
        [email],
        (err, results) => {
            if (err) {
                return res.status(500).json({ message: 'Database error', error: err.message });
            }
            if (results.length === 0) {
                return res.status(401).json({ message: 'Invalid email or password' });
            }

            const user = results[0];

            // Check if account is active
            if (user.status === 'inactive') {
                return res.status(401).json({ message: 'Account is deactivated. Contact admin.' });
            }

            // Verify password
            const validPassword = bcrypt.compareSync(password, user.password);
            if (!validPassword) {
                return res.status(401).json({ message: 'Invalid email or password' });
            }

            // Generate JWT token
            const token = jwt.sign(
                { 
                    user_id: user.user_id, 
                    name: user.name, 
                    email: user.email, 
                    role_id: user.role_id,
                    role_name: user.role_name
                },
                env.JWT_SECRET,
                { expiresIn: env.JWT_EXPIRES_IN }
            );

            // LOG THE LOGIN ACTION
            db.query(
                'INSERT INTO Logs (user_id, action) VALUES (?, "login")',
                [user.user_id]
            );

            res.json({
                message: 'Login successful',
                token,
                user: {
                    user_id: user.user_id,
                    name: user.name,
                    email: user.email,
                    role: user.role_name,
                    status: user.status
                }
            });
        }
    );
};

// LOGOUT - logs the logout action (frontend will delete the token)
export const logout = (req, res) => {
    const userId = req.user.user_id;
    
    // Log the logout action
    db.query(
        'INSERT INTO Logs (user_id, action) VALUES (?, "logout")',
        [userId],
        (err) => {
            if (err) {
                console.error('Failed to log logout:', err.message);
            }
        }
    );
    
    res.json({ message: 'Logout successful' });
};

// GET CURRENT USER - returns user info from token
export const getMe = (req, res) => {
    // req.user is set by authMiddleware
    res.json({
        user_id: req.user.user_id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role_name
    });
};
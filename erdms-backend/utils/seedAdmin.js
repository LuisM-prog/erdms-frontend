import bcrypt from 'bcryptjs';
import db from '../db.js';

export const seedAdmin = () => {
    // First check if roles exist
    db.query('SELECT COUNT(*) as count FROM Roles', (err, roleResult) => {
        if (err) {
            console.error('[Seed] Could not check roles:', err.message);
            return;
        }
        
        if (roleResult[0].count === 0) {
            console.log('[Seed] No roles found. Please run: INSERT INTO Roles (role_name) VALUES ("admin"), ("employees")');
            return;
        }
        
        // Check if any admin exists
        db.query('SELECT * FROM Users WHERE role_id = 1', (err, results) => {
            if (err) {
                console.error('[Seed] Could not check admin users:', err.message);
                return;
            }
            
            if (results.length === 0) {
                const hashedPassword = bcrypt.hashSync('Admin@123', 10);
                db.query(
                    'INSERT INTO Users (name, email, password, role_id, status) VALUES (?, ?, ?, 1, "active")',
                    ['System Administrator', 'admin@erdms.com', hashedPassword],
                    (err) => {
                        if (err) {
                            console.error('[Seed] Failed to create admin:', err.message);
                        } else {
                            console.log('[Seed] Admin account created successfully');
                            console.log('[Seed] Email: admin@erdms.com');
                            console.log('[Seed] Password: Admin@123');
                            console.log('[Seed] PLEASE CHANGE THIS PASSWORD AFTER FIRST LOGIN');
                        }
                    }
                );
            } else {
                console.log('[Seed] Admin account already exists, skipping...');
            }
        });
    });
};
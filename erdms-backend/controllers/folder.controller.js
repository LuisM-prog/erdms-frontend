import db from '../db.js';

// GET all folders
export const getAllFolders = (req, res) => {
    const query = `
        SELECT f.*, u.name as created_by_name 
        FROM Folders f
        LEFT JOIN Users u ON f.created_by = u.user_id
        ORDER BY f.folder_id
    `;
    
    db.query(query, (err, results) => {
        if (err) {
            return res.status(500).json({ message: 'Database error', error: err.message });
        }
        res.json(results);
    });
};

// GET single folder by ID
export const getFolderById = (req, res) => {
    const { id } = req.params;
    
    const query = `
        SELECT f.*, u.name as created_by_name 
        FROM Folders f
        LEFT JOIN Users u ON f.created_by = u.user_id
        WHERE f.folder_id = ?
    `;
    
    db.query(query, [id], (err, results) => {
        if (err) {
            return res.status(500).json({ message: 'Database error', error: err.message });
        }
        if (results.length === 0) {
            return res.status(404).json({ message: 'Folder not found' });
        }
        res.json(results[0]);
    });
};

// CREATE new folder
export const createFolder = (req, res) => {
    const { folder_name, permissions } = req.body;
    const created_by = req.user.user_id;
    
    if (!folder_name) {
        return res.status(400).json({ message: 'Folder name is required' });
    }
    
    db.query('SELECT * FROM Folders WHERE folder_name = ?', [folder_name], (err, results) => {
        if (err) {
            return res.status(500).json({ message: 'Database error', error: err.message });
        }
        if (results.length > 0) {
            return res.status(400).json({ message: 'Folder with this name already exists' });
        }
        
        const folderPermissions = permissions || 'public';
        
        db.query(
            'INSERT INTO Folders (folder_name, created_by, permissions) VALUES (?, ?, ?)',
            [folder_name, created_by, folderPermissions],
            (err, result) => {
                if (err) {
                    return res.status(500).json({ message: 'Failed to create folder', error: err.message });
                }
                
                // Log with ENUM value + details
                db.query(
                    'INSERT INTO Logs (user_id, action, details) VALUES (?, "create_folder", ?)',
                    [created_by, `Created folder: "${folder_name}"`],
                    (logErr) => { if (logErr) console.error('Log error:', logErr.message); }
                );
                
                res.status(201).json({
                    message: 'Folder created successfully',
                    folder_id: result.insertId,
                    folder_name,
                    permissions: folderPermissions,
                    created_by: req.user.name
                });
            }
        );
    });
};

// UPDATE folder
export const updateFolder = (req, res) => {
    const { id } = req.params;
    const { folder_name, permissions } = req.body;
    const userId = req.user.user_id;
    
    if (!folder_name && !permissions) {
        return res.status(400).json({ message: 'Nothing to update' });
    }
    
    // Get old folder data
    db.query('SELECT folder_name, permissions FROM Folders WHERE folder_id = ?', [id], (err, oldData) => {
        if (err) {
            return res.status(500).json({ message: 'Database error', error: err.message });
        }
        if (oldData.length === 0) {
            return res.status(404).json({ message: 'Folder not found' });
        }
        
        const oldFolder = oldData[0];
        let changes = [];
        let hasActualChange = false;
        
        if (folder_name && folder_name !== oldFolder.folder_name) {
            changes.push(`renamed from "${oldFolder.folder_name}" to "${folder_name}"`);
            hasActualChange = true;
        }
        if (permissions && permissions !== oldFolder.permissions) {
            changes.push(`changed permissions from ${oldFolder.permissions} to ${permissions}`);
            hasActualChange = true;
        }
        
        if (!hasActualChange) {
            return res.status(400).json({ message: 'No changes detected' });
        }
        
        let updates = [];
        let values = [];
        
        if (folder_name) {
            updates.push('folder_name = ?');
            values.push(folder_name);
        }
        if (permissions) {
            if (!['public', 'private', 'restricted'].includes(permissions)) {
                return res.status(400).json({ message: 'Permissions must be public, private, or restricted' });
            }
            updates.push('permissions = ?');
            values.push(permissions);
        }
        
        values.push(id);
        
        db.query(
            `UPDATE Folders SET ${updates.join(', ')} WHERE folder_id = ?`,
            values,
            (err) => {
                if (err) {
                    return res.status(500).json({ message: 'Database error', error: err.message });
                }
                
                // Log with readable message
                const changeText = changes.join(' and ');
                db.query(
                    'INSERT INTO Logs (user_id, action, details) VALUES (?, "edit_folder", ?)',
                    [userId, `${changeText}`],
                    (logErr) => { if (logErr) console.error('Log error:', logErr.message); }
                );
                
                res.json({ message: 'Folder updated successfully' });
            }
        );
    });
};

// DELETE folder
export const deleteFolder = (req, res) => {
    const { id } = req.params;
    const userId = req.user.user_id;
    
    db.query('SELECT folder_name FROM Folders WHERE folder_id = ?', [id], (err, folderResult) => {
        if (err) {
            return res.status(500).json({ message: 'Database error', error: err.message });
        }
        if (folderResult.length === 0) {
            return res.status(404).json({ message: 'Folder not found' });
        }
        
        const folderName = folderResult[0].folder_name;
        
        db.query('SELECT COUNT(*) as count FROM Documents WHERE folder_id = ?', [id], (err, countResults) => {
            const docCount = countResults[0].count;
            
            db.query('DELETE FROM Folders WHERE folder_id = ?', [id], (err) => {
                if (err) {
                    return res.status(500).json({ message: 'Failed to delete folder', error: err.message });
                }
                
                // Log with ENUM value + details
                db.query(
                    'INSERT INTO Logs (user_id, action, details) VALUES (?, "delete_folder", ?)',
                    [userId, `Deleted folder: "${folderName}" (contained ${docCount} documents)`],
                    (logErr) => { if (logErr) console.error('Log error:', logErr.message); }
                );
                
                res.json({ 
                    message: 'Folder deleted successfully',
                    documents_affected: docCount
                });
            });
        });
    });
};

// GET folders by user
export const getFoldersByUser = (req, res) => {
    const { userId } = req.params;
    
    const query = `
        SELECT f.*, u.name as created_by_name 
        FROM Folders f
        LEFT JOIN Users u ON f.created_by = u.user_id
        WHERE f.created_by = ?
        ORDER BY f.folder_id
    `;
    
    db.query(query, [userId], (err, results) => {
        if (err) {
            return res.status(500).json({ message: 'Database error', error: err.message });
        }
        res.json(results);
    });
};
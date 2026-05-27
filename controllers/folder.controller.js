import db from '../db.js';

// GET all folders (with creator name)
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
    
    // Check if folder name already exists
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

// UPDATE folder (rename or change permissions)
export const updateFolder = (req, res) => {
    const { id } = req.params;
    const { folder_name, permissions } = req.body;
    
    if (!folder_name && !permissions) {
        return res.status(400).json({ message: 'Nothing to update' });
    }
    
    // Check if folder exists
    db.query('SELECT * FROM Folders WHERE folder_id = ?', [id], (err, results) => {
        if (err) {
            return res.status(500).json({ message: 'Database error', error: err.message });
        }
        if (results.length === 0) {
            return res.status(404).json({ message: 'Folder not found' });
        }
        
        let updates = [];
        let values = [];
        
        if (folder_name) {
            // Check if new name already taken by another folder
            db.query('SELECT * FROM Folders WHERE folder_name = ? AND folder_id != ?', [folder_name, id], (err, nameResults) => {
                if (err) return;
                if (nameResults.length > 0) {
                    return res.status(400).json({ message: 'Folder name already exists' });
                }
            });
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
                res.json({ message: 'Folder updated successfully' });
            }
        );
    });
};

// DELETE folder (cascade deletes all documents inside)
export const deleteFolder = (req, res) => {
    const { id } = req.params;
    
    // Check if folder exists
    db.query('SELECT * FROM Folders WHERE folder_id = ?', [id], (err, results) => {
        if (err) {
            return res.status(500).json({ message: 'Database error', error: err.message });
        }
        if (results.length === 0) {
            return res.status(404).json({ message: 'Folder not found' });
        }
        
        // Get count of documents in folder (for response message)
        db.query('SELECT COUNT(*) as count FROM Documents WHERE folder_id = ?', [id], (err, countResults) => {
            const docCount = countResults[0].count;
            
            db.query('DELETE FROM Folders WHERE folder_id = ?', [id], (err) => {
                if (err) {
                    return res.status(500).json({ message: 'Failed to delete folder', error: err.message });
                }
                res.json({ 
                    message: 'Folder deleted successfully',
                    documents_affected: docCount
                });
            });
        });
    });
};

// GET folders created by specific user
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
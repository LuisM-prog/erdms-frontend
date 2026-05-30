import db from '../db.js';
import fs from 'fs';
import path from 'path';

// CHECK if user has access to document
const hasDocumentAccess = (user, document, callback) => {
    // Admin has access to everything
    if (user.role_name === 'admin') {
        return callback(null, true);
    }
    
    // Check folder permissions first
    db.query('SELECT permissions FROM Folders WHERE folder_id = ?', [document.folder_id], (err, folder) => {
        if (err) return callback(err);
        
        const folderPermission = folder[0].permissions;
        
        // Public folder - everyone can access
        if (folderPermission === 'public') {
            return callback(null, true);
        }
        
        // Private folder - only uploader and users with explicit permission
        if (folderPermission === 'private') {
            // Uploader has access
            if (document.uploaded_by === user.user_id) {
                return callback(null, true);
            }
            
            // Check document_permissions table
            db.query(
                'SELECT * FROM Document_permissions WHERE document_id = ? AND user_id = ?',
                [document.document_id, user.user_id],
                (err, permResults) => {
                    if (err) return callback(err);
                    if (permResults.length > 0) {
                        return callback(null, true);
                    }
                    return callback(null, false);
                }
            );
            return;
        }
        
        // Restricted folder - only users with explicit permission
        if (folderPermission === 'restricted') {
            db.query(
                'SELECT * FROM Document_permissions WHERE document_id = ? AND user_id = ?',
                [document.document_id, user.user_id],
                (err, permResults) => {
                    if (err) return callback(err);
                    if (permResults.length > 0) {
                        return callback(null, true);
                    }
                    return callback(null, false);
                }
            );
        }
    });
};

// DOWNLOAD document (with permission check)
export const downloadDocument = (req, res) => {
    const { id } = req.params;
    const userId = req.user.user_id;
    
    // Get document with folder info
    db.query(
        `SELECT d.*, f.permissions as folder_permissions, f.folder_name 
         FROM Documents d
         JOIN Folders f ON d.folder_id = f.folder_id
         WHERE d.document_id = ?`,
        [id],
        (err, results) => {
            if (err) {
                return res.status(500).json({ message: 'Database error', error: err.message });
            }
            if (results.length === 0) {
                return res.status(404).json({ message: 'Document not found' });
            }
            
            const document = results[0];
            
            // Check if file exists physically (fs is already imported)
            if (!fs.existsSync(document.file_path)) {
                return res.status(404).json({ message: 'File not found on server' });
            }
            
            // Check access permission
            hasDocumentAccess(req.user, document, (err, hasAccess) => {
                if (err) {
                    return res.status(500).json({ message: 'Error checking permissions', error: err.message });
                }
                
                if (!hasAccess) {
                    return res.status(403).json({ message: 'You do not have permission to download this document' });
                }
                
                // Log the download action 
                db.query(
                    'INSERT INTO Logs (user_id, action, document_id, details) VALUES (?, "download", ?, ?)',
                    [userId, id, `Downloaded "${document.title}"`],
                    (logErr) => { if (logErr) console.error('Log error:', logErr.message); }
                );
                
                // Set download headers
                const originalName = document.file_path.split('_').slice(2).join('_');
                res.setHeader('Content-Disposition', `attachment; filename="${originalName}"`);
                res.setHeader('Content-Type', document.file_type || 'application/octet-stream');
                
                // Stream the file to user
                const fileStream = fs.createReadStream(document.file_path);
                fileStream.pipe(res);
                
                fileStream.on('error', (error) => {
                    console.error('File stream error:', error);
                    res.status(500).json({ message: 'Error streaming file' });
                });
            });
        }
    );
};

// GET documents that user has access to (for dashboard/list view)
export const getAccessibleDocuments = (req, res) => {
    const userId = req.user.user_id;
    
    if (req.user.role_name === 'admin') {
        // Admin sees all documents
        const query = `
            SELECT d.*, f.folder_name, u.name as uploaded_by_name 
            FROM Documents d
            LEFT JOIN Folders f ON d.folder_id = f.folder_id
            LEFT JOIN Users u ON d.uploaded_by = u.user_id
            ORDER BY d.document_id DESC
        `;
        db.query(query, (err, results) => {
            if (err) {
                return res.status(500).json({ message: 'Database error', error: err.message });
            }
            res.json(results);
        });
    } else {
        // Regular user sees:
        // 1. Documents in public folders
        // 2. Documents they uploaded
        // 3. Documents they have explicit permission for
        const query = `
            SELECT DISTINCT d.*, f.folder_name, u.name as uploaded_by_name 
            FROM Documents d
            JOIN Folders f ON d.folder_id = f.folder_id
            LEFT JOIN Users u ON d.uploaded_by = u.user_id
            LEFT JOIN Document_permissions dp ON d.document_id = dp.document_id AND dp.user_id = ?
            WHERE 
                f.permissions = 'public'
                OR d.uploaded_by = ?
                OR dp.user_id IS NOT NULL
            ORDER BY d.document_id DESC
        `;
        
        db.query(query, [userId, userId], (err, results) => {
            if (err) {
                return res.status(500).json({ message: 'Database error', error: err.message });
            }
            res.json(results);
        });
    }
};

// GET all documents (with folder and uploader info)
export const getAllDocuments = (req, res) => {
    const query = `
        SELECT d.*, f.folder_name, u.name as uploaded_by_name 
        FROM Documents d
        LEFT JOIN Folders f ON d.folder_id = f.folder_id
        LEFT JOIN Users u ON d.uploaded_by = u.user_id
        ORDER BY d.document_id DESC
    `;
    
    db.query(query, (err, results) => {
        if (err) {
            return res.status(500).json({ message: 'Database error', error: err.message });
        }
        res.json(results);
    });
};

// GET documents by folder
export const getDocumentsByFolder = (req, res) => {
    const { folderId } = req.params;
    
    const query = `
        SELECT d.*, f.folder_name, u.name as uploaded_by_name 
        FROM Documents d
        LEFT JOIN Folders f ON d.folder_id = f.folder_id
        LEFT JOIN Users u ON d.uploaded_by = u.user_id
        WHERE d.folder_id = ?
        ORDER BY d.document_id DESC
    `;
    
    db.query(query, [folderId], (err, results) => {
        if (err) {
            return res.status(500).json({ message: 'Database error', error: err.message });
        }
        res.json(results);
    });
};

// GET single document by ID
export const getDocumentById = (req, res) => {
    const { id } = req.params;
    const userId = req.user.user_id;
    
    const query = `
        SELECT d.*, f.folder_name, f.permissions as folder_permissions, u.name as uploaded_by_name 
        FROM Documents d
        LEFT JOIN Folders f ON d.folder_id = f.folder_id
        LEFT JOIN Users u ON d.uploaded_by = u.user_id
        WHERE d.document_id = ?
    `;
    
    db.query(query, [id], (err, results) => {
        if (err) {
            return res.status(500).json({ message: 'Database error', error: err.message });
        }
        if (results.length === 0) {
            return res.status(404).json({ message: 'Document not found' });
        }
        
        // Log the view action
        db.query(
            'INSERT INTO Logs (user_id, action, document_id, details) VALUES (?, "view", ?, ?)',
            [userId, id, `Viewed document "${results[0].title}"`],
            (logErr) => { if (logErr) console.error('Failed to log view:', logErr.message); }
        );
        
        res.json(results[0]);
    });
};

// UPLOAD document
export const uploadDocument = (req, res) => {
    const { title, description, category, folder_id, accessibility } = req.body;
    const uploaded_by = req.user.user_id;
    
    if (!title || !folder_id) {
        // Delete uploaded file if validation fails
        if (req.file) {
            fs.unlinkSync(req.file.path);
        }
        return res.status(400).json({ message: 'Title and folder_id are required' });
    }
    
    if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
    }
    
    // Check if folder exists
    db.query('SELECT * FROM Folders WHERE folder_id = ?', [folder_id], (err, folderResults) => {
        if (err) {
            if (req.file) fs.unlinkSync(req.file.path);
            return res.status(500).json({ message: 'Database error', error: err.message });
        }
        if (folderResults.length === 0) {
            if (req.file) fs.unlinkSync(req.file.path);
            return res.status(404).json({ message: 'Folder not found' });
        }
        
        // Check if document with same name exists in this folder
        db.query(
            'SELECT * FROM Documents WHERE title = ? AND folder_id = ?',
            [title, folder_id],
            (err, docResults) => {
                if (err) {
                    if (req.file) fs.unlinkSync(req.file.path);
                    return res.status(500).json({ message: 'Database error', error: err.message });
                }
                if (docResults.length > 0) {
                    if (req.file) fs.unlinkSync(req.file.path);
                    return res.status(400).json({ message: 'Document with this title already exists in this folder' });
                }
                
                const filePath = req.file.path;
                const fileSize = req.file.size;
                const fileType = req.file.mimetype;
                const docAccessibility = accessibility || folderResults[0].permissions;
                
                db.query(
                    `INSERT INTO Documents 
                     (title, description, category, file_path, accessibility, folder_id, uploaded_by, file_size, file_type) 
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [title, description || null, category || null, filePath, docAccessibility, folder_id, uploaded_by, fileSize, fileType],
                    (err, result) => {
                        if (err) {
                            if (req.file) fs.unlinkSync(req.file.path);
                            return res.status(500).json({ message: 'Failed to upload document', error: err.message });
                        }
                        
                        // Log the upload action with folder info
                        const folderName = folderResults[0].folder_name;
                        db.query(
                            'INSERT INTO Logs (user_id, action, document_id, details) VALUES (?, "upload", ?, ?)',
                            [uploaded_by, result.insertId, `Uploaded "${title}" to folder "${folderResults[0].folder_name}"`],
                            (logErr) => { if (logErr) console.error('Log error:', logErr.message); }
                        );
                        
                        res.status(201).json({
                            message: 'Document uploaded successfully',
                            document_id: result.insertId,
                            file: {
                                original_name: req.file.originalname,
                                size: fileSize,
                                type: fileType,
                                path: filePath
                            }
                        });
                    }
                );
            }
        );
    });
};

// UPDATE document metadata
export const updateDocument = (req, res) => {
    const { id } = req.params;
    const { title, description, category, accessibility } = req.body;
    
    if (!title && !description && !category && !accessibility) {
        return res.status(400).json({ message: 'Nothing to update' });
    }
    
    // Get old document title first
    db.query('SELECT title FROM Documents WHERE document_id = ?', [id], (err, oldData) => {
        if (err) {
            return res.status(500).json({ message: 'Database error', error: err.message });
        }
        if (oldData.length === 0) {
            return res.status(404).json({ message: 'Document not found' });
        }
        
        const oldTitle = oldData[0].title;
        let changes = [];
        
        if (title && title !== oldTitle) {
            changes.push(`renamed from "${oldTitle}" to "${title}"`);
        }
        
        let updates = [];
        let values = [];
        
        if (title) {
            updates.push('title = ?');
            values.push(title);
        }
        if (description !== undefined) {
            updates.push('description = ?');
            values.push(description);
        }
        if (category !== undefined) {
            updates.push('category = ?');
            values.push(category);
        }
        if (accessibility) {
            if (!['public', 'private', 'restricted'].includes(accessibility)) {
                return res.status(400).json({ message: 'Accessibility must be public, private, or restricted' });
            }
            updates.push('accessibility = ?');
            values.push(accessibility);
        }
        
        values.push(id);
        
        db.query(
            `UPDATE Documents SET ${updates.join(', ')} WHERE document_id = ?`,
            values,
            (err) => {
                if (err) {
                    return res.status(500).json({ message: 'Database error', error: err.message });
                }
                
                const changeText = changes.length > 0 ? changes.join(', ') : 'updated document metadata';
                db.query(
                    'INSERT INTO Logs (user_id, action, document_id, details) VALUES (?, "edit", ?, ?)',
                    [req.user.user_id, id, changeText],
                    (logErr) => { if (logErr) console.error('Failed to log edit:', logErr.message); }
                );
                
                res.json({ message: 'Document updated successfully' });
            }
        );
    });
};

// DELETE document (Admin only)
export const deleteDocument = (req, res) => {
    const { id } = req.params;
    const userId = req.user.user_id;
    
    // First, get document info BEFORE deleting
    db.query('SELECT file_path, title, folder_id FROM Documents WHERE document_id = ?', [id], (err, results) => {
        if (err) {
            return res.status(500).json({ message: 'Database error', error: err.message });
        }
        if (results.length === 0) {
            return res.status(404).json({ message: 'Document not found' });
        }
        
        const filePath = results[0].file_path;
        const documentTitle = results[0].title;
        
        // FIRST: Insert the log BEFORE deleting the document
        db.query(
            'INSERT INTO Logs (user_id, action, document_id, details) VALUES (?, "delete", ?, ?)',
            [userId, id, `deleted document "${documentTitle}"`],
            (logErr) => {
                if (logErr) {
                    console.error('Failed to log delete:', logErr.message);
                }
                
                // NOW delete the document from database
                db.query('DELETE FROM Documents WHERE document_id = ?', [id], (err) => {
                    if (err) {
                        return res.status(500).json({ message: 'Failed to delete document', error: err.message });
                    }
                    
                    // Delete physical file if it exists
                    if (filePath && fs.existsSync(filePath)) {
                        fs.unlinkSync(filePath);
                    }
                    
                    res.json({ 
                        message: 'Document deleted successfully',
                        document_title: documentTitle
                    });
                });
            }
        );
    });
};

// SEARCH documents by title, description, category
export const searchDocuments = (req, res) => {
    const { q } = req.query;
    
    if (!q) {
        return res.status(400).json({ message: 'Search query is required' });
    }
    
    const searchTerm = `%${q}%`;
    
    const query = `
        SELECT d.*, f.folder_name, u.name as uploaded_by_name 
        FROM Documents d
        LEFT JOIN Folders f ON d.folder_id = f.folder_id
        LEFT JOIN Users u ON d.uploaded_by = u.user_id
        WHERE d.title LIKE ? 
           OR d.description LIKE ? 
           OR d.category LIKE ?
        ORDER BY d.document_id DESC
    `;
    
    db.query(query, [searchTerm, searchTerm, searchTerm], (err, results) => {
        if (err) {
            return res.status(500).json({ message: 'Database error', error: err.message });
        }
        res.json({
            query: q,
            count: results.length,
            results: results
        });
    });
};
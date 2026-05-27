
// Check if user has admin role
export const isAdmin = (req, res, next) => {
    if (req.user.role_name !== 'admin') {
        return res.status(403).json({ message: 'Access denied. Admin only.' });
    }
    next();
};

// Check if user has employee role
export const isEmployee = (req, res, next) => {
    if (req.user.role_name !== 'employees') {
        return res.status(403).json({ message: 'Access denied. Employees only.' });
    }
    next();
};
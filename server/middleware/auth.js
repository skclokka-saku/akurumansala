const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'akuru-mansala-super-secret-key-change-this-2026';

// ============================================
// AUTHENTICATE - Verify JWT token
// ============================================
function authenticate(req, res, next) {
    try {
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'ප්‍රවේශය අවශ්‍යයි' });
        }

        const token = authHeader.substring(7);
        const decoded = jwt.verify(token, JWT_SECRET);
        
        req.user = decoded;
        next();
    } catch (error) {
        console.error('Auth error:', error.message);
        return res.status(401).json({ error: 'වලංගු නොවන ටෝකනයක්' });
    }
}

// ============================================
// AUTHORIZE - Check user roles
// ============================================
function authorize(...allowedRoles) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'ප්‍රවේශය අවශ්‍යයි' });
        }

        // web_developer has access to everything
        if (req.user.role === 'web_developer') {
            return next();
        }

        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ 
                error: 'ඔබට මෙම ක්‍රියාව සිදු කිරීමට අවසර නැත'
            });
        }

        next();
    };
}

// ============================================
// IS DEVELOPER - Only web_developer role
// ============================================
function isDeveloper(req, res, next) {
    if (!req.user) {
        return res.status(401).json({ error: 'ප්‍රවේශය අවශ්‍යයි' });
    }

    if (req.user.role !== 'web_developer') {
        return res.status(403).json({ 
            error: 'මෙම ක්‍රියාව සිදු කළ හැක්කේ web developer හට පමණි'
        });
    }

    next();
}

// ============================================
// GENERATE TOKEN
// ============================================
function generateToken(user) {
    return jwt.sign(
        { 
            id: user.id, 
            email: user.email, 
            role: user.role,
            name: user.name
        },
        JWT_SECRET,
        { expiresIn: '7d' }
    );
}

module.exports = {
    authenticate,
    authorize,
    isDeveloper,
    generateToken,
    JWT_SECRET
};

const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'akuru-mansala-secret-key-2026';

function authenticate(req, res, next) {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'ප්‍රවේශ ටෝකනය අවශ්‍යයි' });
        }

        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'ටෝකනය කල් ඉකුත් වී ඇත' });
        }
        return res.status(401).json({ error: 'වලංගු නොවන ටෝකනය' });
    }
}

function authorize(...roles) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'පිවිසීම අවශ්‍යයි' });
        }
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ error: 'අවසර නැත' });
        }
        next();
    };
}

module.exports = { authenticate, authorize };
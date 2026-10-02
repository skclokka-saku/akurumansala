const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { dbGet, dbRun, dbAll } = require('../database');
const { authenticate, authorize, generateToken, isDeveloper } = require('../middleware/auth');

// ============================================
// HELPER: Log activity
// ============================================
async function logActivity(userId, userEmail, action, details, req, status = 'success') {
    try {
        const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
        const ua = req.headers['user-agent'] || 'unknown';
        await dbRun(
            'INSERT INTO activity_logs (user_id, user_email, action, details, ip_address, user_agent, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [userId, userEmail, action, details, ip, ua, status]
        );
    } catch (err) {
        console.error('Log error:', err);
    }
}

// ============================================
// POST /api/auth/login
// ============================================
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'විද්‍යුත් තැපෑල සහ මුරපදය අවශ්‍යයි' });
        }

        const user = await dbGet('SELECT * FROM users WHERE email = ?', [email]);

        if (!user) {
            await logActivity(null, email, 'login_failed', 'User not found', req, 'failed');
            return res.status(401).json({ error: 'විද්‍යුත් තැපෑල හෝ මුරපදය වැරදියි' });
        }

        // Only allow web_developer, admin, teacher to login
        const allowedRoles = ['web_developer', 'admin', 'teacher'];
        if (!allowedRoles.includes(user.role)) {
            await logActivity(user.id, email, 'login_failed', 'Role not allowed', req, 'failed');
            return res.status(403).json({ error: 'ඔබට මෙම පද්ධතියට පිවිසිය නොහැක' });
        }

        const isValidPassword = await bcrypt.compare(password, user.password);

        if (!isValidPassword) {
            await logActivity(user.id, email, 'login_failed', 'Wrong password', req, 'failed');
            return res.status(401).json({ error: 'විද්‍යුත් තැපෑල හෝ මුරපදය වැරදියි' });
        }

        const token = generateToken(user);

        await logActivity(user.id, email, 'login_success', `Role: ${user.role}`, req, 'success');

        res.json({
            message: 'සාර්ථකව පිවිසුණා',
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                school: user.school,
                phone: user.phone
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'දෝෂයක්' });
    }
});

// ============================================
// GET /api/auth/me
// ============================================
router.get('/me', authenticate, async (req, res) => {
    try {
        const user = await dbGet(
            'SELECT id, name, email, role, school, phone, created_at FROM users WHERE id = ?',
            [req.user.id]
        );

        if (!user) {
            return res.status(404).json({ error: 'පරිශීලක හමු නොවේ' });
        }

        res.json(user);
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ error: 'දෝෂයක්' });
    }
});

// ============================================
// GET /api/auth/users (Admin only)
// ============================================
router.get('/users', authenticate, authorize('admin'), async (req, res) => {
    try {
        const users = await dbAll(
            'SELECT id, name, email, role, school, phone, created_at FROM users ORDER BY created_at DESC'
        );
        res.json({ users });
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({ error: 'දෝෂයක්' });
    }
});

// ============================================
// GET /api/auth/logs (Developer only)
// ============================================
router.get('/logs', authenticate, isDeveloper, async (req, res) => {
    try {
        const { limit = 100, action, status } = req.query;
        
        let sql = 'SELECT * FROM activity_logs WHERE 1=1';
        const params = [];

        if (action) { sql += ' AND action = ?'; params.push(action); }
        if (status) { sql += ' AND status = ?'; params.push(status); }

        sql += ' ORDER BY created_at DESC LIMIT ?';
        params.push(parseInt(limit));

        const logs = await dbAll(sql, params);
        res.json({ logs, total: logs.length });
    } catch (error) {
        console.error('Get logs error:', error);
        res.status(500).json({ error: 'දෝෂයක්' });
    }
});

// ============================================
// DELETE /api/auth/logs/:id (Developer only)
// ============================================
router.delete('/logs/:id', authenticate, isDeveloper, async (req, res) => {
    try {
        await dbRun('DELETE FROM activity_logs WHERE id = ?', [req.params.id]);
        res.json({ message: 'සාර්ථකව මකා දමන ලදී' });
    } catch (error) {
        console.error('Delete log error:', error);
        res.status(500).json({ error: 'දෝෂයක්' });
    }
});

// ============================================
// DELETE /api/auth/logs (Developer only)
// ============================================
router.delete('/logs', authenticate, isDeveloper, async (req, res) => {
    try {
        await dbRun('DELETE FROM activity_logs');
        res.json({ message: 'සියලු logs මකා දමන ලදී' });
    } catch (error) {
        console.error('Clear logs error:', error);
        res.status(500).json({ error: 'දෝෂයක්' });
    }
});

module.exports = router;

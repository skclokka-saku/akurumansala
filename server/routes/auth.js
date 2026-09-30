const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { dbGet, dbRun } = require('../database');
const { authenticate, authorize } = require('../middleware/auth');

const JWT_SECRET = process.env.JWT_SECRET || 'akuru-mansala-secret-key-2026';

// POST /api/auth/register
// POST /api/auth/register
router.post('/register', async (req, res) => {
    try {
        const { name, email, password, role = 'teacher', phone, school } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ error: 'සියලුම අවශ්‍ය තොරතුරු ලබා දෙන්න' });
        }

        if (password.length < 6) {
            return res.status(400).json({ error: 'මුරපදය අවම වශයෙන් අක්ෂර 6ක් විය යුතුය' });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ error: 'වලංගු විද්‍යුත් තැපෑලක් ලබා දෙන්න' });
        }

        const existing = await dbGet('SELECT id FROM users WHERE email = ?', [email]);
        if (existing) {
            return res.status(400).json({ error: 'මෙම විද්‍යුත් තැපෑල දැනටමත් ලියාපදිංචි වී ඇත' });
        }

        // Force 'teacher' role for public registration
        const finalRole = 'teacher';

        const hashedPassword = await bcrypt.hash(password, 10);
        const result = await dbRun(
            `INSERT INTO users (name, email, password, role, phone, school) VALUES (?, ?, ?, ?, ?, ?)`,
            [name, email, hashedPassword, finalRole, phone || null, school || null]
        );

        try {
            await dbRun(
                `INSERT INTO activity_log (user_id, action, details) VALUES (?, ?, ?)`,
                [result.id, 'register', `New teacher registered: ${email}`]
            );
        } catch (e) {}

        const token = jwt.sign(
            { id: result.id, email, role: finalRole, name },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.status(201).json({
            message: 'සාර්ථකව ලියාපදිංචි විය',
            token,
            user: { id: result.id, name, email, role: finalRole }
        });
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ error: 'ලියාපදිංචි වීමේ දෝෂයක්' });
    }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'විද්‍යුත් තැපෑල සහ මුරපදය අවශ්‍යයි' });
        }

        const user = await dbGet('SELECT * FROM users WHERE email = ? AND is_active = 1', [email]);
        if (!user) {
            return res.status(401).json({ error: 'වැරදි විද්‍යුත් තැපෑල හෝ මුරපදය' });
        }

        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(401).json({ error: 'වැරදි විද්‍යුත් තැපෑල හෝ මුරපදය' });
        }

        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role, name: user.name },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        // Log activity
        await dbRun(
            `INSERT INTO activity_log (user_id, action, details, ip_address) VALUES (?, ?, ?, ?)`,
            [user.id, 'login', 'User logged in', req.ip]
        );

        res.json({
            message: 'සාර්ථකව පිවිසුණි',
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                school: user.school
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'පිවිසීමේ දෝෂයක්' });
    }
});

// GET /api/auth/me
router.get('/me', authenticate, async (req, res) => {
    try {
        const user = await dbGet(
            'SELECT id, name, email, role, phone, school, created_at FROM users WHERE id = ?',
            [req.user.id]
        );
        res.json({ user });
    } catch (error) {
        res.status(500).json({ error: 'දෝෂයක්' });
    }
});

// GET /api/auth/users (Admin only)
router.get('/users', authenticate, authorize('admin'), async (req, res) => {
    try {
        const users = await dbGet ? await require('../database').dbAll(
            'SELECT id, name, email, role, phone, school, is_active, created_at FROM users ORDER BY created_at DESC'
        ) : [];
        res.json({ users });
    } catch (error) {
        res.status(500).json({ error: 'දෝෂයක්' });
    }
});

module.exports = router;
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
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
// POST /api/auth/send-otp - Send OTP to phone
// ============================================
router.post('/send-otp', async (req, res) => {
    try {
        const { phone, purpose } = req.body;

        if (!phone) {
            return res.status(400).json({ error: 'දුරකථන අංකය අවශ්‍යයි' });
        }

        // Validate Sri Lankan phone number
        const cleaned = phone.replace(/\s+/g, '').replace(/\+94/, '0');
        const phoneRegex = /^0[1-9]\d{8}$/;
        if (!phoneRegex.test(cleaned)) {
            return res.status(400).json({ error: 'වලංගු ශ්‍රී ලංකා දුරකථන අංකයක් ඇතුළත් කරන්න (උදා: 0712345678)' });
        }

        // Generate 6-digit OTP
        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
        
        // Expires in 10 minutes
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

        // Save to database
        await dbRun(
            'INSERT INTO otp_codes (phone, code, purpose, expires_at) VALUES (?, ?, ?, ?)',
            [phone, otpCode, purpose || 'signup', expiresAt]
        );

        await logActivity(null, phone, 'otp_sent', `Purpose: ${purpose || 'signup'}`, req, 'success');

        console.log(`📱 OTP for ${phone}: ${otpCode}`);

        res.json({
            message: 'OTP යවන ලදී. SMS හරහා ලැබෙනු ඇත.',
            // ⚠️ For development only - remove in production
            dev_otp: otpCode,
            expires_in: 600
        });
    } catch (error) {
        console.error('Send OTP error:', error);
        res.status(500).json({ error: 'දෝෂයක්' });
    }
});

// ============================================
// POST /api/auth/verify-otp - Verify OTP
// ============================================
router.post('/verify-otp', async (req, res) => {
    try {
        const { phone, code } = req.body;

        if (!phone || !code) {
            return res.status(400).json({ error: 'දුරකථන අංකය සහ කේතය අවශ්‍යයි' });
        }

        const otp = await dbGet(
            `SELECT * FROM otp_codes 
             WHERE phone = ? AND code = ? AND used = 0 AND expires_at > datetime('now') 
             ORDER BY created_at DESC LIMIT 1`,
            [phone, code]
        );

        if (!otp) {
            await logActivity(null, phone, 'otp_verify_failed', 'Invalid or expired OTP', req, 'failed');
            return res.status(400).json({ error: 'වලංගු නොවන හෝ කල් ඉකුත් වූ කේතයක්' });
        }

        await dbRun('UPDATE otp_codes SET used = 1 WHERE id = ?', [otp.id]);

        await logActivity(null, phone, 'otp_verified', 'OTP verified successfully', req, 'success');

        res.json({ 
            message: 'දුරකථන අංකය සාර්ථකව තහවුරු කරන ලදී',
            verified: true
        });
    } catch (error) {
        console.error('Verify OTP error:', error);
        res.status(500).json({ error: 'දෝෂයක්' });
    }
});

// ============================================
// POST /api/auth/register - User Registration
// ============================================
router.post('/register', async (req, res) => {
    try {
        const { name, email, password, school, phone, otpCode } = req.body;

        if (!name || !email || !password || !phone) {
            return res.status(400).json({ error: 'සියලු තොරතුරු අවශ්‍යයි' });
        }

        // Check if user exists
        const existingUser = await dbGet('SELECT id FROM users WHERE email = ?', [email]);
        if (existingUser) {
            return res.status(400).json({ error: 'මෙම විද්‍යුත් තැපෑල දැනටමත් ලියාපදිංචි වී ඇත' });
        }

        // Check if phone exists
        const existingPhone = await dbGet('SELECT id FROM users WHERE phone = ?', [phone]);
        if (existingPhone) {
            return res.status(400).json({ error: 'මෙම දුරකථන අංකය දැනටමත් ලියාපදිංචි වී ඇත' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const result = await dbRun(
            'INSERT INTO users (name, email, password, role, school, phone) VALUES (?, ?, ?, ?, ?, ?)',
            [name, email, hashedPassword, 'teacher', school || null, phone]
        );

        const user = await dbGet('SELECT id, name, email, role, school, phone FROM users WHERE id = ?', [result.id]);
        const token = generateToken(user);

        await logActivity(user.id, email, 'register_success', `Role: teacher, Phone: ${phone}`, req, 'success');

        res.status(201).json({
            message: 'සාර්ථකව ලියාපදිංචි වුණා',
            token,
            user
        });
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ error: 'දෝෂයක්' });
    }
});

// ============================================
// POST /api/auth/forgot-password
// ============================================
router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ error: 'විද්‍යුත් තැපෑල අවශ්‍යයි' });
        }

        const user = await dbGet('SELECT id, email FROM users WHERE email = ?', [email]);

        if (!user) {
            await logActivity(null, email, 'forgot_password_failed', 'Email not found', req, 'failed');
            return res.json({ 
                message: 'ඔබගේ විද්‍යුත් තැපෑලට reset link එකක් යවා ඇත'
            });
        }

        const resetToken = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

        await dbRun(
            'INSERT INTO password_resets (email, token, expires_at) VALUES (?, ?, ?)',
            [email, resetToken, expiresAt]
        );

        await logActivity(user.id, email, 'password_reset_requested', 'Reset token generated', req, 'success');

        console.log(`📧 Password reset link for ${email}: /reset-password.html?token=${resetToken}`);

        res.json({
            message: 'ඔබගේ විද්‍යුත් තැපෑලට reset link එකක් යවා ඇත',
            dev_token: resetToken
        });
    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({ error: 'දෝෂයක්' });
    }
});

// ============================================
// POST /api/auth/reset-password
// ============================================
router.post('/reset-password', async (req, res) => {
    try {
        const { token, newPassword } = req.body;

        if (!token || !newPassword) {
            return res.status(400).json({ error: 'Token සහ අලුත් මුරපදය අවශ්‍යයි' });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ error: 'මුරපදය අවම 6 අක්ෂර විය යුතුය' });
        }

        const reset = await dbGet(
            `SELECT * FROM password_resets 
             WHERE token = ? AND used = 0 AND expires_at > datetime('now') 
             ORDER BY created_at DESC LIMIT 1`,
            [token]
        );

        if (!reset) {
            return res.status(400).json({ error: 'වලංගු නොවන හෝ කල් ඉකුත් වූ token එකක්' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await dbRun('UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE email = ?', [hashedPassword, reset.email]);
        await dbRun('UPDATE password_resets SET used = 1 WHERE id = ?', [reset.id]);

        await logActivity(null, reset.email, 'password_reset_success', 'Password changed', req, 'success');

        res.json({ message: 'මුරපදය සාර්ථකව වෙනස් කරන ලදී' });
    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ error: 'දෝෂයක්' });
    }
});

// ============================================
// GET /api/auth/me - Get current user
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
// GET /api/auth/users - List all users (Admin only)
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
// GET /api/auth/logs - Get activity logs (Developer only)
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
// DELETE /api/auth/logs/:id - Delete a log (Developer only)
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
// DELETE /api/auth/logs - Clear all logs (Developer only)
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

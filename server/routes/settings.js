const express = require('express');
const router = express.Router();
const { dbAll, dbGet, dbRun } = require('../database');
const { authenticate, authorize } = require('../middleware/auth');

// ============================================
// GET /api/settings - All settings (public)
// ============================================
router.get('/', async (req, res) => {
    try {
        const settings = await dbAll('SELECT setting_key, setting_value FROM settings');
        
        // Convert to object
        const settingsObj = {};
        settings.forEach(s => {
            settingsObj[s.setting_key] = s.setting_value;
        });
        
        res.json(settingsObj);
    } catch (error) {
        console.error('Get settings error:', error);
        res.status(500).json({ error: 'සැකසුම් ලබා ගැනීමේ දෝෂයක්' });
    }
});

// ============================================
// GET /api/settings/:key - Single setting
// ============================================
router.get('/:key', async (req, res) => {
    try {
        const setting = await dbGet(
            'SELECT setting_key, setting_value FROM settings WHERE setting_key = ?',
            [req.params.key]
        );
        
        if (!setting) {
            return res.status(404).json({ error: 'සැකසුම හමු නොවීය' });
        }
        
        res.json(setting);
    } catch (error) {
        res.status(500).json({ error: 'දෝෂයක්' });
    }
});

// ============================================
// POST /api/settings - Update or create (Admin only)
// ============================================
router.post('/', authenticate, authorize('admin'), async (req, res) => {
    try {
        const settings = req.body;
        
        if (!settings || typeof settings !== 'object') {
            return res.status(400).json({ error: 'වලංගු නොවන දත්ත' });
        }

        for (const [key, value] of Object.entries(settings)) {
            // Check if exists
            const existing = await dbGet(
                'SELECT id FROM settings WHERE setting_key = ?',
                [key]
            );
            
            if (existing) {
                await dbRun(
                    'UPDATE settings SET setting_value = ?, updated_at = CURRENT_TIMESTAMP WHERE setting_key = ?',
                    [value, key]
                );
            } else {
                await dbRun(
                    'INSERT INTO settings (setting_key, setting_value) VALUES (?, ?)',
                    [key, value]
                );
            }
        }

        // Log activity
        try {
            await dbRun(
                'INSERT INTO activity_log (user_id, action, details) VALUES (?, ?, ?)',
                [req.user.id, 'update_settings', 'Settings updated']
            );
        } catch (e) {}

        res.json({ message: 'සාර්ථකව යාවත්කාලීන කරන ලදී' });
    } catch (error) {
        console.error('Update settings error:', error);
        res.status(500).json({ error: 'සැකසුම් යාවත්කාලීන කිරීමේ දෝෂයක්' });
    }
});

// ============================================
// PUT /api/settings/:key - Update single (Admin only)
// ============================================
router.put('/:key', authenticate, authorize('admin'), async (req, res) => {
    try {
        const { value } = req.body;
        const key = req.params.key;
        
        if (value === undefined) {
            return res.status(400).json({ error: 'අගය ලබා දෙන්න' });
        }

        const existing = await dbGet(
            'SELECT id FROM settings WHERE setting_key = ?',
            [key]
        );
        
        if (existing) {
            await dbRun(
                'UPDATE settings SET setting_value = ?, updated_at = CURRENT_TIMESTAMP WHERE setting_key = ?',
                [value, key]
            );
        } else {
            await dbRun(
                'INSERT INTO settings (setting_key, setting_value) VALUES (?, ?)',
                [key, value]
            );
        }

        res.json({ 
            message: 'සාර්ථකව යාවත්කාලීන කරන ලදී',
            key,
            value
        });
    } catch (error) {
        res.status(500).json({ error: 'දෝෂයක්' });
    }
});

module.exports = router;
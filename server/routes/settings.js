const express = require('express');
const router = express.Router();
const { dbAll, dbGet, dbRun } = require('../database');
const { authenticate, authorize, isDeveloper } = require('../middleware/auth');

// ============================================
// GET /api/settings/public - Public settings (used by frontend)
// ============================================
const express = require('express');
const router = express.Router();
const { dbAll, dbGet, dbRun } = require('../database');
const { authenticate, authorize, isDeveloper } = require('../middleware/auth');

// ============================================
// GET /api/settings/public - Public settings (used by frontend)
// ============================================
router.get('/public', async (req, res) => {
    try {
        const publicKeys = [
            'site_name', 'site_name_en', 'site_tagline',
            'site_email', 'site_phone', 'site_address',
            'site_facebook', 'site_youtube', 'site_whatsapp',
            'site_instagram', 'site_twitter', 'site_linkedin',
            'hero_title_1', 'hero_title_2', 'hero_title_3',
            'hero_description'
        ];

        const settings = await dbAll(
            `SELECT setting_key, setting_value FROM settings WHERE setting_key IN (${publicKeys.map(() => '?').join(',')})`,
            publicKeys
        );

        const settingsObj = {};
        settings.forEach(s => {
            settingsObj[s.setting_key] = s.setting_value;
        });

        res.json(settingsObj);
    } catch (error) {
        console.error('Public settings fetch error:', error);
        res.status(500).json({ error: 'දෝෂයක්' });
    }
});

// ============================================
// GET /api/settings - Get all settings
// ============================================
router.get('/', async (req, res) => {
    try {
        const settings = await dbAll('SELECT setting_key, setting_value FROM settings');
        
        const settingsObj = {};
        settings.forEach(s => {
            settingsObj[s.setting_key] = s.setting_value;
        });

        res.json(settingsObj);
    } catch (error) {
        console.error('Settings fetch error:', error);
        res.status(500).json({ error: 'දෝෂයක්' });
    }
});

// ============================================
// POST /api/settings - Update settings (Developer only)
// ============================================
router.post('/', authenticate, isDeveloper, async (req, res) => {
    try {
        const settings = req.body;

        if (!settings || typeof settings !== 'object') {
            return res.status(400).json({ error: 'වලංගු නොවන දත්ත' });
        }

        for (const [key, value] of Object.entries(settings)) {
            const existing = await dbGet('SELECT id FROM settings WHERE setting_key = ?', [key]);
            
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

        console.log(`✅ Settings updated by ${req.user.email} (${req.user.role})`);

        res.json({ 
            message: 'සැකසුම් සාර්ථකව යාවත්කාලීන කරන ලදී',
            updated: Object.keys(settings).length
        });
    } catch (error) {
        console.error('Settings update error:', error);
        res.status(500).json({ error: 'දෝෂයක්' });
    }
});

// ============================================
// GET /api/settings/admin - Get settings for admin panel
// ============================================
router.get('/admin', authenticate, isDeveloper, async (req, res) => {
    try {
        const settings = await dbAll('SELECT setting_key, setting_value FROM settings');
        
        const settingsObj = {};
        settings.forEach(s => {
            settingsObj[s.setting_key] = s.setting_value;
        });

        res.json(settingsObj);
    } catch (error) {
        console.error('Admin settings fetch error:', error);
        res.status(500).json({ error: 'දෝෂයක්' });
    }
});

module.exports = router;
// ============================================
// GET /api/settings - Get all settings
// ============================================
router.get('/', async (req, res) => {
    try {
        const settings = await dbAll('SELECT setting_key, setting_value FROM settings');
        
        const settingsObj = {};
        settings.forEach(s => {
            settingsObj[s.setting_key] = s.setting_value;
        });

        res.json(settingsObj);
    } catch (error) {
        console.error('Settings fetch error:', error);
        res.status(500).json({ error: 'දෝෂයක්' });
    }
});

// ============================================
// POST /api/settings - Update settings (Developer only)
// ============================================
router.post('/', authenticate, isDeveloper, async (req, res) => {
    try {
        const settings = req.body;

        if (!settings || typeof settings !== 'object') {
            return res.status(400).json({ error: 'වලංගු නොවන දත්ත' });
        }

        for (const [key, value] of Object.entries(settings)) {
            const existing = await dbGet('SELECT id FROM settings WHERE setting_key = ?', [key]);
            
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

        console.log(`✅ Settings updated by ${req.user.email} (${req.user.role})`);

        res.json({ 
            message: 'සැකසුම් සාර්ථකව යාවත්කාලීන කරන ලදී',
            updated: Object.keys(settings).length
        });
    } catch (error) {
        console.error('Settings update error:', error);
        res.status(500).json({ error: 'දෝෂයක්' });
    }
});

// ============================================
// GET /api/settings/admin - Get settings for admin panel
// ============================================
router.get('/admin', authenticate, isDeveloper, async (req, res) => {
    try {
        const settings = await dbAll('SELECT setting_key, setting_value FROM settings');
        
        const settingsObj = {};
        settings.forEach(s => {
            settingsObj[s.setting_key] = s.setting_value;
        });

        res.json(settingsObj);
    } catch (error) {
        console.error('Admin settings fetch error:', error);
        res.status(500).json({ error: 'දෝෂයක්' });
    }
});

module.exports = router;

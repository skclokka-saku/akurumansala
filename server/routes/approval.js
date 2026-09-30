const express = require('express');
const router = express.Router();
const { dbAll, dbGet, dbRun } = require('../database');
const { authenticate, authorize } = require('../middleware/auth');

// ============================================
// GET /api/approval/pending - All pending items
// ============================================
router.get('/pending', authenticate, authorize('admin'), async (req, res) => {
    try {
        const pending = {
            lessons: await dbAll(`
                SELECT l.*, g.grade_name, s.subject_name, u.name as creator_name, u.email as creator_email
                FROM lessons l
                JOIN grades g ON l.grade_id = g.id
                JOIN subjects s ON l.subject_id = s.id
                LEFT JOIN users u ON l.created_by = u.id
                WHERE l.status = 'pending'
                ORDER BY l.created_at DESC
            `),
            papers: await dbAll(`
                SELECT p.*, g.grade_name, s.subject_name, u.name as creator_name, u.email as creator_email
                FROM papers p
                JOIN grades g ON p.grade_id = g.id
                JOIN subjects s ON p.subject_id = s.id
                LEFT JOIN users u ON p.created_by = u.id
                WHERE p.status = 'pending'
                ORDER BY p.created_at DESC
            `),
            videos: await dbAll(`
                SELECT v.*, g.grade_name, s.subject_name, u.name as creator_name, u.email as creator_email
                FROM videos v
                JOIN grades g ON v.grade_id = g.id
                JOIN subjects s ON v.subject_id = s.id
                LEFT JOIN users u ON v.created_by = u.id
                WHERE v.status = 'pending'
                ORDER BY v.created_at DESC
            `),
            articles: await dbAll(`
                SELECT a.*, u.name as creator_name, u.email as creator_email
                FROM articles a
                LEFT JOIN users u ON a.created_by = u.id
                WHERE a.status = 'pending'
                ORDER BY a.created_at DESC
            `)
        };

        const total = pending.lessons.length + pending.papers.length + 
                      pending.videos.length + pending.articles.length;

        res.json({ total, ...pending });
    } catch (error) {
        console.error('Get pending error:', error);
        res.status(500).json({ error: 'අනුමැතිය ලබා ගැනීමේ දෝෂයක්' });
    }
});

// ============================================
// GET /api/approval/count - Pending count only
// ============================================
router.get('/count', authenticate, authorize('admin', 'teacher'), async (req, res) => {
    try {
        const counts = await Promise.all([
            dbGet(`SELECT COUNT(*) as c FROM lessons WHERE status = 'pending'`),
            dbGet(`SELECT COUNT(*) as c FROM papers WHERE status = 'pending'`),
            dbGet(`SELECT COUNT(*) as c FROM videos WHERE status = 'pending'`),
            dbGet(`SELECT COUNT(*) as c FROM articles WHERE status = 'pending'`)
        ]);

        const total = counts.reduce((sum, c) => sum + (c?.c || 0), 0);
        
        res.json({
            total,
            lessons: counts[0]?.c || 0,
            papers: counts[1]?.c || 0,
            videos: counts[2]?.c || 0,
            articles: counts[3]?.c || 0
        });
    } catch (error) {
        res.status(500).json({ error: 'දෝෂයක්' });
    }
});

// ============================================
// POST /api/approval/approve/:type/:id
// ============================================
router.post('/approve/:type/:id', authenticate, authorize('admin'), async (req, res) => {
    try {
        const { type, id } = req.params;
        const tableMap = { 
            lesson: 'lessons', 
            paper: 'papers', 
            video: 'videos', 
            article: 'articles',
            note: 'notes'
        };
        const table = tableMap[type];
        
        if (!table) {
            return res.status(400).json({ error: 'වලංගු නොවන වර්ගය' });
        }

        await dbRun(`
            UPDATE ${table} 
            SET status = 'approved', 
                is_published = 1,
                approved_by = ?,
                approved_at = CURRENT_TIMESTAMP,
                rejection_reason = NULL
            WHERE id = ?
        `, [req.user.id, id]);

        try {
            await dbRun(`
                INSERT INTO activity_log (user_id, action, entity_type, entity_id, details)
                VALUES (?, ?, ?, ?, ?)
            `, [req.user.id, 'approve', type, id, `Approved ${type} #${id}`]);
        } catch (e) {}

        res.json({ 
            message: 'සාර්ථකව අනුමත කරන ලදී',
            status: 'approved'
        });
    } catch (error) {
        console.error('Approve error:', error);
        res.status(500).json({ error: 'අනුමත කිරීමේ දෝෂයක්' });
    }
});

// ============================================
// POST /api/approval/reject/:type/:id
// ============================================
router.post('/reject/:type/:id', authenticate, authorize('admin'), async (req, res) => {
    try {
        const { type, id } = req.params;
        const { reason } = req.body;
        
        const tableMap = { 
            lesson: 'lessons', 
            paper: 'papers', 
            video: 'videos', 
            article: 'articles',
            note: 'notes'
        };
        const table = tableMap[type];
        
        if (!table) {
            return res.status(400).json({ error: 'වලංගු නොවන වර්ගය' });
        }

        await dbRun(`
            UPDATE ${table} 
            SET status = 'rejected', 
                is_published = 0,
                rejection_reason = ?,
                approved_by = ?,
                approved_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `, [reason || 'No reason provided', req.user.id, id]);

        try {
            await dbRun(`
                INSERT INTO activity_log (user_id, action, entity_type, entity_id, details)
                VALUES (?, ?, ?, ?, ?)
            `, [req.user.id, 'reject', type, id, `Rejected ${type} #${id}: ${reason || 'No reason'}`]);
        } catch (e) {}

        res.json({ 
            message: 'සාර්ථකව ප්‍රතික්ෂේප කරන ලදී',
            status: 'rejected'
        });
    } catch (error) {
        console.error('Reject error:', error);
        res.status(500).json({ error: 'ප්‍රතික්ෂේප කිරීමේ දෝෂයක්' });
    }
});

// ============================================
// GET /api/approval/my-submissions
// ============================================
router.get('/my-submissions', authenticate, async (req, res) => {
    try {
        const userId = req.user.id;
        
        const submissions = {
            lessons: await dbAll(`
                SELECT l.*, g.grade_name, s.subject_name
                FROM lessons l
                JOIN grades g ON l.grade_id = g.id
                JOIN subjects s ON l.subject_id = s.id
                WHERE l.created_by = ?
                ORDER BY l.created_at DESC
            `, [userId]),
            papers: await dbAll(`
                SELECT p.*, g.grade_name, s.subject_name
                FROM papers p
                JOIN grades g ON p.grade_id = g.id
                JOIN subjects s ON p.subject_id = s.id
                WHERE p.created_by = ?
                ORDER BY p.created_at DESC
            `, [userId]),
            videos: await dbAll(`
                SELECT v.*, g.grade_name, s.subject_name
                FROM videos v
                JOIN grades g ON v.grade_id = g.id
                JOIN subjects s ON v.subject_id = s.id
                WHERE v.created_by = ?
                ORDER BY v.created_at DESC
            `, [userId]),
            articles: await dbAll(`
                SELECT a.* FROM articles a
                WHERE a.created_by = ?
                ORDER BY a.created_at DESC
            `, [userId])
        };

        res.json(submissions);
    } catch (error) {
        console.error('My submissions error:', error);
        res.status(500).json({ error: 'දෝෂයක්' });
    }
});

// ============================================
// GET /api/approval/stats
// ============================================
router.get('/stats', authenticate, authorize('admin'), async (req, res) => {
    try {
        const stats = {};
        const tables = ['lessons', 'papers', 'videos', 'articles'];
        
        for (const table of tables) {
            const pending = await dbGet(`SELECT COUNT(*) as c FROM ${table} WHERE status = 'pending'`);
            const approved = await dbGet(`SELECT COUNT(*) as c FROM ${table} WHERE status = 'approved'`);
            const rejected = await dbGet(`SELECT COUNT(*) as c FROM ${table} WHERE status = 'rejected'`);
            
            stats[table] = {
                pending: pending?.c || 0,
                approved: approved?.c || 0,
                rejected: rejected?.c || 0
            };
        }

        res.json(stats);
    } catch (error) {
        res.status(500).json({ error: 'දෝෂයක්' });
    }
});

module.exports = router;
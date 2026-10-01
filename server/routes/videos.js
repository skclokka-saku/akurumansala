const express = require('express');
const router = express.Router();
const { dbAll, dbGet, dbRun } = require('../database');
const { authenticate, authorize } = require('../middleware/auth');

// GET /api/videos
router.get('/', async (req, res) => {
    try {
        const { grade_id, subject_id, limit } = req.query;
        let sql = `
            SELECT v.*, g.grade_name, g.grade_number, s.subject_name, s.icon as subject_icon
            FROM videos v
            LEFT JOIN grades g ON v.grade_id = g.id
            LEFT JOIN subjects s ON v.subject_id = s.id
            WHERE v.is_published = 1
        `;
        const params = [];
        if (grade_id) { sql += ' AND v.grade_id = ?'; params.push(grade_id); }
        if (subject_id) { sql += ' AND v.subject_id = ?'; params.push(subject_id); }
        sql += ' ORDER BY v.created_at DESC';
        if (limit) { sql += ' LIMIT ?'; params.push(parseInt(limit)); }

        const videos = await dbAll(sql, params);
        res.json(videos);
    } catch (error) {
        console.error('Videos fetch error:', error);
        res.status(500).json({ error: 'දෝෂයක්' });
    }
});

// GET /api/videos/:id
router.get('/:id', async (req, res) => {
    try {
        const video = await dbGet(`
            SELECT v.*, g.grade_name, s.subject_name
            FROM videos v
            LEFT JOIN grades g ON v.grade_id = g.id
            LEFT JOIN subjects s ON v.subject_id = s.id
            WHERE v.id = ?
        `, [req.params.id]);
        if (!video) return res.status(404).json({ error: 'වීඩියෝව හමු නොවේ' });
        await dbRun('UPDATE videos SET views = views + 1 WHERE id = ?', [req.params.id]);
        res.json(video);
    } catch (error) {
        console.error('Video fetch error:', error);
        res.status(500).json({ error: 'දෝෂයක්' });
    }
});

module.exports = router;

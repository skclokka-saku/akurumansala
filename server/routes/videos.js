const express = require('express');
const router = express.Router();
const { dbAll, dbGet, dbRun } = require('../database');
const { authenticate, authorize } = require('../middleware/auth');

function extractYouTubeId(url) {
    if (!url) return null;
    const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
        /youtube\.com\/shorts\/([^&\n?#]+)/
    ];
    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) return match[1];
    }
    return null;
}

// GET /api/videos
router.get('/', async (req, res) => {
    try {
        const { grade_id, subject_id } = req.query;
        let sql = `
            SELECT v.*, g.grade_name, g.grade_number, s.subject_name, s.icon as subject_icon
            FROM videos v
            JOIN grades g ON v.grade_id = g.id
            JOIN subjects s ON v.subject_id = s.id
            WHERE v.is_published = 1
        `;
        const params = [];
        if (grade_id) { sql += ' AND v.grade_id = ?'; params.push(grade_id); }
        if (subject_id) { sql += ' AND v.subject_id = ?'; params.push(subject_id); }
        sql += ' ORDER BY v.created_at DESC';
        
        const videos = await dbAll(sql, params);
        res.json(videos);
    } catch (error) {
        res.status(500).json({ error: 'වීඩියෝ ලබා ගැනීමේ දෝෂයක්' });
    }
});

// GET /api/videos/:id
router.get('/:id', async (req, res) => {
    try {
        const video = await dbGet('SELECT * FROM videos WHERE id = ?', [req.params.id]);
        if (!video) return res.status(404).json({ error: 'වීඩියෝව හමු නොවීය' });
        await dbRun('UPDATE videos SET views = views + 1 WHERE id = ?', [req.params.id]);
        res.json(video);
    } catch (error) {
        res.status(500).json({ error: 'දෝෂයක්' });
    }
});

// POST /api/videos
router.post('/', authenticate, authorize('admin', 'teacher'), async (req, res) => {
    try {
        const { title, description, grade_id, subject_id, video_url, thumbnail, duration_minutes } = req.body;
        if (!title || !grade_id || !subject_id || !video_url) {
            return res.status(400).json({ error: 'අවශ්‍ය තොරතුරු ලබා දෙන්න' });
        }
        const youtube_id = extractYouTubeId(video_url);
        const result = await dbRun(
            `INSERT INTO videos (title, description, grade_id, subject_id, video_url, youtube_id, thumbnail, duration_minutes, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [title, description || null, grade_id, subject_id, video_url, youtube_id, thumbnail || (youtube_id ? `https://img.youtube.com/vi/${youtube_id}/maxresdefault.jpg` : null), duration_minutes || null, req.user.id]
        );
        res.status(201).json({ message: 'වීඩියෝව එකතු කරන ලදී', id: result.id });
    } catch (error) {
        res.status(500).json({ error: 'දෝෂයක්' });
    }
});

// PUT /api/videos/:id
router.put('/:id', authenticate, authorize('admin', 'teacher'), async (req, res) => {
    try {
        const fields = Object.keys(req.body).filter(k => !['id', 'created_at', 'created_by'].includes(k));
        if (req.body.video_url) {
            req.body.youtube_id = extractYouTubeId(req.body.video_url);
            if (req.body.youtube_id && !fields.includes('youtube_id')) fields.push('youtube_id');
        }
        const sql = `UPDATE videos SET ${fields.map(f => `${f} = ?`).join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
        await dbRun(sql, [...fields.map(f => req.body[f]), req.params.id]);
        res.json({ message: 'සාර්ථකව යාවත්කාලීන කරන ලදී' });
    } catch (error) {
        res.status(500).json({ error: 'දෝෂයක්' });
    }
});

// DELETE /api/videos/:id
router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
    try {
        await dbRun('DELETE FROM videos WHERE id = ?', [req.params.id]);
        res.json({ message: 'සාර්ථකව මකා දමන ලදී' });
    } catch (error) {
        res.status(500).json({ error: 'දෝෂයක්' });
    }
});

module.exports = router;
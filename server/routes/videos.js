const express = require('express');
const router = express.Router();
const { dbAll, dbGet, dbRun } = require('../database');
const { authenticate, authorize } = require('../middleware/auth');

// ============================================
// GET /api/videos - List all videos
// ============================================
router.get('/', async (req, res) => {
    try {
        const { grade_id, subject_id, limit } = req.query;
        let sql = `
            SELECT 
                v.*,
                g.grade_name,
                g.grade_number,
                s.subject_name,
                s.icon as subject_icon
            FROM videos v
            LEFT JOIN grades g ON v.grade_id = g.id
            LEFT JOIN subjects s ON v.subject_id = s.id
            WHERE v.is_published = 1
        `;
        const params = [];
        
        if (grade_id) { 
            sql += ' AND v.grade_id = ?'; 
            params.push(grade_id); 
        }
        if (subject_id) { 
            sql += ' AND v.subject_id = ?'; 
            params.push(subject_id); 
        }
        
        sql += ' ORDER BY v.created_at DESC';
        
        if (limit) { 
            sql += ' LIMIT ?'; 
            params.push(parseInt(limit)); 
        }

        const videos = await dbAll(sql, params);
        res.json(videos);
    } catch (error) {
        console.error('Videos fetch error:', error.message);
        res.status(500).json({ error: 'වීඩියෝ ලබා ගැනීමේ දෝෂයක්: ' + error.message });
    }
});

// ============================================
// GET /api/videos/:id - Get single video
// ============================================
router.get('/:id', async (req, res) => {
    try {
        const video = await dbGet(`
            SELECT 
                v.*,
                g.grade_name,
                s.subject_name
            FROM videos v
            LEFT JOIN grades g ON v.grade_id = g.id
            LEFT JOIN subjects s ON v.subject_id = s.id
            WHERE v.id = ?
        `, [req.params.id]);
        
        if (!video) return res.status(404).json({ error: 'වීඩියෝව හමු නොවීය' });
        
        await dbRun('UPDATE videos SET views = views + 1 WHERE id = ?', [req.params.id]);
        res.json(video);
    } catch (error) {
        console.error('Video fetch error:', error.message);
        res.status(500).json({ error: 'දෝෂයක්' });
    }
});

// ============================================
// POST /api/videos - Create video (Admin only)
// ============================================
router.post('/', authenticate, authorize('admin'), async (req, res) => {
    try {
        const { title, description, grade_id, subject_id, video_url } = req.body;

        console.log('📥 Received video data:', { title, description, grade_id, subject_id, video_url });

        if (!title) {
            return res.status(400).json({ error: 'ශීර්ෂය අවශ්‍යයි' });
        }

        if (!video_url) {
            return res.status(400).json({ error: 'YouTube URL එක අවශ්‍යයි' });
        }

        // Extract YouTube ID
        let youtubeId = null;
        const url = video_url.trim();
        
        let match = url.match(/youtu\.be\/([^"&?\/\s]{11})/);
        if (match) youtubeId = match[1];
        
        if (!youtubeId) {
            match = url.match(/[?&]v=([^"&?\/\s]{11})/);
            if (match) youtubeId = match[1];
        }
        
        if (!youtubeId) {
            match = url.match(/youtube\.com\/embed\/([^"&?\/\s]{11})/);
            if (match) youtubeId = match[1];
        }

        if (!youtubeId) {
            return res.status(400).json({ error: 'වලංගු YouTube URL එකක් ඇතුළත් කරන්න' });
        }

        console.log('✅ YouTube ID extracted:', youtubeId);

        const result = await dbRun(
            `INSERT INTO videos (title, description, grade_id, subject_id, video_url, youtube_id, is_published, created_by) 
             VALUES (?, ?, ?, ?, ?, ?, 1, ?)`,
            [
                title, 
                description || null, 
                grade_id || null, 
                subject_id || null, 
                video_url, 
                youtubeId, 
                req.user.id
            ]
        );

        console.log('✅ Video created. ID:', result.id);

        res.status(201).json({ 
            message: 'වීඩියෝව සාර්ථකව එකතු කරන ලදී', 
            id: result.id,
            youtube_id: youtubeId
        });
    } catch (error) {
        console.error('Video creation error:', error.message);
        res.status(500).json({ error: 'දෝෂයක්: ' + error.message });
    }
});

// ============================================
// PUT /api/videos/:id - Update video (Admin only)
// ============================================
router.put('/:id', authenticate, authorize('admin'), async (req, res) => {
    try {
        const fields = Object.keys(req.body).filter(k => !['id', 'created_at'].includes(k));
        const sql = `UPDATE videos SET ${fields.map(f => `${f} = ?`).join(', ')} WHERE id = ?`;
        await dbRun(sql, [...fields.map(f => req.body[f]), req.params.id]);
        res.json({ message: 'සාර්ථකව යාවත්කාලීන කරන ලදී' });
    } catch (error) {
        console.error('Video update error:', error.message);
        res.status(500).json({ error: 'දෝෂයක්' });
    }
});

// ============================================
// DELETE /api/videos/:id - Delete video (Admin only)
// ============================================
router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
    try {
        await dbRun('DELETE FROM videos WHERE id = ?', [req.params.id]);
        res.json({ message: 'සාර්ථකව මකා දමන ලදී' });
    } catch (error) {
        console.error('Video delete error:', error.message);
        res.status(500).json({ error: 'දෝෂයක්' });
    }
});

module.exports = router;

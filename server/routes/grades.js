const express = require('express');
const router = express.Router();
const { dbAll, dbGet, dbRun } = require('../database');
const { authenticate, authorize } = require('../middleware/auth');

// ============================================
// GET /api/grades - List all grades
// ============================================
router.get('/', async (req, res) => {
    try {
        const grades = await dbAll(`
            SELECT 
                g.*,
                (SELECT COUNT(*) FROM lessons WHERE grade_id = g.id AND is_published = 1) as lesson_count,
                (SELECT COUNT(*) FROM papers WHERE grade_id = g.id AND is_published = 1) as paper_count,
                (SELECT COUNT(*) FROM videos WHERE grade_id = g.id AND is_published = 1) as video_count
            FROM grades g
            ORDER BY g.grade_number ASC
        `);
        res.json(grades);
    } catch (error) {
        console.error('Grades fetch error:', error.message);
        res.status(500).json({ error: 'ශ්‍රේණි ලබා ගැනීමේ දෝෂයක්: ' + error.message });
    }
});

// ============================================
// GET /api/grades/:id - Get single grade
// ============================================
router.get('/:id', async (req, res) => {
    try {
        const grade = await dbGet('SELECT * FROM grades WHERE id = ?', [req.params.id]);
        if (!grade) return res.status(404).json({ error: 'ශ්‍රේණිය හමු නොවීය' });

        const subjects = await dbAll(`
            SELECT s.* FROM subjects s
            JOIN grade_subjects gs ON s.id = gs.subject_id
            WHERE gs.grade_id = ?
            ORDER BY s.subject_name
        `, [req.params.id]);

        res.json({ ...grade, subjects });
    } catch (error) {
        console.error('Grade fetch error:', error.message);
        res.status(500).json({ error: 'දෝෂයක්' });
    }
});

// ============================================
// GET /api/grades/:id/resources
// ============================================
router.get('/:id/resources', async (req, res) => {
    try {
        const gradeId = req.params.id;
        const lessons = await dbAll(`SELECT l.*, s.subject_name FROM lessons l LEFT JOIN subjects s ON l.subject_id = s.id WHERE l.grade_id = ? AND l.is_published = 1`, [gradeId]);
        const papers = await dbAll(`SELECT p.*, s.subject_name FROM papers p LEFT JOIN subjects s ON p.subject_id = s.id WHERE p.grade_id = ? AND p.is_published = 1`, [gradeId]);
        const videos = await dbAll(`SELECT v.*, s.subject_name FROM videos v LEFT JOIN subjects s ON v.subject_id = s.id WHERE v.grade_id = ? AND v.is_published = 1`, [gradeId]);
        res.json({ lessons, papers, videos });
    } catch (error) {
        console.error('Grade resources error:', error.message);
        res.status(500).json({ error: 'දෝෂයක්' });
    }
});

// ============================================
// POST /api/grades - Create grade (Admin only)
// ============================================
router.post('/', authenticate, authorize('admin'), async (req, res) => {
    try {
        const { grade_number, grade_name, grade_name_en, icon, color } = req.body;
        if (!grade_number || !grade_name) return res.status(400).json({ error: 'අවශ්‍ය තොරතුරු ලබා දෙන්න' });
        const result = await dbRun(
            `INSERT INTO grades (grade_number, grade_name, grade_name_en, icon, color) VALUES (?, ?, ?, ?, ?)`,
            [grade_number, grade_name, grade_name_en || null, icon || 'fa-graduation-cap', color || '#ec4899']
        );
        res.status(201).json({ message: 'ශ්‍රේණිය එකතු කරන ලදී', id: result.id });
    } catch (error) {
        console.error('Grade creation error:', error.message);
        res.status(500).json({ error: 'දෝෂයක්' });
    }
});

// ============================================
// PUT /api/grades/:id - Update grade (Admin only)
// ============================================
router.put('/:id', authenticate, authorize('admin'), async (req, res) => {
    try {
        const fields = Object.keys(req.body).filter(k => !['id', 'created_at'].includes(k));
        const sql = `UPDATE grades SET ${fields.map(f => `${f} = ?`).join(', ')} WHERE id = ?`;
        await dbRun(sql, [...fields.map(f => req.body[f]), req.params.id]);
        res.json({ message: 'සාර්ථකව යාවත්කාලීන කරන ලදී' });
    } catch (error) {
        console.error('Grade update error:', error.message);
        res.status(500).json({ error: 'දෝෂයක්' });
    }
});

// ============================================
// DELETE /api/grades/:id - Delete grade (Admin only)
// ============================================
router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
    try {
        await dbRun('DELETE FROM grades WHERE id = ?', [req.params.id]);
        res.json({ message: 'සාර්ථකව මකා දමන ලදී' });
    } catch (error) {
        console.error('Grade delete error:', error.message);
        res.status(500).json({ error: 'දෝෂයක්' });
    }
});

module.exports = router;

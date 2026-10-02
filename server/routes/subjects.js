const express = require('express');
const router = express.Router();
const { dbAll, dbGet, dbRun } = require('../database');
const { authenticate, authorize } = require('../middleware/auth');

// ============================================
// GET /api/subjects - List all subjects
// ============================================
router.get('/', async (req, res) => {
    try {
        const subjects = await dbAll(`
            SELECT 
                s.*,
                (SELECT COUNT(*) FROM lessons WHERE subject_id = s.id AND is_published = 1) as lesson_count,
                (SELECT COUNT(*) FROM papers WHERE subject_id = s.id AND is_published = 1) as paper_count,
                (SELECT COUNT(*) FROM videos WHERE subject_id = s.id AND is_published = 1) as video_count
            FROM subjects s
            ORDER BY s.id ASC
        `);
        res.json(subjects);
    } catch (error) {
        console.error('Subjects fetch error:', error.message);
        res.status(500).json({ error: 'විෂයයන් ලබා ගැනීමේ දෝෂයක්: ' + error.message });
    }
});

// ============================================
// GET /api/subjects/:id - Get single subject
// ============================================
router.get('/:id', async (req, res) => {
    try {
        const subject = await dbGet('SELECT * FROM subjects WHERE id = ?', [req.params.id]);
        if (!subject) return res.status(404).json({ error: 'විෂයය හමු නොවීය' });
        res.json(subject);
    } catch (error) {
        console.error('Subject fetch error:', error.message);
        res.status(500).json({ error: 'දෝෂයක්' });
    }
});

// ============================================
// POST /api/subjects - Create subject (Admin only)
// ============================================
router.post('/', authenticate, authorize('admin'), async (req, res) => {
    try {
        const { subject_name, subject_name_en, icon, color } = req.body;
        if (!subject_name) return res.status(400).json({ error: 'විෂය නම අවශ්‍යයි' });
        const result = await dbRun(
            `INSERT INTO subjects (subject_name, subject_name_en, icon, color) VALUES (?, ?, ?, ?)`,
            [subject_name, subject_name_en || null, icon || 'fa-book', color || '#3b82f6']
        );
        res.status(201).json({ message: 'විෂයය එකතු කරන ලදී', id: result.id });
    } catch (error) {
        console.error('Subject creation error:', error.message);
        res.status(500).json({ error: 'දෝෂයක්' });
    }
});

// ============================================
// PUT /api/subjects/:id - Update subject (Admin only)
// ============================================
router.put('/:id', authenticate, authorize('admin'), async (req, res) => {
    try {
        const fields = Object.keys(req.body).filter(k => !['id', 'created_at'].includes(k));
        const sql = `UPDATE subjects SET ${fields.map(f => `${f} = ?`).join(', ')} WHERE id = ?`;
        await dbRun(sql, [...fields.map(f => req.body[f]), req.params.id]);
        res.json({ message: 'සාර්ථකව යාවත්කාලීන කරන ලදී' });
    } catch (error) {
        console.error('Subject update error:', error.message);
        res.status(500).json({ error: 'දෝෂයක්' });
    }
});

// ============================================
// DELETE /api/subjects/:id - Delete subject (Admin only)
// ============================================
router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
    try {
        await dbRun('DELETE FROM subjects WHERE id = ?', [req.params.id]);
        res.json({ message: 'සාර්ථකව මකා දමන ලදී' });
    } catch (error) {
        console.error('Subject delete error:', error.message);
        res.status(500).json({ error: 'දෝෂයක්' });
    }
});

module.exports = router;

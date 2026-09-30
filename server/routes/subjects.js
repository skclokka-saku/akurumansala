const express = require('express');
const router = express.Router();
const { dbAll, dbGet, dbRun } = require('../database');
const { authenticate, authorize } = require('../middleware/auth');

// GET /api/subjects
router.get('/', async (req, res) => {
    try {
        const { grade_id } = req.query;
        let subjects;
        
        if (grade_id) {
            subjects = await dbAll(`
                SELECT s.* FROM subjects s
                JOIN grade_subjects gs ON s.id = gs.subject_id
                WHERE gs.grade_id = ? AND s.is_active = 1
                ORDER BY s.subject_name
            `, [grade_id]);
        } else {
            subjects = await dbAll('SELECT * FROM subjects WHERE is_active = 1 ORDER BY subject_name');
        }
        res.json(subjects);
    } catch (error) {
        res.status(500).json({ error: 'විෂයයන් ලබා ගැනීමේ දෝෂයක්' });
    }
});

// GET /api/subjects/:id
router.get('/:id', async (req, res) => {
    try {
        const subject = await dbGet('SELECT * FROM subjects WHERE id = ?', [req.params.id]);
        if (!subject) return res.status(404).json({ error: 'විෂයය හමු නොවීය' });
        res.json(subject);
    } catch (error) {
        res.status(500).json({ error: 'දෝෂයක්' });
    }
});

// POST /api/subjects (Admin)
router.post('/', authenticate, authorize('admin'), async (req, res) => {
    try {
        const { subject_name, subject_name_en, description, icon, color } = req.body;
        if (!subject_name) return res.status(400).json({ error: 'විෂය නම අවශ්‍යයි' });
        const result = await dbRun(
            `INSERT INTO subjects (subject_name, subject_name_en, description, icon, color) VALUES (?, ?, ?, ?, ?)`,
            [subject_name, subject_name_en || null, description || null, icon || 'fa-book', color || '#3b82f6']
        );
        res.status(201).json({ message: 'විෂයය එකතු කරන ලදී', id: result.id });
    } catch (error) {
        res.status(500).json({ error: 'දෝෂයක්' });
    }
});

// PUT /api/subjects/:id (Admin)
router.put('/:id', authenticate, authorize('admin'), async (req, res) => {
    try {
        const fields = Object.keys(req.body);
        const sql = `UPDATE subjects SET ${fields.map(f => `${f} = ?`).join(', ')} WHERE id = ?`;
        await dbRun(sql, [...fields.map(f => req.body[f]), req.params.id]);
        res.json({ message: 'සාර්ථකව යාවත්කාලීන කරන ලදී' });
    } catch (error) {
        res.status(500).json({ error: 'දෝෂයක්' });
    }
});

// DELETE /api/subjects/:id (Admin)
router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
    try {
        await dbRun('DELETE FROM subjects WHERE id = ?', [req.params.id]);
        res.json({ message: 'සාර්ථකව මකා දමන ලදී' });
    } catch (error) {
        res.status(500).json({ error: 'දෝෂයක්' });
    }
});

// POST /api/subjects/assign-to-grade (Admin)
router.post('/assign-to-grade', authenticate, authorize('admin'), async (req, res) => {
    try {
        const { grade_id, subject_ids } = req.body;
        if (!grade_id || !subject_ids || !Array.isArray(subject_ids)) {
            return res.status(400).json({ error: 'අවශ්‍ය තොරතුරු ලබා දෙන්න' });
        }
        // Remove existing
        await dbRun('DELETE FROM grade_subjects WHERE grade_id = ?', [grade_id]);
        // Add new
        for (const subjectId of subject_ids) {
            await dbRun('INSERT INTO grade_subjects (grade_id, subject_id) VALUES (?, ?)', [grade_id, subjectId]);
        }
        res.json({ message: 'සාර්ථකව පවරන ලදී' });
    } catch (error) {
        res.status(500).json({ error: 'දෝෂයක්' });
    }
});

module.exports = router;
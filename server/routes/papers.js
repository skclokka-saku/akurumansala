const express = require('express');
const router = express.Router();
const { dbAll, dbGet, dbRun } = require('../database');
const { authenticate, authorize } = require('../middleware/auth');

// GET /api/papers
router.get('/', async (req, res) => {
    try {
        const { grade_id, subject_id, paper_type, year } = req.query;
        let sql = `
            SELECT p.*, g.grade_name, g.grade_number, s.subject_name, s.icon as subject_icon
            FROM papers p
            JOIN grades g ON p.grade_id = g.id
            JOIN subjects s ON p.subject_id = s.id
            WHERE p.is_published = 1
        `;
        const params = [];
        if (grade_id) { sql += ' AND p.grade_id = ?'; params.push(grade_id); }
        if (subject_id) { sql += ' AND p.subject_id = ?'; params.push(subject_id); }
        if (paper_type) { sql += ' AND p.paper_type = ?'; params.push(paper_type); }
        if (year) { sql += ' AND p.year = ?'; params.push(year); }
        sql += ' ORDER BY p.created_at DESC';
        
        const papers = await dbAll(sql, params);
        res.json(papers);
    } catch (error) {
        console.error('Papers fetch error:', error);
        res.status(500).json({ error: 'ප්‍රශ්න පත්‍ර ලබා ගැනීමේ දෝෂයක්' });
    }
});

// GET /api/papers/:id
router.get('/:id', async (req, res) => {
    try {
        const paper = await dbGet(`
            SELECT p.*, g.grade_name, s.subject_name
            FROM papers p
            JOIN grades g ON p.grade_id = g.id
            JOIN subjects s ON p.subject_id = s.id
            WHERE p.id = ?
        `, [req.params.id]);
        if (!paper) return res.status(404).json({ error: 'ප්‍රශ්න පත්‍රය හමු නොවේ' });
        await dbRun('UPDATE papers SET views = views + 1 WHERE id = ?', [req.params.id]);
        res.json(paper);
    } catch (error) {
        console.error('Paper fetch error:', error);
        res.status(500).json({ error: 'දෝෂයක්' });
    }
});

// POST /api/papers (Admin/Teacher)
router.post('/', authenticate, authorize('admin', 'teacher'), async (req, res) => {
    try {
        const { title, description, grade_id, subject_id, paper_type, term, year, pdf_file, answer_pdf, total_marks, duration_minutes } = req.body;
        
        if (!title || !grade_id || !subject_id) {
            return res.status(400).json({ error: 'අවශ්‍ය තොරතුරු ලබා දෙන්න' });
        }

        let pdfUrl = null;
        if (pdf_file) {
            pdfUrl = typeof pdf_file === 'object' ? pdf_file.url : pdf_file;
        }

        let answerPdfUrl = null;
        if (answer_pdf) {
            answerPdfUrl = typeof answer_pdf === 'object' ? answer_pdf.url : answer_pdf;
        }

        const result = await dbRun(
            `INSERT INTO papers (title, description, grade_id, subject_id, paper_type, term, year, pdf_file, answer_pdf, total_marks, duration_minutes, created_by) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                title, 
                description || null, 
                grade_id, 
                subject_id, 
                paper_type || 'term', 
                term || null, 
                year || new Date().getFullYear(), 
                pdfUrl, 
                answerPdfUrl, 
                total_marks || null, 
                duration_minutes || null, 
                req.user.id
            ]
        );
        res.status(201).json({ message: 'ප්‍රශ්න පත්‍රය එකතු කරන ලදී', id: result.id });
    } catch (error) {
        console.error('Paper creation error:', error);
        res.status(500).json({ error: 'දෝෂයක්' });
    }
});

// PUT /api/papers/:id
router.put('/:id', authenticate, authorize('admin', 'teacher'), async (req, res) => {
    try {
        const fields = Object.keys(req.body).filter(k => !['id', 'created_at', 'created_by'].includes(k));
        const sql = `UPDATE papers SET ${fields.map(f => `${f} = ?`).join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
        await dbRun(sql, [...fields.map(f => req.body[f]), req.params.id]);
        res.json({ message: 'සාර්ථකව යාවත්කාලීන කරන ලදී' });
    } catch (error) {
        console.error('Paper update error:', error);
        res.status(500).json({ error: 'දෝෂයක්' });
    }
});

// DELETE /api/papers/:id (Admin)
router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
    try {
        await dbRun('DELETE FROM papers WHERE id = ?', [req.params.id]);
        res.json({ message: 'සාර්ථකව මකා දමන ලදී' });
    } catch (error) {
        console.error('Paper delete error:', error);
        res.status(500).json({ error: 'දෝෂයක්' });
    }
});

module.exports = router;

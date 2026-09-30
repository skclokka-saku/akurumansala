const express = require('express');
const router = express.Router();
const { dbAll, dbGet, dbRun } = require('../database');
const { authenticate, authorize } = require('../middleware/auth');

// GET /api/articles
router.get('/', async (req, res) => {
    try {
        const { category, search } = req.query;
        let sql = 'SELECT * FROM articles WHERE is_published = 1';
        const params = [];
        if (category) { sql += ' AND category = ?'; params.push(category); }
        if (search) { sql += ' AND (title LIKE ? OR content LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
        sql += ' ORDER BY created_at DESC';
        const articles = await dbAll(sql, params);
        res.json(articles);
    } catch (error) {
        res.status(500).json({ error: 'ලිපි ලබා ගැනීමේ දෝෂයක්' });
    }
});

// GET /api/articles/:id
router.get('/:id', async (req, res) => {
    try {
        const article = await dbGet('SELECT * FROM articles WHERE id = ?', [req.params.id]);
        if (!article) return res.status(404).json({ error: 'ලිපිය හමු නොවීය' });
        await dbRun('UPDATE articles SET views = views + 1 WHERE id = ?', [req.params.id]);
        res.json(article);
    } catch (error) {
        res.status(500).json({ error: 'දෝෂයක්' });
    }
});

// POST /api/articles
router.post('/', authenticate, authorize('admin', 'teacher'), async (req, res) => {
    try {
        const { title, description, content, category, tags, thumbnail, author } = req.body;
        if (!title || !content) return res.status(400).json({ error: 'ශීර්ෂය සහ අන්තර්ගතය අවශ්‍යයි' });
        const result = await dbRun(
            `INSERT INTO articles (title, description, content, category, tags, thumbnail, author, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [title, description || null, content, category || 'education', tags || null, thumbnail || null, author || req.user.name, req.user.id]
        );
        res.status(201).json({ message: 'ලිපිය එකතු කරන ලදී', id: result.id });
    } catch (error) {
        res.status(500).json({ error: 'දෝෂයක්' });
    }
});

// PUT /api/articles/:id
router.put('/:id', authenticate, authorize('admin', 'teacher'), async (req, res) => {
    try {
        const fields = Object.keys(req.body).filter(k => !['id', 'created_at', 'created_by'].includes(k));
        const sql = `UPDATE articles SET ${fields.map(f => `${f} = ?`).join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
        await dbRun(sql, [...fields.map(f => req.body[f]), req.params.id]);
        res.json({ message: 'සාර්ථකව යාවත්කාලීන කරන ලදී' });
    } catch (error) {
        res.status(500).json({ error: 'දෝෂයක්' });
    }
});

// DELETE /api/articles/:id
router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
    try {
        await dbRun('DELETE FROM articles WHERE id = ?', [req.params.id]);
        res.json({ message: 'සාර්ථකව මකා දමන ලදී' });
    } catch (error) {
        res.status(500).json({ error: 'දෝෂයක්' });
    }
});

module.exports = router;
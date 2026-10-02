const express = require('express');
const router = express.Router();
const { dbAll, dbGet, dbRun } = require('../database');
const { authenticate, authorize } = require('../middleware/auth');

// ============================================
// GET /api/articles - List all articles
// ============================================
router.get('/', async (req, res) => {
    try {
        const { category, limit } = req.query;
        let sql = `
            SELECT 
                a.*,
                (SELECT COUNT(*) FROM articles) as total_count
            FROM articles a
            WHERE a.is_published = 1
        `;
        const params = [];

        if (category) {
            sql += ' AND a.category = ?';
            params.push(category);
        }

        sql += ' ORDER BY a.created_at DESC';

        if (limit) {
            sql += ' LIMIT ?';
            params.push(parseInt(limit));
        }

        const articles = await dbAll(sql, params);
        res.json(articles);
    } catch (error) {
        console.error('Articles fetch error:', error.message);
        res.status(500).json({ error: 'ලිපි ලබා ගැනීමේ දෝෂයක්: ' + error.message });
    }
});

// ============================================
// GET /api/articles/:id - Get single article
// ============================================
router.get('/:id', async (req, res) => {
    try {
        const article = await dbGet('SELECT * FROM articles WHERE id = ?', [req.params.id]);
        if (!article) return res.status(404).json({ error: 'ලිපිය හමු නොවීය' });
        
        await dbRun('UPDATE articles SET views = views + 1 WHERE id = ?', [req.params.id]);
        res.json(article);
    } catch (error) {
        console.error('Article fetch error:', error.message);
        res.status(500).json({ error: 'දෝෂයක්' });
    }
});

// ============================================
// GET /api/articles/categories/all - Get all categories
// ============================================
router.get('/categories/all', async (req, res) => {
    try {
        const categories = await dbAll('SELECT DISTINCT category FROM articles WHERE category IS NOT NULL');
        res.json(categories.map(c => c.category));
    } catch (error) {
        console.error('Categories fetch error:', error.message);
        res.status(500).json({ error: 'දෝෂයක්' });
    }
});

// ============================================
// POST /api/articles - Create article (Admin only)
// ============================================
router.post('/', authenticate, authorize('admin'), async (req, res) => {
    try {
        const { title, description, content, category, author, image_url } = req.body;

        if (!title) {
            return res.status(400).json({ error: 'ශීර්ෂය අවශ්‍යයි' });
        }

        const result = await dbRun(
            `INSERT INTO articles (title, description, content, category, author, image_url, is_published, created_by) 
             VALUES (?, ?, ?, ?, ?, ?, 1, ?)`,
            [
                title, 
                description || null, 
                content || null, 
                category || 'අධ්‍යාපනය', 
                author || req.user.name, 
                image_url || null,
                req.user.id
            ]
        );

        res.status(201).json({ 
            message: 'ලිපිය සාර්ථකව එකතු කරන ලදී', 
            id: result.id 
        });
    } catch (error) {
        console.error('Article creation error:', error.message);
        res.status(500).json({ error: 'දෝෂයක්: ' + error.message });
    }
});

// ============================================
// PUT /api/articles/:id - Update article (Admin only)
// ============================================
router.put('/:id', authenticate, authorize('admin'), async (req, res) => {
    try {
        const fields = Object.keys(req.body).filter(k => !['id', 'created_at'].includes(k));
        const sql = `UPDATE articles SET ${fields.map(f => `${f} = ?`).join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
        await dbRun(sql, [...fields.map(f => req.body[f]), req.params.id]);
        res.json({ message: 'සාර්ථකව යාවත්කාලීන කරන ලදී' });
    } catch (error) {
        console.error('Article update error:', error.message);
        res.status(500).json({ error: 'දෝෂයක්' });
    }
});

// ============================================
// DELETE /api/articles/:id - Delete article (Admin only)
// ============================================
router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
    try {
        await dbRun('DELETE FROM articles WHERE id = ?', [req.params.id]);
        res.json({ message: 'සාර්ථකව මකා දමන ලදී' });
    } catch (error) {
        console.error('Article delete error:', error.message);
        res.status(500).json({ error: 'දෝෂයක්' });
    }
});

module.exports = router;

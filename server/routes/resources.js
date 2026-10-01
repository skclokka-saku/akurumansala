const express = require('express');
const router = express.Router();
const { dbAll, dbGet, dbRun } = require('../database');
const { authenticate, authorize } = require('../middleware/auth');

// ============================================
// GET /api/resources/stats - Dashboard Statistics
// ============================================
router.get('/stats', async (req, res) => {
    try {
        const lessons = await dbGet('SELECT COUNT(*) as count FROM lessons WHERE is_published = 1');
        const papers = await dbGet('SELECT COUNT(*) as count FROM papers WHERE is_published = 1');
        const videos = await dbGet('SELECT COUNT(*) as count FROM videos WHERE is_published = 1');
        const articles = await dbGet('SELECT COUNT(*) as count FROM articles WHERE is_published = 1');
        const grades = await dbGet('SELECT COUNT(*) as count FROM grades');
        const subjects = await dbGet('SELECT COUNT(*) as count FROM subjects');
        const users = await dbGet('SELECT COUNT(*) as count FROM users');

        res.json({
            total_lessons: lessons.count,
            total_papers: papers.count,
            total_videos: videos.count,
            total_articles: articles.count,
            total_grades: grades.count,
            total_subjects: subjects.count,
            total_users: users.count
        });
    } catch (error) {
        console.error('Stats error:', error);
        res.status(500).json({ error: 'දෝෂයක්' });
    }
});

// ============================================
// GET /api/resources?type=lesson&grade_id=1
// ============================================
router.get('/', async (req, res) => {
    try {
        const { type, grade_id, subject_id, limit } = req.query;
        const typeMap = { lesson: 'lessons', paper: 'papers', video: 'videos', article: 'articles' };

        if (!typeMap[type]) {
            return res.status(400).json({ error: 'වලංගු නොවන වර්ගයකි' });
        }

        const table = typeMap[type];

        // Articles have different structure
        if (type === 'article') {
            const articles = await dbAll('SELECT * FROM articles WHERE is_published = 1 ORDER BY created_at DESC');
            return res.json({ articles });
        }

        let sql = `
            SELECT t.*, g.grade_name, g.grade_number, s.subject_name, s.icon as subject_icon
            FROM ${table} t
            LEFT JOIN grades g ON t.grade_id = g.id
            LEFT JOIN subjects s ON t.subject_id = s.id
            WHERE t.is_published = 1
        `;
        const params = [];

        if (grade_id) { sql += ' AND t.grade_id = ?'; params.push(grade_id); }
        if (subject_id) { sql += ' AND t.subject_id = ?'; params.push(subject_id); }

        sql += ' ORDER BY t.created_at DESC';

        if (limit) {
            sql += ' LIMIT ?';
            params.push(parseInt(limit));
        }

        const items = await dbAll(sql, params);
        res.json({ [typeMap[type]]: items });
    } catch (error) {
        console.error('Resources fetch error:', error);
        res.status(500).json({ error: 'දෝෂයක්' });
    }
});

// ============================================
// GET /api/resources/lesson/:id - Single Lesson
// ============================================
router.get('/lesson/:id', async (req, res) => {
    try {
        const lesson = await dbGet(`
            SELECT t.*, g.grade_name, s.subject_name
            FROM lessons t
            LEFT JOIN grades g ON t.grade_id = g.id
            LEFT JOIN subjects s ON t.subject_id = s.id
            WHERE t.id = ?
        `, [req.params.id]);

        if (!lesson) return res.status(404).json({ error: 'පාඩම හමු නොවේ' });

        await dbRun('UPDATE lessons SET views = views + 1 WHERE id = ?', [req.params.id]);
        res.json(lesson);
    } catch (error) {
        console.error('Lesson fetch error:', error);
        res.status(500).json({ error: 'දෝෂයක්' });
    }
});

// ============================================
// POST /api/resources/:type - Create Resource (Admin only)
// ============================================
router.post('/:type', authenticate, authorize('admin'), async (req, res) => {
    try {
        const { type } = req.params;
        const typeMap = { lesson: 'lessons', paper: 'papers', video: 'videos', article: 'articles' };

        if (!typeMap[type]) {
            return res.status(400).json({ error: 'වලංගු නොවන වර්ගයකි' });
        }

        const { title, description, grade_id, subject_id, content, category, author, video_url, paper_type, year, pdf_file, answer_pdf } = req.body;

        if (!title) return res.status(400).json({ error: 'ශීර්ෂය අවශ්‍යයි' });

        let result;

        if (type === 'lesson') {
            result = await dbRun(
                `INSERT INTO lessons (title, description, grade_id, subject_id, is_published, created_by) 
                 VALUES (?, ?, ?, ?, 1, ?)`,
                [title, description || null, grade_id || null, subject_id || null, req.user.id]
            );
        } else if (type === 'paper') {
            result = await dbRun(
                `INSERT INTO papers (title, description, grade_id, subject_id, paper_type, year, pdf_file, answer_pdf, is_published, created_by) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
                [title, description || null, grade_id || null, subject_id || null, paper_type || 'term', year || new Date().getFullYear(), pdf_file || null, answer_pdf || null, req.user.id]
            );
        } else if (type === 'video') {
            result = await dbRun(
                `INSERT INTO videos (title, description, grade_id, subject_id, video_url, is_published, created_by) 
                 VALUES (?, ?, ?, ?, ?, 1, ?)`,
                [title, description || null, grade_id || null, subject_id || null, video_url || null, req.user.id]
            );
        } else if (type === 'article') {
            result = await dbRun(
                `INSERT INTO articles (title, description, content, category, author, is_published, created_by) 
                 VALUES (?, ?, ?, ?, ?, 1, ?)`,
                [title, description || null, content || null, category || 'අධ්‍යාපනය', author || req.user.name, req.user.id]
            );
        }

        res.status(201).json({ message: 'සාර්ථකව එකතු කරන ලදී', id: result.id });
    } catch (error) {
        console.error('Resource creation error:', error);
        res.status(500).json({ error: 'දෝෂයක්' });
    }
});

// ============================================
// DELETE /api/resources/:type/:id (Admin only)
// ============================================
router.delete('/:type/:id', authenticate, authorize('admin'), async (req, res) => {
    try {
        const { type, id } = req.params;
        const typeMap = { lesson: 'lessons', paper: 'papers', video: 'videos', article: 'articles' };

        if (!typeMap[type]) {
            return res.status(400).json({ error: 'වලංගු නොවන වර්ගයකි' });
        }

        await dbRun(`DELETE FROM ${typeMap[type]} WHERE id = ?`, [id]);
        res.json({ message: 'සාර්ථකව මකා දමන ලදී' });
    } catch (error) {
        console.error('Delete error:', error);
        res.status(500).json({ error: 'දෝෂයක්' });
    }
});

module.exports = router;

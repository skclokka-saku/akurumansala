const express = require('express');
const router = express.Router();
const { dbAll, dbGet, dbRun } = require('../database');
const { authenticate, authorize } = require('../middleware/auth');

// ============================================
// GET /api/resources - All resources with filters
// ============================================
router.get('/', async (req, res) => {
    try {
        const { type, grade_id, subject_id, search, limit = 50, offset = 0 } = req.query;

        let results = { lessons: [], notes: [], papers: [], videos: [], articles: [] };

        if (!type || type === 'lesson') {
            let sql = `
                SELECT l.*, g.grade_name, s.subject_name, g.grade_number, s.icon as subject_icon
                FROM lessons l
                JOIN grades g ON l.grade_id = g.id
                JOIN subjects s ON l.subject_id = s.id
                WHERE l.is_published = 1
            `;
            const params = [];
            if (grade_id) { sql += ' AND l.grade_id = ?'; params.push(grade_id); }
            if (subject_id) { sql += ' AND l.subject_id = ?'; params.push(subject_id); }
            if (search) { sql += ' AND (l.title LIKE ? OR l.description LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
            sql += ' ORDER BY l.created_at DESC LIMIT ? OFFSET ?';
            params.push(parseInt(limit), parseInt(offset));
            results.lessons = await dbAll(sql, params);
        }

        if (!type || type === 'paper') {
            let sql = `
                SELECT p.*, g.grade_name, s.subject_name, g.grade_number
                FROM papers p
                JOIN grades g ON p.grade_id = g.id
                JOIN subjects s ON p.subject_id = s.id
                WHERE p.is_published = 1
            `;
            const params = [];
            if (grade_id) { sql += ' AND p.grade_id = ?'; params.push(grade_id); }
            if (subject_id) { sql += ' AND p.subject_id = ?'; params.push(subject_id); }
            if (search) { sql += ' AND p.title LIKE ?'; params.push(`%${search}%`); }
            sql += ' ORDER BY p.created_at DESC LIMIT ? OFFSET ?';
            params.push(parseInt(limit), parseInt(offset));
            results.papers = await dbAll(sql, params);
        }

        if (!type || type === 'video') {
            let sql = `
                SELECT v.*, g.grade_name, s.subject_name, g.grade_number
                FROM videos v
                JOIN grades g ON v.grade_id = g.id
                JOIN subjects s ON v.subject_id = s.id
                WHERE v.is_published = 1
            `;
            const params = [];
            if (grade_id) { sql += ' AND v.grade_id = ?'; params.push(grade_id); }
            if (subject_id) { sql += ' AND v.subject_id = ?'; params.push(subject_id); }
            if (search) { sql += ' AND v.title LIKE ?'; params.push(`%${search}%`); }
            sql += ' ORDER BY v.created_at DESC LIMIT ? OFFSET ?';
            params.push(parseInt(limit), parseInt(offset));
            results.videos = await dbAll(sql, params);
        }

        if (!type || type === 'article') {
            let sql = 'SELECT * FROM articles WHERE is_published = 1';
            const params = [];
            if (search) { sql += ' AND (title LIKE ? OR content LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
            sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
            params.push(parseInt(limit), parseInt(offset));
            results.articles = await dbAll(sql, params);
        }

        res.json(results);
    } catch (error) {
        console.error('Get resources error:', error);
        res.status(500).json({ error: 'සම්පත් ලබා ගැනීමේ දෝෂයක්' });
    }
});

// ============================================
// GET /api/resources/stats
// ============================================
router.get('/stats', async (req, res) => {
    try {
        const stats = {
            total_lessons: (await dbGet('SELECT COUNT(*) as c FROM lessons WHERE is_published = 1'))?.c || 0,
            total_papers: (await dbGet('SELECT COUNT(*) as c FROM papers WHERE is_published = 1'))?.c || 0,
            total_videos: (await dbGet('SELECT COUNT(*) as c FROM videos WHERE is_published = 1'))?.c || 0,
            total_articles: (await dbGet('SELECT COUNT(*) as c FROM articles WHERE is_published = 1'))?.c || 0,
            total_grades: (await dbGet('SELECT COUNT(*) as c FROM grades WHERE is_active = 1'))?.c || 0,
            total_subjects: (await dbGet('SELECT COUNT(*) as c FROM subjects WHERE is_active = 1'))?.c || 0,
            total_users: (await dbGet('SELECT COUNT(*) as c FROM users'))?.c || 0,
        };
        res.json(stats);
    } catch (error) {
        res.status(500).json({ error: 'සංඛ්‍යා ලබා ගැනීමේ දෝෂයක්' });
    }
});

// ============================================
// GET /api/resources/:type/:id
// ============================================
router.get('/:type/:id', async (req, res) => {
    try {
        const { type, id } = req.params;
        const tableMap = { lesson: 'lessons', paper: 'papers', video: 'videos', article: 'articles', note: 'notes' };
        const table = tableMap[type];
        if (!table) return res.status(400).json({ error: 'වලංගු නොවන වර්ගය' });

        const item = await dbGet(`SELECT * FROM ${table} WHERE id = ?`, [id]);
        if (!item) return res.status(404).json({ error: 'සම්පත හමු නොවීය' });

        await dbRun(`UPDATE ${table} SET views = views + 1 WHERE id = ?`, [id]);
        res.json(item);
    } catch (error) {
        res.status(500).json({ error: 'දෝෂයක්' });
    }
});

// ============================================
// POST /api/resources/lesson
// ============================================
router.post('/lesson', authenticate, authorize('admin', 'teacher'), async (req, res) => {
    try {
        const { title, title_en, description, content, grade_id, subject_id, lesson_number, difficulty, pdf_file, video_url, thumbnail } = req.body;
        
        if (!title || !grade_id || !subject_id) {
            return res.status(400).json({ error: 'අවශ්‍ය තොරතුරු ලබා දෙන්න' });
        }

        const status = req.user.role === 'admin' ? 'approved' : 'pending';
        const isPublished = req.user.role === 'admin' ? 1 : 0;

        const result = await dbRun(
            `INSERT INTO lessons (title, title_en, description, content, grade_id, subject_id, lesson_number, difficulty, pdf_file, video_url, thumbnail, created_by, status, is_published) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                title, title_en || null, description || null, content || null, 
                grade_id, subject_id, lesson_number || null, difficulty || 'medium', 
                pdf_file || null, video_url || null, thumbnail || null, 
                req.user.id, status, isPublished
            ]
        );

        res.status(201).json({ 
            message: status === 'approved' ? 'පාඩම සාර්ථකව එකතු කරන ලදී' : 'පාඩම අනුමැතිය සඳහා යවන ලදී',
            id: result.id,
            status
        });
    } catch (error) {
        console.error('POST lesson error:', error);
        res.status(500).json({ error: 'පාඩම එකතු කිරීමේ දෝෂයක්' });
    }
});

// ============================================
// POST /api/resources/note
// ============================================
router.post('/note', authenticate, authorize('admin', 'teacher'), async (req, res) => {
    try {
        const { title, description, content, grade_id, subject_id, pdf_file, thumbnail } = req.body;
        
        if (!title || !grade_id || !subject_id) {
            return res.status(400).json({ error: 'අවශ්‍ය තොරතුරු ලබා දෙන්න' });
        }

        const status = req.user.role === 'admin' ? 'approved' : 'pending';
        const isPublished = req.user.role === 'admin' ? 1 : 0;

        const result = await dbRun(
            `INSERT INTO notes (title, description, content, grade_id, subject_id, pdf_file, thumbnail, created_by, status, is_published) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                title, description || null, content || null, grade_id, subject_id, 
                pdf_file || null, thumbnail || null, req.user.id, status, isPublished
            ]
        );

        res.status(201).json({ 
            message: status === 'approved' ? 'සටහන සාර්ථකව එකතු කරන ලදී' : 'සටහන අනුමැතිය සඳහා යවන ලදී',
            id: result.id,
            status
        });
    } catch (error) {
        console.error('POST note error:', error);
        res.status(500).json({ error: 'සටහන එකතු කිරීමේ දෝෂයක්' });
    }
});

// ============================================
// POST /api/resources/paper
// ============================================
router.post('/paper', authenticate, authorize('admin', 'teacher'), async (req, res) => {
    try {
        const { title, description, grade_id, subject_id, paper_type, term, year, pdf_file, answer_pdf, total_marks, duration_minutes } = req.body;
        
        if (!title || !grade_id || !subject_id) {
            return res.status(400).json({ error: 'අවශ්‍ය තොරතුරු ලබා දෙන්න' });
        }

        const status = req.user.role === 'admin' ? 'approved' : 'pending';
        const isPublished = req.user.role === 'admin' ? 1 : 0;

        const result = await dbRun(
            `INSERT INTO papers (title, description, grade_id, subject_id, paper_type, term, year, pdf_file, answer_pdf, total_marks, duration_minutes, created_by, status, is_published) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                title, description || null, grade_id, subject_id, 
                paper_type || 'term', term || null, year || new Date().getFullYear(), 
                pdf_file || null, answer_pdf || null, total_marks || null, 
                duration_minutes || null, req.user.id, status, isPublished
            ]
        );

        res.status(201).json({ 
            message: status === 'approved' ? 'ප්‍රශ්න පත්‍රය සාර්ථකව එකතු කරන ලදී' : 'ප්‍රශ්න පත්‍රය අනුමැතිය සඳහා යවන ලදී',
            id: result.id,
            status
        });
    } catch (error) {
        console.error('POST paper error:', error);
        res.status(500).json({ error: 'ප්‍රශ්න පත්‍රය එකතු කිරීමේ දෝෂයක්' });
    }
});

// ============================================
// POST /api/resources/video
// ============================================
router.post('/video', authenticate, authorize('admin', 'teacher'), async (req, res) => {
    try {
        const { title, description, grade_id, subject_id, video_url, thumbnail, duration_minutes } = req.body;
        
        if (!title || !grade_id || !subject_id || !video_url) {
            return res.status(400).json({ error: 'අවශ්‍ය තොරතුරු ලබා දෙන්න' });
        }

        const extractYouTubeId = (url) => {
            const patterns = [
                /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
                /youtube\.com\/shorts\/([^&\n?#]+)/
            ];
            for (const p of patterns) {
                const m = url.match(p);
                if (m) return m[1];
            }
            return null;
        };

        const youtube_id = extractYouTubeId(video_url);
        const status = req.user.role === 'admin' ? 'approved' : 'pending';
        const isPublished = req.user.role === 'admin' ? 1 : 0;

        const result = await dbRun(
            `INSERT INTO videos (title, description, grade_id, subject_id, video_url, youtube_id, thumbnail, duration_minutes, created_by, status, is_published) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                title, description || null, grade_id, subject_id, 
                video_url, youtube_id, 
                thumbnail || (youtube_id ? `https://img.youtube.com/vi/${youtube_id}/maxresdefault.jpg` : null),
                duration_minutes || null, req.user.id, status, isPublished
            ]
        );

        res.status(201).json({ 
            message: status === 'approved' ? 'වීඩියෝව සාර්ථකව එකතු කරන ලදී' : 'වීඩියෝව අනුමැතිය සඳහා යවන ලදී',
            id: result.id,
            status
        });
    } catch (error) {
        console.error('POST video error:', error);
        res.status(500).json({ error: 'වීඩියෝව එකතු කිරීමේ දෝෂයක්' });
    }
});

// ============================================
// POST /api/resources/article
// ============================================
router.post('/article', authenticate, authorize('admin', 'teacher'), async (req, res) => {
    try {
        const { title, description, content, category, tags, thumbnail, author } = req.body;
        
        if (!title || !content) {
            return res.status(400).json({ error: 'ශීර්ෂය සහ අන්තර්ගතය අවශ්‍යයි' });
        }

        const status = req.user.role === 'admin' ? 'approved' : 'pending';
        const isPublished = req.user.role === 'admin' ? 1 : 0;

        const result = await dbRun(
            `INSERT INTO articles (title, description, content, category, tags, thumbnail, author, created_by, status, is_published) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                title, description || null, content, 
                category || 'education', tags || null, thumbnail || null, 
                author || req.user.name, req.user.id, status, isPublished
            ]
        );

        res.status(201).json({ 
            message: status === 'approved' ? 'ලිපිය සාර්ථකව එකතු කරන ලදී' : 'ලිපිය අනුමැතිය සඳහා යවන ලදී',
            id: result.id,
            status
        });
    } catch (error) {
        console.error('POST article error:', error);
        res.status(500).json({ error: 'ලිපිය එකතු කිරීමේ දෝෂයක්' });
    }
});

// ============================================
// PUT /api/resources/:type/:id
// ============================================
router.put('/:type/:id', authenticate, authorize('admin', 'teacher'), async (req, res) => {
    try {
        const { type, id } = req.params;
        const tableMap = { lesson: 'lessons', paper: 'papers', video: 'videos', article: 'articles', note: 'notes' };
        const table = tableMap[type];
        if (!table) return res.status(400).json({ error: 'වලංගු නොවන වර්ගය' });

        const fields = Object.keys(req.body).filter(k => !['id', 'created_at', 'created_by'].includes(k));
        if (fields.length === 0) return res.status(400).json({ error: 'යාවත්කාලීන කිරීමට දත්ත නැත' });

        const sql = `UPDATE ${table} SET ${fields.map(f => `${f} = ?`).join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
        const params = [...fields.map(f => req.body[f]), id];

        await dbRun(sql, params);
        res.json({ message: 'සාර්ථකව යාවත්කාලීන කරන ලදී' });
    } catch (error) {
        res.status(500).json({ error: 'යාවත්කාලීන කිරීමේ දෝෂයක්' });
    }
});

// ============================================
// DELETE /api/resources/:type/:id
// ============================================
router.delete('/:type/:id', authenticate, authorize('admin'), async (req, res) => {
    try {
        const { type, id } = req.params;
        const tableMap = { lesson: 'lessons', paper: 'papers', video: 'videos', article: 'articles', note: 'notes' };
        const table = tableMap[type];
        if (!table) return res.status(400).json({ error: 'වලංගු නොවන වර්ගය' });

        await dbRun(`DELETE FROM ${table} WHERE id = ?`, [id]);
        res.json({ message: 'සාර්ථකව මකා දමන ලදී' });
    } catch (error) {
        res.status(500).json({ error: 'මකා දැමීමේ දෝෂයක්' });
    }
});

module.exports = router;
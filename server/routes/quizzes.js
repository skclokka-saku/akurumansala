const express = require('express');
const router = express.Router();
const { dbAll, dbGet, dbRun } = require('../database');
const { authenticate, authorize } = require('../middleware/auth');

// ============================================
// GET /api/quizzes - All quizzes (public)
// ============================================
router.get('/', async (req, res) => {
    try {
        const { grade_id, subject_id, limit = 50 } = req.query;
        
        let sql = `
            SELECT q.*, g.grade_name, s.subject_name,
                   (SELECT COUNT(*) FROM quiz_questions WHERE quiz_id = q.id) as question_count
            FROM quizzes q
            JOIN grades g ON q.grade_id = g.id
            JOIN subjects s ON q.subject_id = s.id
            WHERE q.is_published = 1
        `;
        const params = [];
        
        if (grade_id) { sql += ' AND q.grade_id = ?'; params.push(grade_id); }
        if (subject_id) { sql += ' AND q.subject_id = ?'; params.push(subject_id); }
        
        sql += ' ORDER BY q.created_at DESC LIMIT ?';
        params.push(parseInt(limit));
        
        const quizzes = await dbAll(sql, params);
        res.json(quizzes);
    } catch (error) {
        console.error('Get quizzes error:', error);
        res.status(500).json({ error: 'ප්‍රශ්නාවලි ලබා ගැනීමේ දෝෂයක්' });
    }
});

// ============================================
// GET /api/quizzes/:id - Single quiz with questions
// ============================================
router.get('/:id', async (req, res) => {
    try {
        const quiz = await dbGet(`
            SELECT q.*, g.grade_name, s.subject_name
            FROM quizzes q
            JOIN grades g ON q.grade_id = g.id
            JOIN subjects s ON q.subject_id = s.id
            WHERE q.id = ?
        `, [req.params.id]);
        
        if (!quiz) {
            return res.status(404).json({ error: 'ප්‍රශ්නාවලිය හමු නොවීය' });
        }
        
        const questions = await dbAll(
            'SELECT * FROM quiz_questions WHERE quiz_id = ? ORDER BY question_order ASC',
            [req.params.id]
        );
        
        res.json({ ...quiz, questions });
    } catch (error) {
        console.error('Get quiz error:', error);
        res.status(500).json({ error: 'දෝෂයක්' });
    }
});

// ============================================
// POST /api/quizzes - Create quiz (Admin/Teacher)
// ============================================
router.post('/', authenticate, authorize('admin', 'teacher'), async (req, res) => {
    try {
        const { title, description, grade_id, subject_id, duration_minutes, questions } = req.body;
        
        if (!title || !grade_id || !subject_id) {
            return res.status(400).json({ error: 'අවශ්‍ය තොරතුරු ලබා දෙන්න' });
        }
        
        const status = req.user.role === 'admin' ? 'approved' : 'pending';
        const isPublished = req.user.role === 'admin' ? 1 : 0;
        
        const questionCount = questions ? questions.length : 0;
        
        const result = await dbRun(
            `INSERT INTO quizzes (title, description, grade_id, subject_id, duration_minutes, total_questions, is_published, created_by) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [title, description || null, grade_id, subject_id, duration_minutes || 30, questionCount, isPublished, req.user.id]
        );
        
        const quizId = result.id;
        
        // Insert questions
        if (questions && questions.length > 0) {
            for (let i = 0; i < questions.length; i++) {
                const q = questions[i];
                await dbRun(
                    `INSERT INTO quiz_questions (quiz_id, question, option_a, option_b, option_c, option_d, correct_answer, explanation, question_order) 
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        quizId, 
                        q.question, 
                        q.option_a, 
                        q.option_b, 
                        q.option_c, 
                        q.option_d, 
                        q.correct_answer,
                        q.explanation || null,
                        i + 1
                    ]
                );
            }
        }
        
        res.status(201).json({ 
            message: status === 'approved' ? 'ප්‍රශ්නාවලිය සාර්ථකව එකතු කරන ලදී' : 'ප්‍රශ්නාවලිය අනුමැතිය සඳහා යවන ලදී',
            id: quizId,
            status,
            question_count: questionCount
        });
    } catch (error) {
        console.error('Create quiz error:', error);
        res.status(500).json({ error: 'ප්‍රශ්නාවලිය සෑදීමේ දෝෂයක්' });
    }
});

// ============================================
// PUT /api/quizzes/:id - Update quiz (Admin/Teacher)
// ============================================
router.put('/:id', authenticate, authorize('admin', 'teacher'), async (req, res) => {
    try {
        const { title, description, grade_id, subject_id, duration_minutes, questions, is_published } = req.body;
        const quizId = req.params.id;
        
        await dbRun(
            `UPDATE quizzes SET title = ?, description = ?, grade_id = ?, subject_id = ?, duration_minutes = ?, is_published = ? WHERE id = ?`,
            [title, description || null, grade_id, subject_id, duration_minutes || 30, is_published !== undefined ? is_published : 1, quizId]
        );
        
        // Delete existing questions and re-insert
        if (questions) {
            await dbRun('DELETE FROM quiz_questions WHERE quiz_id = ?', [quizId]);
            
            for (let i = 0; i < questions.length; i++) {
                const q = questions[i];
                await dbRun(
                    `INSERT INTO quiz_questions (quiz_id, question, option_a, option_b, option_c, option_d, correct_answer, explanation, question_order) 
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [quizId, q.question, q.option_a, q.option_b, q.option_c, q.option_d, q.correct_answer, q.explanation || null, i + 1]
                );
            }
            
            await dbRun('UPDATE quizzes SET total_questions = ? WHERE id = ?', [questions.length, quizId]);
        }
        
        res.json({ message: 'සාර්ථකව යාවත්කාලීන කරන ලදී' });
    } catch (error) {
        console.error('Update quiz error:', error);
        res.status(500).json({ error: 'දෝෂයක්' });
    }
});

// ============================================
// DELETE /api/quizzes/:id - Delete quiz (Admin)
// ============================================
router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
    try {
        await dbRun('DELETE FROM quiz_questions WHERE quiz_id = ?', [req.params.id]);
        await dbRun('DELETE FROM quiz_attempts WHERE quiz_id = ?', [req.params.id]);
        await dbRun('DELETE FROM quizzes WHERE id = ?', [req.params.id]);
        res.json({ message: 'සාර්ථකව මකා දමන ලදී' });
    } catch (error) {
        res.status(500).json({ error: 'දෝෂයක්' });
    }
});

// ============================================
// POST /api/quizzes/:id/submit - Submit quiz answers
// ============================================
router.post('/:id/submit', async (req, res) => {
    try {
        const { user_name, answers } = req.body;
        const quizId = req.params.id;
        
        if (!answers || typeof answers !== 'object') {
            return res.status(400).json({ error: 'පිළිතුරු ලබා දෙන්න' });
        }
        
        const questions = await dbAll('SELECT * FROM quiz_questions WHERE quiz_id = ?', [quizId]);
        
        let score = 0;
        let totalMarks = 0;
        
        questions.forEach(q => {
            totalMarks += q.marks || 1;
            const userAnswer = answers[q.id];
            if (userAnswer && userAnswer.toUpperCase() === q.correct_answer.toUpperCase()) {
                score += q.marks || 1;
            }
        });
        
        const percentage = totalMarks > 0 ? (score / totalMarks) * 100 : 0;
        
        const result = await dbRun(
            `INSERT INTO quiz_attempts (quiz_id, user_name, score, total_marks, percentage, answers) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [quizId, user_name || 'Anonymous', score, totalMarks, percentage, JSON.stringify(answers)]
        );
        
        // Get correct answers for review
        const review = questions.map(q => ({
            id: q.id,
            question: q.question,
            correct_answer: q.correct_answer,
            user_answer: answers[q.id] || null,
            is_correct: answers[q.id] === q.correct_answer,
            explanation: q.explanation
        }));
        
        res.json({
            message: 'සාර්ථකව ඉදිරිපත් කරන ලදී',
            attempt_id: result.id,
            score,
            total_marks: totalMarks,
            percentage: Math.round(percentage),
            review
        });
    } catch (error) {
        console.error('Submit quiz error:', error);
        res.status(500).json({ error: 'දෝෂයක්' });
    }
});

// ============================================
// GET /api/quizzes/:id/attempts - Get attempts (Admin)
// ============================================
router.get('/:id/attempts', authenticate, authorize('admin', 'teacher'), async (req, res) => {
    try {
        const attempts = await dbAll(
            'SELECT * FROM quiz_attempts WHERE quiz_id = ? ORDER BY completed_at DESC LIMIT 100',
            [req.params.id]
        );
        res.json(attempts);
    } catch (error) {
        res.status(500).json({ error: 'දෝෂයක්' });
    }
});

module.exports = router;
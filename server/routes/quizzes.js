const express = require('express');
const router = express.Router();
const { dbAll, dbGet, dbRun } = require('../database');
const { authenticate, authorize } = require('../middleware/auth');

// ============================================
// GET /api/quizzes - List all quizzes
// ============================================
router.get('/', async (req, res) => {
    try {
        const { grade_id, subject_id } = req.query;
        let sql = `
            SELECT q.*, g.grade_name, s.subject_name,
                (SELECT COUNT(*) FROM quiz_questions WHERE quiz_id = q.id) as question_count
            FROM quizzes q
            LEFT JOIN grades g ON q.grade_id = g.id
            LEFT JOIN subjects s ON q.subject_id = s.id
            WHERE q.is_published = 1
        `;
        const params = [];
        if (grade_id) { sql += ' AND q.grade_id = ?'; params.push(grade_id); }
        if (subject_id) { sql += ' AND q.subject_id = ?'; params.push(subject_id); }
        sql += ' ORDER BY q.created_at DESC';

        const quizzes = await dbAll(sql, params);
        res.json(quizzes);
    } catch (error) {
        console.error('Quizzes fetch error:', error);
        res.status(500).json({ error: 'දෝෂයක්' });
    }
});

// ============================================
// GET /api/quizzes/:id - Get quiz with questions
// ============================================
router.get('/:id', async (req, res) => {
    try {
        const quiz = await dbGet(`
            SELECT q.*, g.grade_name, s.subject_name
            FROM quizzes q
            LEFT JOIN grades g ON q.grade_id = g.id
            LEFT JOIN subjects s ON q.subject_id = s.id
            WHERE q.id = ?
        `, [req.params.id]);

        if (!quiz) return res.status(404).json({ error: 'ප්‍රශ්නාවලිය හමු නොවේ' });

        const questions = await dbAll(
            'SELECT * FROM quiz_questions WHERE quiz_id = ? ORDER BY id',
            [req.params.id]
        );

        res.json({ ...quiz, questions });
    } catch (error) {
        console.error('Quiz fetch error:', error);
        res.status(500).json({ error: 'දෝෂයක්' });
    }
});

// ============================================
// POST /api/quizzes/:id/submit - Submit answers
// ============================================
router.post('/:id/submit', async (req, res) => {
    try {
        const { answers } = req.body;
        const quizId = req.params.id;

        if (!answers || !Array.isArray(answers)) {
            return res.status(400).json({ error: 'පිළිතුරු අවශ්‍යයි' });
        }

        const questions = await dbAll(
            'SELECT id, correct_answer FROM quiz_questions WHERE quiz_id = ?',
            [quizId]
        );

        let score = 0;
        const results = questions.map(q => {
            const userAnswer = answers.find(a => a.question_id === q.id);
            const isCorrect = userAnswer && userAnswer.answer === q.correct_answer;
            if (isCorrect) score++;
            return {
                question_id: q.id,
                user_answer: userAnswer ? userAnswer.answer : null,
                correct_answer: q.correct_answer,
                is_correct: isCorrect
            };
        });

        const percentage = Math.round((score / questions.length) * 100);

        res.json({
            score,
            total: questions.length,
            percentage,
            results
        });
    } catch (error) {
        console.error('Submit error:', error);
        res.status(500).json({ error: 'දෝෂයක්' });
    }
});

// ============================================
// POST /api/quizzes - Create Quiz (Admin)
// ============================================
router.post('/', authenticate, authorize('admin'), async (req, res) => {
    try {
        const { title, description, grade_id, subject_id, duration_minutes, questions } = req.body;

        if (!title) return res.status(400).json({ error: 'ශීර්ෂය අවශ්‍යයි' });

        const result = await dbRun(
            `INSERT INTO quizzes (title, description, grade_id, subject_id, duration_minutes, is_published, created_by) 
             VALUES (?, ?, ?, ?, ?, 1, ?)`,
            [title, description || null, grade_id || null, subject_id || null, duration_minutes || 15, req.user.id]
        );

        const quizId = result.id;

        if (questions && Array.isArray(questions)) {
            for (const q of questions) {
                await dbRun(
                    `INSERT INTO quiz_questions (quiz_id, question, option_a, option_b, option_c, option_d, correct_answer, explanation) 
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                    [quizId, q.question, q.option_a, q.option_b, q.option_c, q.option_d, q.correct_answer, q.explanation || null]
                );
            }
        }

        res.status(201).json({ message: 'ප්‍රශ්නාවලිය සාර්ථකව එකතු කරන ලදී', id: quizId });
    } catch (error) {
        console.error('Quiz creation error:', error);
        res.status(500).json({ error: 'දෝෂයක්' });
    }
});

// ============================================
// DELETE /api/quizzes/:id (Admin)
// ============================================
router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
    try {
        await dbRun('DELETE FROM quiz_questions WHERE quiz_id = ?', [req.params.id]);
        await dbRun('DELETE FROM quizzes WHERE id = ?', [req.params.id]);
        res.json({ message: 'සාර්ථකව මකා දමන ලදී' });
    } catch (error) {
        console.error('Quiz delete error:', error);
        res.status(500).json({ error: 'දෝෂයක්' });
    }
});

module.exports = router;

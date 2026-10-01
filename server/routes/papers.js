// POST /api/papers (Admin/Teacher)
router.post('/', authenticate, authorize('admin', 'teacher'), async (req, res) => {
    try {
        const { title, description, grade_id, subject_id, paper_type, term, year, pdf_file, answer_pdf, total_marks, duration_minutes } = req.body;
        
        if (!title || !grade_id || !subject_id) {
            return res.status(400).json({ error: 'අවශ්‍ය තොරතුරු ලබා දෙන්න' });
        }

        // pdf_file එක object එකක් විදියට එනවා නම්, ඒකේ url එක විතරක් ගමු
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

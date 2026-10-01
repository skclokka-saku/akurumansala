const express = require('express');
const router = express.Router();
const multer = require('multer');
const { authenticate, authorize } = require('../middleware/auth');

// Multer memory storage (Base64 encoding සඳහා)
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
    const allowed = [
        'application/pdf',
        'image/jpeg', 'image/png', 'image/gif', 'image/webp',
        'video/mp4', 'video/webm'
    ];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('අවසර නැති ෆයිල් වර්ගයකි. PDF, ඡායාරූප හෝ වීඩියෝ උඩුගත කරන්න.'), false);
};

const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 100 * 1024 * 1024 } // 100MB
});

// ==========================================
// POST /api/upload - Single file (Base64)
// ==========================================
router.post('/', authenticate, authorize('admin', 'teacher'), (req, res) => {
    upload.single('file')(req, res, async (err) => {
        if (err) {
            console.error('Multer error:', err);
            return res.status(400).json({ error: err.message || 'ෆයිල් උඩුගත කිරීමේ දෝෂයක්' });
        }

        if (!req.file) {
            return res.status(400).json({ error: 'ෆයිල් එකක් තෝරන්න' });
        }

        try {
            // ෆයිල් එක Base64 string එකකට convert කරන්න
            const base64Data = req.file.buffer.toString('base64');
            const dataUrl = `data:${req.file.mimetype};base64,${base64Data}`;

            const fileInfo = {
                url: dataUrl,
                name: req.file.originalname,
                size: req.file.size,
                type: req.file.mimetype
            };

            console.log('✅ File uploaded (Base64):', req.file.originalname);

            res.json({
                message: 'ෆයිල් සාර්ථකව උඩුගත කරන ලදී',
                file: fileInfo
            });
        } catch (error) {
            console.error('Upload error:', error);
            res.status(500).json({ error: 'ෆයිල් උඩුගත කිරීමේ දෝෂයක්: ' + error.message });
        }
    });
});

// ==========================================
// POST /api/upload/multiple
// ==========================================
router.post('/multiple', authenticate, authorize('admin', 'teacher'), (req, res) => {
    upload.array('files', 10)(req, res, async (err) => {
        if (err) {
            return res.status(400).json({ error: err.message || 'ෆයිල් උඩුගත කිරීමේ දෝෂයක්' });
        }

        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: 'ෆයිල් එකක්වත් තෝරා නැත' });
        }

        try {
            const files = req.files.map(file => {
                const base64Data = file.buffer.toString('base64');
                return {
                    url: `data:${file.mimetype};base64,${base64Data}`,
                    name: file.originalname,
                    size: file.size,
                    type: file.mimetype
                };
            });

            res.json({
                message: 'ෆයිල් සාර්ථකව උඩුගත කරන ලදී',
                files: files
            });
        } catch (error) {
            console.error('Upload error:', error);
            res.status(500).json({ error: 'ෆයිල් උඩුගත කිරීමේ දෝෂයක්: ' + error.message });
        }
    });
});

module.exports = router;

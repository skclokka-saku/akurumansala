const express = require('express');
const router = express.Router();
const multer = require('multer');
const { authenticate, authorize } = require('../middleware/auth');

// Upstash Blob Configuration
const UPSTASH_TOKEN = process.env.UPSTASH_BLOB_TOKEN;
const UPSTASH_URL = process.env.UPSTASH_BLOB_URL;
const BUCKET_NAME = 'akuru-uploads';

// Multer memory storage
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
    const allowed = [
        'application/pdf',
        'image/jpeg', 'image/png', 'image/gif', 'image/webp',
        'video/mp4', 'video/webm'
    ];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('අවසර නැති ෆයිල් වර්ගයකි. PDF, ශ්‍රේණි හෝ වීඩියෝ උඩුගත කරන්න.'), false);
};

const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 100 * 1024 * 1024 } // 100MB
});

// ==========================================
// UPLOAD TO UPSTASH FUNCTION (Using fetch, no @vercel/blob needed)
// ==========================================
async function uploadToUpstash(buffer, originalName, mimetype) {
    try {
        const uniqueName = `${Date.now()}-${originalName.replace(/\s+/g, '-')}`;
        
        // Upstash Blob API එකට fetch හරහා upload කරමු
        const response = await fetch(`${UPSTASH_URL}/${BUCKET_NAME}/${uniqueName}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${UPSTASH_TOKEN}`,
                'Content-Type': mimetype,
            },
            body: buffer,
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Upstash API error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        
        return {
            url: data.url || `${UPSTASH_URL}/${BUCKET_NAME}/${uniqueName}`,
            name: uniqueName,
            size: buffer.length,
            type: mimetype
        };
    } catch (error) {
        console.error('Upstash upload error:', error);
        throw new Error('ෆයිල් එක Upstash එකට උඩුගත කිරීමේ දෝෂයක්: ' + error.message);
    }
}

// ==========================================
// POST /api/upload - Single file
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
            const fileInfo = await uploadToUpstash(
                req.file.buffer,
                req.file.originalname,
                req.file.mimetype
            );

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
            const files = [];
            for (const file of req.files) {
                const fileInfo = await uploadToUpstash(
                    file.buffer,
                    file.originalname,
                    file.mimetype
                );
                files.push(fileInfo);
            }

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

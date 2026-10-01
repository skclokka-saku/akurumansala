const express = require('express');
const router = express.Router();
const multer = require('multer');
const { authenticate, authorize } = require('../middleware/auth');

// ============================================
// UPSTASH BLOB CONFIGURATION
// ============================================
const UPSTASH_TOKEN = process.env.UPSTASH_BLOB_TOKEN;
const UPSTASH_URL = process.env.UPSTASH_BLOB_URL;
const BUCKET_NAME = 'akuru-uploads';

console.log('📦 Upstash Blob Config:');
console.log('   Token:', UPSTASH_TOKEN ? 'SET' : 'NOT SET');
console.log('   URL:', UPSTASH_URL || 'NOT SET');

// Multer memory storage
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
    const allowed = [
        'application/pdf',
        'image/jpeg', 'image/png', 'image/gif', 'image/webp',
        'video/mp4', 'video/webm'
    ];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('අවසර නොලද ගොනු වර්ගයකි. PDF, රූප හෝ වීඩියෝ පමණයි.'), false);
};

const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 50 * 1024 * 1024 } // 50MB
});

// ============================================
// HELPER: Upload to Upstash Blob via REST API
// ============================================
async function uploadToUpstash(buffer, originalName, mimetype) {
    if (!UPSTASH_TOKEN || !UPSTASH_URL) {
        throw new Error('Upstash Blob සේවාව නොමැත. පරිපාලක අමතන්න.');
    }
    
    const fileExt = originalName.split('.').pop();
    const fileName = `${Date.now()}-${Math.round(Math.random() * 1E9)}.${fileExt}`;
    const filePath = `uploads/${fileName}`;
    
    console.log('⬆️ Uploading to Upstash:', filePath, `(${buffer.length} bytes)`);
    
    // Upload using fetch to Upstash Blob REST API
    const uploadUrl = `${UPSTASH_URL}/blob/${filePath}`;
    
    const response = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
            'Authorization': `Bearer ${UPSTASH_TOKEN}`,
            'Content-Type': mimetype || 'application/octet-stream',
            'Content-Length': buffer.length.toString()
        },
        body: buffer
    });
    
    if (!response.ok) {
        const errText = await response.text();
        console.error('Upstash upload error:', response.status, errText);
        throw new Error(`Upstash උඩුගත දෝෂය: ${response.status}`);
    }
    
    const publicUrl = `${UPSTASH_URL}/blob/${filePath}`;
    console.log('✅ Uploaded:', publicUrl);
    
    return {
        url: publicUrl,
        filename: fileName,
        originalname: originalName,
        mimetype: mimetype,
        size: buffer.length
    };
}

// ============================================
// POST /api/upload - Single file
// ============================================
router.post('/', authenticate, authorize('admin', 'teacher'), (req, res) => {
    upload.single('file')(req, res, async (err) => {
        if (err) {
            console.error('Multer error:', err);
            return res.status(400).json({ error: err.message || 'උඩුගත කිරීමේ දෝෂයක්' });
        }
        
        if (!req.file) {
            return res.status(400).json({ error: 'ගොනුවක් උඩුගත කරන්න' });
        }
        
        try {
            const fileInfo = await uploadToUpstash(
                req.file.buffer,
                req.file.originalname,
                req.file.mimetype
            );
            
            res.json({
                message: 'ගොනුව සාර්ථකව උඩුගත කරන ලදී',
                file: fileInfo
            });
        } catch (error) {
            console.error('Upload error:', error);
            res.status(500).json({ error: 'උඩුගත කිරීමේ දෝෂයක්: ' + error.message });
        }
    });
});

// ============================================
// POST /api/upload/multiple
// ============================================
router.post('/multiple', authenticate, authorize('admin', 'teacher'), (req, res) => {
    upload.array('files', 10)(req, res, async (err) => {
        if (err) {
            return res.status(400).json({ error: err.message || 'උඩුගත කිරීමේ දෝෂයක්' });
        }
        
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: 'ගොනු කිසිවක් නැත' });
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
            
            res.json({ message: 'ගොනු සාර්ථකව උඩුගත කරන ලදී', files });
        } catch (error) {
            console.error('Upload error:', error);
            res.status(500).json({ error: 'උඩුගත කිරීමේ දෝෂයක්' });
        }
    });
});

// ============================================
// GET /api/upload/status
// ============================================
router.get('/status', (req, res) => {
    res.json({
        status: (UPSTASH_TOKEN && UPSTASH_URL) ? 'ready' : 'not_configured',
        url: UPSTASH_URL || null,
        token: UPSTASH_TOKEN ? 'SET' : 'NOT SET'
    });
});

module.exports = router;
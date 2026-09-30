const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authenticate, authorize } = require('../middleware/auth');

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        let subDir = 'misc';
        if (file.mimetype === 'application/pdf') subDir = 'pdfs';
        else if (file.mimetype.startsWith('image/')) subDir = 'images';
        else if (file.mimetype.startsWith('video/')) subDir = 'videos';
        
        const fullPath = path.join(uploadDir, subDir);
        if (!fs.existsSync(fullPath)) fs.mkdirSync(fullPath, { recursive: true });
        cb(null, fullPath);
    },
    filename: (req, file, cb) => {
        const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
    }
});

const fileFilter = (req, file, cb) => {
    const allowed = [
        'application/pdf',
        'image/jpeg', 'image/png', 'image/gif', 'image/webp',
        'video/mp4', 'video/webm'
    ];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('අවසර නොලද ගොනු වර්ගයකි'), false);
};

const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 100 * 1024 * 1024 } // 100MB
});

// POST /api/upload
router.post('/', authenticate, authorize('admin', 'teacher'), upload.single('file'), (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'ගොනුවක් උඩුගත කරන්න' });
        
        const relativePath = req.file.path.replace(uploadDir, '').replace(/\\/g, '/');
        const fileUrl = `/uploads${relativePath}`;
        
        res.json({
            message: 'ගොනුව සාර්ථකව උඩුගත කරන ලදී',
            file: {
                url: fileUrl,
                filename: req.file.filename,
                originalname: req.file.originalname,
                mimetype: req.file.mimetype,
                size: req.file.size
            }
        });
    } catch (error) {
        res.status(500).json({ error: 'උඩුගත කිරීමේ දෝෂයක්' });
    }
});

// POST /api/upload/multiple
router.post('/multiple', authenticate, authorize('admin', 'teacher'), upload.array('files', 10), (req, res) => {
    try {
        if (!req.files || req.files.length === 0) return res.status(400).json({ error: 'ගොනු කිසිවක් නැත' });
        
        const files = req.files.map(f => ({
            url: `/uploads${f.path.replace(uploadDir, '').replace(/\\/g, '/')}`,
            filename: f.filename,
            originalname: f.originalname,
            mimetype: f.mimetype,
            size: f.size
        }));
        
        res.json({ message: 'ගොනු සාර්ථකව උඩුගත කරන ලදී', files });
    } catch (error) {
        res.status(500).json({ error: 'උඩුගත කිරීමේ දෝෂයක්' });
    }
});

module.exports = router;
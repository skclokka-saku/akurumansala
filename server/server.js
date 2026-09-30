require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const { initializeDatabase } = require('./database');
const { seedDatabase } = require('./seed');

const authRoutes = require('./routes/auth');
const resourceRoutes = require('./routes/resources');
const gradeRoutes = require('./routes/grades');
const subjectRoutes = require('./routes/subjects');
const paperRoutes = require('./routes/papers');
const videoRoutes = require('./routes/videos');
const articleRoutes = require('./routes/articles');
const uploadRoutes = require('./routes/upload');
const approvalRoutes = require('./routes/approval');
const settingsRoutes = require('./routes/settings');
const quizRoutes = require('./routes/quizzes');
const aiRoutes = require('./routes/ai');
const app = express();
const PORT = process.env.PORT || 3000;

// ============================================
// MIDDLEWARE
// ============================================
app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false
}));
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 500,
    message: { error: 'ඉතා බොහෝ ඉල්ලීම්. කරුණාකර නැවත උත්සාහ කරන්න.' }
});
app.use('/api/', limiter);

// ============================================
// AUTO-INJECT AI-CHAT SCRIPT INTO HTML FILES
// ============================================
app.use((req, res, next) => {
    // Only for GET requests
    if (req.method !== 'GET') return next();
    
    // Skip API requests
    if (req.path.startsWith('/api/')) return next();
    
    const publicPath = path.join(__dirname, '..', 'public');
    const requestedPath = req.path === '/' ? '/index.html' : req.path;
    
    // Only for HTML files
    if (!requestedPath.endsWith('.html')) return next();
    
    const filePath = path.join(publicPath, requestedPath);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) return next();
    
    try {
        let html = fs.readFileSync(filePath, 'utf8');
        
        // Check if ai-chat.js already included
        if (!html.includes('ai-chat.js')) {
            html = html.replace(
                '</body>',
                '    <script src="/js/ai-chat.js"></script>\n</body>'
            );
        }
        
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.send(html);
    } catch (err) {
        console.error('Auto-inject error:', err);
        next();
    }
});

// ============================================
// STATIC FILES
// ============================================
app.use(express.static(path.join(__dirname, '..', 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ============================================
// API ROUTES
// ============================================
app.use('/api/auth', authRoutes);
app.use('/api/resources', resourceRoutes);
app.use('/api/grades', gradeRoutes);
app.use('/api/subjects', subjectRoutes);
app.use('/api/papers', paperRoutes);
app.use('/api/videos', videoRoutes);
app.use('/api/articles', articleRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/approval', approvalRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/quizzes', quizRoutes);
app.use('/api/ai', aiRoutes);
// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404 for API
app.use('/api/*', (req, res) => {
    res.status(404).json({ error: 'API endpoint not found' });
});

// ============================================
// ERROR HANDLER
// ============================================
app.use((err, req, res, next) => {
    console.error('❌ Error:', err);
    res.status(err.status || 500).json({
        error: err.message || 'Internal server error'
    });
});

// ============================================
// START SERVER
// ============================================
async function startServer() {
    try {
        await initializeDatabase();
        await seedDatabase();

        app.listen(PORT, () => {
            console.log('');
            console.log('╔══════════════════════════════════════════════════╗');
            console.log('║                                                  ║');
            console.log('║   🎓 අකුරු මංසල — Akuru Mansala                 ║');
            console.log('║   📚 ඉගෙනුමට නව මඟක්                            ║');
            console.log('║                                                  ║');
            console.log('╠══════════════════════════════════════════════════╣');
            console.log(`║   🌐 Server:  http://localhost:${PORT}              ║`);
            console.log(`║   👤 Admin:   http://localhost:${PORT}/admin.html   ║`);
            console.log(`║   🔐 Login:   http://localhost:${PORT}/login.html   ║`);
            console.log('║                                                  ║');
            console.log('║   📧 Admin:   admin@akurumansala.lk              ║');
            console.log('║   🔑 Password: admin123                          ║');
            console.log('║                                                  ║');
            console.log('║   🤖 e-Akuru-AI: සක්‍රීයයි                          ║');
            console.log('║                                                  ║');
            console.log('╚══════════════════════════════════════════════════╝');
            console.log('');
        });
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
}

startServer();

module.exports = app;
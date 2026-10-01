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
// FIND PUBLIC FOLDER (Smart Detection)
// ============================================
// Try multiple possible locations for the public folder
const publicPaths = [
    path.join(__dirname, '..', 'public'),      // Local: server/../public
    path.join(__dirname, 'public'),            // Railway: server/public (if moved)
    path.join(process.cwd(), 'public'),        // Current working directory
    path.join(process.cwd(), '..', 'public'),  // Parent of cwd
];

let publicPath = null;
for (const p of publicPaths) {
    if (fs.existsSync(p) && fs.existsSync(path.join(p, 'index.html'))) {
        publicPath = p;
        console.log('✅ Public folder found:', p);
        break;
    }
}

if (!publicPath) {
    console.error('❌ Public folder not found in any of these locations:');
    publicPaths.forEach(p => console.error('   -', p));
}

// ============================================
// MIDDLEWARE
// ============================================
app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false
}));
app.use(cors());
app.use(express.json({ limit: '200mb' }));
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
if (publicPath) {
    app.use((req, res, next) => {
        if (req.method !== 'GET') return next();
        if (req.path.startsWith('/api/')) return next();
        
        const requestedPath = req.path === '/' ? '/index.html' : req.path;
        if (!requestedPath.endsWith('.html')) return next();
        
        const filePath = path.join(publicPath, requestedPath);
        if (!fs.existsSync(filePath)) return next();
        
        try {
            let html = fs.readFileSync(filePath, 'utf8');
            
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
}

// ============================================
// STATIC FILES
// ============================================
if (publicPath) {
    app.use(express.static(publicPath));
    console.log('✅ Static files served from:', publicPath);
}
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
    res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        publicPath: publicPath || 'NOT FOUND',
        cwd: process.cwd(),
        dirname: __dirname
    });
});

// Catch-all for SPA (serve index.html for non-API routes)
app.get('*', (req, res) => {
    if (req.path.startsWith('/api/')) {
        return res.status(404).json({ error: 'API endpoint not found' });
    }
    
    if (publicPath) {
        const indexPath = path.join(publicPath, 'index.html');
        if (fs.existsSync(indexPath)) {
            return res.sendFile(indexPath);
        }
    }
    
    res.status(404).send(`
        <html>
            <head><title>404</title></head>
            <body style="font-family: sans-serif; padding: 2rem; text-align: center;">
                <h1>404 - Not Found</h1>
                <p>Public folder not found. Paths tried:</p>
                <ul style="text-align: left; display: inline-block;">
                    ${publicPaths.map(p => `<li><code>${p}</code></li>`).join('')}
                </ul>
                <p>CWD: <code>${process.cwd()}</code></p>
                <p>__dirname: <code>${__dirname}</code></p>
            </body>
        </html>
    `);
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
            console.log('║   🎓 අකුරු මංසල — Akuru Mansala                 ║');
            console.log('║   📚 ඉගෙනුමට නව මඟක්                            ║');
            console.log('╠══════════════════════════════════════════════════╣');
            console.log(`║   🌐 Server:  http://localhost:${PORT}              ║`);
            console.log(`║   📁 Public:  ${publicPath ? 'FOUND' : 'NOT FOUND'}                          ║`);
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

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// ============================================
// DATABASE PATH
// ============================================
const DB_DIR = path.join(__dirname, '..', 'database');
const DB_PATH = path.join(DB_DIR, 'akuru.db');

// Create database directory if it doesn't exist
if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
    console.log('✅ Created database directory:', DB_DIR);
}

// ============================================
// INITIALIZE DATABASE
// ============================================
let db;

function getDb() {
    if (!db) {
        db = new Database(DB_PATH);
        db.pragma('journal_mode = WAL');
        db.pragma('foreign_keys = ON');
        console.log('✅ SQLite database connected:', DB_PATH);
    }
    return db;
}

// ============================================
// INITIALIZE TABLES
// ============================================
async function initializeDatabase() {
    const database = getDb();

    try {
        // Users table
        database.exec(`
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                role TEXT NOT NULL DEFAULT 'student',
                school TEXT,
                phone TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Grades table
        database.exec(`
            CREATE TABLE IF NOT EXISTS grades (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                grade_number INTEGER UNIQUE NOT NULL,
                grade_name TEXT NOT NULL,
                grade_name_en TEXT,
                icon TEXT,
                color TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Subjects table
        database.exec(`
            CREATE TABLE IF NOT EXISTS subjects (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                subject_name TEXT NOT NULL,
                subject_name_en TEXT,
                icon TEXT,
                color TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Grade-Subjects mapping
        database.exec(`
            CREATE TABLE IF NOT EXISTS grade_subjects (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                grade_id INTEGER NOT NULL,
                subject_id INTEGER NOT NULL,
                UNIQUE(grade_id, subject_id),
                FOREIGN KEY (grade_id) REFERENCES grades(id) ON DELETE CASCADE,
                FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
            )
        `);

        // Lessons table
        database.exec(`
            CREATE TABLE IF NOT EXISTS lessons (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                description TEXT,
                grade_id INTEGER,
                subject_id INTEGER,
                is_published INTEGER DEFAULT 1,
                views INTEGER DEFAULT 0,
                created_by INTEGER,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Papers table
        database.exec(`
            CREATE TABLE IF NOT EXISTS papers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                description TEXT,
                grade_id INTEGER,
                subject_id INTEGER,
                paper_type TEXT DEFAULT 'term',
                term TEXT,
                year INTEGER,
                pdf_file TEXT,
                answer_pdf TEXT,
                total_marks INTEGER,
                duration_minutes INTEGER,
                is_published INTEGER DEFAULT 1,
                views INTEGER DEFAULT 0,
                created_by INTEGER,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Videos table
        database.exec(`
            CREATE TABLE IF NOT EXISTS videos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                description TEXT,
                grade_id INTEGER,
                subject_id INTEGER,
                video_url TEXT,
                youtube_id TEXT,
                duration TEXT,
                is_published INTEGER DEFAULT 1,
                views INTEGER DEFAULT 0,
                created_by INTEGER,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Articles table
        database.exec(`
            CREATE TABLE IF NOT EXISTS articles (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                description TEXT,
                content TEXT,
                category TEXT DEFAULT 'අධ්‍යාපනය',
                author TEXT,
                image_url TEXT,
                is_published INTEGER DEFAULT 1,
                views INTEGER DEFAULT 0,
                created_by INTEGER,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Quizzes table
        database.exec(`
            CREATE TABLE IF NOT EXISTS quizzes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                description TEXT,
                grade_id INTEGER,
                subject_id INTEGER,
                duration_minutes INTEGER DEFAULT 15,
                is_published INTEGER DEFAULT 1,
                created_by INTEGER,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Quiz questions table
        database.exec(`
            CREATE TABLE IF NOT EXISTS quiz_questions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                quiz_id INTEGER NOT NULL,
                question TEXT NOT NULL,
                option_a TEXT NOT NULL,
                option_b TEXT NOT NULL,
                option_c TEXT NOT NULL,
                option_d TEXT NOT NULL,
                correct_answer TEXT NOT NULL,
                explanation TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE
            )
        `);

        // Settings table
        database.exec(`
            CREATE TABLE IF NOT EXISTS settings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                setting_key TEXT UNIQUE NOT NULL,
                setting_value TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Activity logs table
        database.exec(`
            CREATE TABLE IF NOT EXISTS activity_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                user_email TEXT,
                action TEXT NOT NULL,
                details TEXT,
                ip_address TEXT,
                user_agent TEXT,
                status TEXT DEFAULT 'success',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // OTP codes table
        database.exec(`
            CREATE TABLE IF NOT EXISTS otp_codes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                phone TEXT NOT NULL,
                code TEXT NOT NULL,
                purpose TEXT DEFAULT 'signup',
                expires_at DATETIME NOT NULL,
                used INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Password resets table
        database.exec(`
            CREATE TABLE IF NOT EXISTS password_resets (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT NOT NULL,
                token TEXT NOT NULL,
                expires_at DATETIME NOT NULL,
                used INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        console.log('✅ All tables created successfully');
    } catch (error) {
        console.error('❌ Database initialization error:', error);
        throw error;
    }
}

// ============================================
// HELPER FUNCTIONS (Drop-in replacement for sqlite3)
// ============================================
async function dbRun(sql, params = []) {
    const database = getDb();
    try {
        const stmt = database.prepare(sql);
        const result = stmt.run(...params);
        return {
            id: result.lastInsertRowid,
            changes: result.changes
        };
    } catch (error) {
        console.error('dbRun error:', error.message, 'SQL:', sql);
        throw error;
    }
}

async function dbGet(sql, params = []) {
    const database = getDb();
    try {
        const stmt = database.prepare(sql);
        return stmt.get(...params);
    } catch (error) {
        console.error('dbGet error:', error.message, 'SQL:', sql);
        throw error;
    }
}

async function dbAll(sql, params = []) {
    const database = getDb();
    try {
        const stmt = database.prepare(sql);
        return stmt.all(...params);
    } catch (error) {
        console.error('dbAll error:', error.message, 'SQL:', sql);
        throw error;
    }
}

module.exports = {
    getDb,
    initializeDatabase,
    dbRun,
    dbGet,
    dbAll,
    DB_PATH
};

// database.js
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const DB_DIR = process.env.RAILWAY_VOLUME_MOUNT_PATH 
    || path.join(__dirname, 'database');
const DB_PATH = path.join(DB_DIR, 'akuru.db');

let db = null;

function initializeDatabase() {
    return new Promise((resolve, reject) => {
        try {
            if (!fs.existsSync(DB_DIR)) {
                fs.mkdirSync(DB_DIR, { recursive: true });
                console.log('✅ Created database directory:', DB_DIR);
            }

            db = new Database(DB_PATH);
            db.pragma('journal_mode = WAL');
            db.pragma('foreign_keys = ON');

            console.log('✅ SQLite database connected:', DB_PATH);

            db.exec(`
                CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    email TEXT UNIQUE NOT NULL,
                    password TEXT NOT NULL,
                    role TEXT DEFAULT 'student',
                    phone TEXT,
                    school TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );

                CREATE TABLE IF NOT EXISTS grades (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    grade_number INTEGER UNIQUE NOT NULL,
                    grade_name TEXT NOT NULL,
                    grade_name_en TEXT,
                    icon TEXT DEFAULT 'fa-graduation-cap',
                    color TEXT DEFAULT '#D4A017',
                    lesson_count INTEGER DEFAULT 0,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );

                CREATE TABLE IF NOT EXISTS subjects (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    subject_name TEXT NOT NULL,
                    subject_name_en TEXT,
                    icon TEXT DEFAULT 'fa-book',
                    color TEXT DEFAULT '#3b82f6',
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );

                CREATE TABLE IF NOT EXISTS grade_subjects (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    grade_id INTEGER NOT NULL,
                    subject_id INTEGER NOT NULL,
                    UNIQUE(grade_id, subject_id)
                );

                CREATE TABLE IF NOT EXISTS lessons (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    title TEXT NOT NULL,
                    description TEXT,
                    content TEXT,
                    grade_id INTEGER,
                    subject_id INTEGER,
                    pdf_file TEXT,
                    image_file TEXT,
                    thumbnail TEXT,
                    is_published INTEGER DEFAULT 0,
                    created_by INTEGER,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );

                CREATE TABLE IF NOT EXISTS papers (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    title TEXT NOT NULL,
                    description TEXT,
                    grade_id INTEGER,
                    subject_id INTEGER,
                    paper_type TEXT DEFAULT 'term',
                    year INTEGER,
                    pdf_file TEXT,
                    answer_pdf TEXT,
                    thumbnail TEXT,
                    is_published INTEGER DEFAULT 0,
                    created_by INTEGER,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );

                CREATE TABLE IF NOT EXISTS videos (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    title TEXT NOT NULL,
                    description TEXT,
                    grade_id INTEGER,
                    subject_id INTEGER,
                    youtube_id TEXT,
                    video_url TEXT,
                    thumbnail TEXT,
                    is_published INTEGER DEFAULT 0,
                    created_by INTEGER,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );

                CREATE TABLE IF NOT EXISTS articles (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    title TEXT NOT NULL,
                    description TEXT,
                    content TEXT,
                    category TEXT DEFAULT 'අධ්‍යාපනය',
                    author TEXT,
                    image_file TEXT,
                    thumbnail TEXT,
                    is_published INTEGER DEFAULT 0,
                    created_by INTEGER,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );

                CREATE TABLE IF NOT EXISTS quizzes (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    title TEXT NOT NULL,
                    description TEXT,
                    grade_id INTEGER,
                    subject_id INTEGER,
                    duration_minutes INTEGER DEFAULT 15,
                    thumbnail TEXT,
                    is_published INTEGER DEFAULT 0,
                    created_by INTEGER,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );

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
                    FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE
                );

                CREATE TABLE IF NOT EXISTS settings (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    setting_key TEXT UNIQUE NOT NULL,
                    setting_value TEXT,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );

                CREATE TABLE IF NOT EXISTS activity_logs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER,
                    user_email TEXT,
                    action TEXT NOT NULL,
                    details TEXT,
                    status TEXT DEFAULT 'success',
                    ip_address TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );

                CREATE INDEX IF NOT EXISTS idx_lessons_grade ON lessons(grade_id);
                CREATE INDEX IF NOT EXISTS idx_lessons_subject ON lessons(subject_id);
                CREATE INDEX IF NOT EXISTS idx_papers_grade ON papers(grade_id);
                CREATE INDEX IF NOT EXISTS idx_videos_grade ON videos(grade_id);
            `);

            // ============================================
            // MIGRATION: Add missing columns to existing tables
            // ============================================
            const migrations = [
                { table: 'papers', column: 'answer_pdf', type: 'TEXT' },
                { table: 'papers', column: 'thumbnail', type: 'TEXT' },
                { table: 'lessons', column: 'content', type: 'TEXT' },
                { table: 'lessons', column: 'image_file', type: 'TEXT' },
                { table: 'lessons', column: 'thumbnail', type: 'TEXT' },
                { table: 'videos', column: 'thumbnail', type: 'TEXT' },
                { table: 'articles', column: 'image_file', type: 'TEXT' },
                { table: 'articles', column: 'author', type: 'TEXT' },
                { table: 'articles', column: 'thumbnail', type: 'TEXT' },
                { table: 'quizzes', column: 'thumbnail', type: 'TEXT' },
            ];

            for (const mig of migrations) {
                try {
                    const columns = db.prepare(`PRAGMA table_info(${mig.table})`).all();
                    if (!columns.some(col => col.name === mig.column)) {
                        console.log(`🔧 Adding ${mig.column} column to ${mig.table}...`);
                        db.exec(`ALTER TABLE ${mig.table} ADD COLUMN ${mig.column} ${mig.type}`);
                        console.log(`✅ ${mig.column} added to ${mig.table}`);
                    }
                } catch (e) {
                    console.error(`⚠️ Migration error (${mig.table}.${mig.column}):`, e.message);
                }
            }

            console.log('✅ All tables created successfully');
            resolve(db);
        } catch (error) {
            console.error('❌ Database initialization error:', error);
            reject(error);
        }
    });
}

function dbRun(sql, params = []) {
    return new Promise((resolve, reject) => {
        try {
            const stmt = db.prepare(sql);
            const result = stmt.run(...params);
            resolve(result);
        } catch (error) {
            reject(error);
        }
    });
}

function dbGet(sql, params = []) {
    return new Promise((resolve, reject) => {
        try {
            const stmt = db.prepare(sql);
            const result = stmt.get(...params);
            resolve(result);
        } catch (error) {
            reject(error);
        }
    });
}

function dbAll(sql, params = []) {
    return new Promise((resolve, reject) => {
        try {
            const stmt = db.prepare(sql);
            const result = stmt.all(...params);
            resolve(result);
        } catch (error) {
            reject(error);
        }
    });
}

module.exports = {
    initializeDatabase,
    dbRun,
    dbGet,
    dbAll,
    getDb: () => db
};
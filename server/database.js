const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_DIR = path.join(__dirname, '..', 'database');
const DB_PATH = path.join(DB_DIR, 'akuru.db');

if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
}

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

console.log('✅ SQLite database connected:', DB_PATH);

function initializeDatabase() {
    try {
        // Users
        db.exec(`
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                role TEXT DEFAULT 'teacher' CHECK(role IN ('admin', 'teacher', 'student')),
                phone TEXT,
                school TEXT,
                is_active INTEGER DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // Grades
        db.exec(`
            CREATE TABLE IF NOT EXISTS grades (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                grade_number INTEGER UNIQUE NOT NULL,
                grade_name TEXT NOT NULL,
                grade_name_en TEXT,
                description TEXT,
                icon TEXT DEFAULT 'fa-graduation-cap',
                color TEXT DEFAULT '#ec4899',
                is_active INTEGER DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // Subjects
        db.exec(`
            CREATE TABLE IF NOT EXISTS subjects (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                subject_name TEXT NOT NULL,
                subject_name_en TEXT,
                description TEXT,
                icon TEXT DEFAULT 'fa-book',
                color TEXT DEFAULT '#3b82f6',
                is_active INTEGER DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // Grade-Subjects
        db.exec(`
            CREATE TABLE IF NOT EXISTS grade_subjects (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                grade_id INTEGER NOT NULL,
                subject_id INTEGER NOT NULL,
                FOREIGN KEY (grade_id) REFERENCES grades(id) ON DELETE CASCADE,
                FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
                UNIQUE(grade_id, subject_id)
            );
        `);

        // Lessons
        db.exec(`
            CREATE TABLE IF NOT EXISTS lessons (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                title_en TEXT,
                description TEXT,
                content TEXT,
                grade_id INTEGER NOT NULL,
                subject_id INTEGER NOT NULL,
                lesson_number INTEGER,
                duration INTEGER,
                difficulty TEXT DEFAULT 'medium',
                pdf_file TEXT,
                video_url TEXT,
                thumbnail TEXT,
                views INTEGER DEFAULT 0,
                is_published INTEGER DEFAULT 1,
                status TEXT DEFAULT 'approved',
                rejection_reason TEXT,
                approved_by INTEGER,
                approved_at DATETIME,
                created_by INTEGER,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (grade_id) REFERENCES grades(id) ON DELETE CASCADE,
                FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
            );
        `);

        // Notes
        db.exec(`
            CREATE TABLE IF NOT EXISTS notes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                description TEXT,
                content TEXT,
                grade_id INTEGER NOT NULL,
                subject_id INTEGER NOT NULL,
                pdf_file TEXT,
                thumbnail TEXT,
                views INTEGER DEFAULT 0,
                is_published INTEGER DEFAULT 1,
                status TEXT DEFAULT 'approved',
                rejection_reason TEXT,
                approved_by INTEGER,
                approved_at DATETIME,
                created_by INTEGER,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (grade_id) REFERENCES grades(id) ON DELETE CASCADE,
                FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
            );
        `);

        // Papers
        db.exec(`
            CREATE TABLE IF NOT EXISTS papers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                description TEXT,
                grade_id INTEGER NOT NULL,
                subject_id INTEGER NOT NULL,
                paper_type TEXT DEFAULT 'term',
                term TEXT,
                year INTEGER,
                pdf_file TEXT,
                answer_pdf TEXT,
                thumbnail TEXT,
                total_marks INTEGER,
                duration_minutes INTEGER,
                views INTEGER DEFAULT 0,
                downloads INTEGER DEFAULT 0,
                is_published INTEGER DEFAULT 1,
                status TEXT DEFAULT 'approved',
                rejection_reason TEXT,
                approved_by INTEGER,
                approved_at DATETIME,
                created_by INTEGER,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (grade_id) REFERENCES grades(id) ON DELETE CASCADE,
                FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
            );
        `);

        // Videos
        db.exec(`
            CREATE TABLE IF NOT EXISTS videos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                description TEXT,
                grade_id INTEGER NOT NULL,
                subject_id INTEGER NOT NULL,
                video_url TEXT NOT NULL,
                youtube_id TEXT,
                thumbnail TEXT,
                duration_minutes INTEGER,
                views INTEGER DEFAULT 0,
                is_published INTEGER DEFAULT 1,
                status TEXT DEFAULT 'approved',
                rejection_reason TEXT,
                approved_by INTEGER,
                approved_at DATETIME,
                created_by INTEGER,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (grade_id) REFERENCES grades(id) ON DELETE CASCADE,
                FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
            );
        `);

        // Articles
        db.exec(`
            CREATE TABLE IF NOT EXISTS articles (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                description TEXT,
                content TEXT,
                category TEXT DEFAULT 'education',
                tags TEXT,
                thumbnail TEXT,
                author TEXT,
                views INTEGER DEFAULT 0,
                is_published INTEGER DEFAULT 1,
                status TEXT DEFAULT 'approved',
                rejection_reason TEXT,
                approved_by INTEGER,
                approved_at DATETIME,
                created_by INTEGER,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // Quizzes
        db.exec(`
            CREATE TABLE IF NOT EXISTS quizzes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                description TEXT,
                grade_id INTEGER NOT NULL,
                subject_id INTEGER NOT NULL,
                duration_minutes INTEGER DEFAULT 30,
                total_questions INTEGER DEFAULT 0,
                is_published INTEGER DEFAULT 1,
                created_by INTEGER,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (grade_id) REFERENCES grades(id) ON DELETE CASCADE,
                FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
            );
        `);

        // Quiz Questions
        db.exec(`
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
                marks INTEGER DEFAULT 1,
                question_order INTEGER DEFAULT 0,
                FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE
            );
        `);

        // Quiz Attempts
        db.exec(`
            CREATE TABLE IF NOT EXISTS quiz_attempts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                quiz_id INTEGER NOT NULL,
                user_name TEXT,
                score INTEGER,
                total_marks INTEGER,
                percentage REAL,
                answers TEXT,
                completed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE
            );
        `);

        // Settings
        db.exec(`
            CREATE TABLE IF NOT EXISTS settings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                setting_key TEXT UNIQUE NOT NULL,
                setting_value TEXT,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // Activity Log
        db.exec(`
            CREATE TABLE IF NOT EXISTS activity_log (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                action TEXT NOT NULL,
                entity_type TEXT,
                entity_id INTEGER,
                details TEXT,
                ip_address TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
        `);

        console.log('✅ All tables created successfully');
        return Promise.resolve();
    } catch (err) {
        console.error('❌ Table creation error:', err);
        return Promise.reject(err);
    }
}

const dbRun = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        try {
            const stmt = db.prepare(sql);
            const info = stmt.run(...params);
            resolve({ id: info.lastInsertRowid, changes: info.changes });
        } catch (err) {
            reject(err);
        }
    });
};

const dbGet = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        try {
            const stmt = db.prepare(sql);
            const row = stmt.get(...params);
            resolve(row);
        } catch (err) {
            reject(err);
        }
    });
};

const dbAll = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        try {
            const stmt = db.prepare(sql);
            const rows = stmt.all(...params);
            resolve(rows);
        } catch (err) {
            reject(err);
        }
    });
};

module.exports = {
    db,
    initializeDatabase,
    dbRun,
    dbGet,
    dbAll
};
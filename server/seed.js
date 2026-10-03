// seed.js
const bcrypt = require('bcryptjs');
const { dbRun, dbGet, initializeDatabase } = require('./database');

// 1-13 ශ්‍රේණි
const grades = [
    { number: 1, name: 'පළමු ශ්‍රේණිය', name_en: 'Grade 1', icon: 'fa-star', color: '#fbbf24' },
    { number: 2, name: 'දෙවන ශ්‍රේණිය', name_en: 'Grade 2', icon: 'fa-star', color: '#f59e0b' },
    { number: 3, name: 'තෙවන ශ්‍රේණිය', name_en: 'Grade 3', icon: 'fa-star', color: '#f97316' },
    { number: 4, name: 'සිව්වන ශ්‍රේණිය', name_en: 'Grade 4', icon: 'fa-book', color: '#ef4444' },
    { number: 5, name: 'පස්වන ශ්‍රේණිය', name_en: 'Grade 5', icon: 'fa-book', color: '#ec4899' },
    { number: 6, name: 'හයවන ශ්‍රේණිය', name_en: 'Grade 6', icon: 'fa-book-open', color: '#a855f7' },
    { number: 7, name: 'හත්වන ශ්‍රේණිය', name_en: 'Grade 7', icon: 'fa-book-open', color: '#8b5cf6' },
    { number: 8, name: 'අටවන ශ්‍රේණිය', name_en: 'Grade 8', icon: 'fa-book-open', color: '#6366f1' },
    { number: 9, name: 'නවවන ශ්‍රේණිය', name_en: 'Grade 9', icon: 'fa-graduation-cap', color: '#3b82f6' },
    { number: 10, name: 'දසවන ශ්‍රේණිය', name_en: 'Grade 10', icon: 'fa-graduation-cap', color: '#0ea5e9' },
    { number: 11, name: 'එකොළොස්වන ශ්‍රේණිය', name_en: 'Grade 11', icon: 'fa-graduation-cap', color: '#06b6d4' },
    { number: 12, name: 'දොළොස්වන ශ්‍රේණිය', name_en: 'Grade 12', icon: 'fa-award', color: '#14b8a6' },
    { number: 13, name: 'දහතුන්වන ශ්‍රේණිය', name_en: 'Grade 13', icon: 'fa-award', color: '#10b981' }
];

// විෂයයන්
const subjects = [
    { name: 'සිංහල', name_en: 'Sinhala', icon: 'fa-language', color: '#ec4899' },
    { name: 'ගණිතය', name_en: 'Mathematics', icon: 'fa-calculator', color: '#3b82f6' },
    { name: 'විද්‍යාව', name_en: 'Science', icon: 'fa-flask', color: '#10b981' },
    { name: 'ඉංග්‍රීසි', name_en: 'English', icon: 'fa-language', color: '#8b5cf6' },
    { name: 'ඉතිහාසය', name_en: 'History', icon: 'fa-landmark', color: '#f59e0b' },
    { name: 'භූගෝල විද්‍යාව', name_en: 'Geography', icon: 'fa-earth-asia', color: '#14b8a6' },
    { name: 'පරිසරය', name_en: 'Environment', icon: 'fa-leaf', color: '#22c55e' },
    { name: 'ICT', name_en: 'ICT', icon: 'fa-laptop-code', color: '#6366f1' },
    { name: 'චිත්‍ර කලාව', name_en: 'Art', icon: 'fa-palette', color: '#f97316' },
    { name: 'සංගීතය', name_en: 'Music', icon: 'fa-music', color: '#a855f7' },
    { name: 'නර්තනය', name_en: 'Dance', icon: 'fa-person-running', color: '#ef4444' },
    { name: 'සෞඛ්‍යය', name_en: 'Health', icon: 'fa-heart-pulse', color: '#dc2626' },
    { name: 'භෞතික විද්‍යාව', name_en: 'Physics', icon: 'fa-atom', color: '#0ea5e9' },
    { name: 'රසායන විද්‍යාව', name_en: 'Chemistry', icon: 'fa-flask-vial', color: '#84cc16' },
    { name: 'ජීව විද්‍යාව', name_en: 'Biology', icon: 'fa-dna', color: '#059669' },
    { name: 'ව්‍යාපාර අධ්‍යයනය', name_en: 'Business Studies', icon: 'fa-briefcase', color: '#7c3aed' },
    { name: 'ගිණුම්කරණය', name_en: 'Accounting', icon: 'fa-calculator', color: '#0891b2' },
    { name: 'ආර්ථික විද්‍යාව', name_en: 'Economics', icon: 'fa-chart-line', color: '#e11d48' },
    { name: 'දේශපාලන විද්‍යාව', name_en: 'Political Science', icon: 'fa-landmark-dome', color: '#9333ea' },
    { name: 'තර්ක ශාස්ත්‍රය', name_en: 'Logic', icon: 'fa-brain', color: '#db2777' }
];

// ශ්‍රේණියට අදාළ විෂයයන්
const gradeSubjectMapping = {
    1: [1, 2, 7, 8, 9, 10, 11, 12],
    2: [1, 2, 7, 8, 9, 10, 11, 12],
    3: [1, 2, 7, 8, 9, 10, 11, 12],
    4: [1, 2, 7, 8, 9, 10, 11, 12],
    5: [1, 2, 7, 8, 9, 10, 11, 12],
    6: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    7: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    8: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    9: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    10: [1, 2, 3, 4, 5, 6, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18],
    11: [1, 2, 3, 4, 5, 6, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18],
    12: [1, 2, 3, 4, 5, 6, 8, 13, 14, 15, 16, 17, 18, 19, 20],
    13: [1, 2, 3, 4, 5, 6, 8, 13, 14, 15, 16, 17, 18, 19, 20]
};

async function seedDatabase() {
    try {
        console.log('🌱 Seeding database...');
        await initializeDatabase();

        // Check if admin exists
        const adminExists = await dbGet("SELECT * FROM users WHERE role = 'admin' LIMIT 1");
        
        if (!adminExists) {
            const adminPassword = await bcrypt.hash('admin123', 10);
            await dbRun(
                'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
                ['පද්ධති පරිපාලක', 'admin@akurumansala.lk', adminPassword, 'admin']
            );
            console.log('✅ Admin created: admin@akurumansala.lk / admin123');

            const teacherPassword = await bcrypt.hash('teacher123', 10);
            await dbRun(
                'INSERT INTO users (name, email, password, role, school) VALUES (?, ?, ?, ?, ?)',
                ['ගුරු මහතා', 'teacher@akurumansala.lk', teacherPassword, 'teacher', 'කෑගල්ල මධ්‍ය විද්‍යාලය']
            );
            console.log('✅ Teacher created: teacher@akurumansala.lk / teacher123');
        }

        const gradeCount = await dbGet('SELECT COUNT(*) as count FROM grades');
        
        if (gradeCount.count === 0) {
            for (const grade of grades) {
                await dbRun(
                    'INSERT INTO grades (grade_number, grade_name, grade_name_en, icon, color) VALUES (?, ?, ?, ?, ?)',
                    [grade.number, grade.name, grade.name_en, grade.icon, grade.color]
                );
            }
            console.log('✅ 13 grades inserted');

            for (const subject of subjects) {
                await dbRun(
                    'INSERT INTO subjects (subject_name, subject_name_en, icon, color) VALUES (?, ?, ?, ?)',
                    [subject.name, subject.name_en, subject.icon, subject.color]
                );
            }
            console.log('✅ 20 subjects inserted');

            for (const [gradeNum, subjectIds] of Object.entries(gradeSubjectMapping)) {
                const grade = await dbGet('SELECT id FROM grades WHERE grade_number = ?', [gradeNum]);
                if (grade) {
                    for (const subjectId of subjectIds) {
                        try {
                            await dbRun(
                                'INSERT OR IGNORE INTO grade_subjects (grade_id, subject_id) VALUES (?, ?)',
                                [grade.id, subjectId]
                            );
                        } catch (e) {}
                    }
                }
            }
            console.log('✅ Grade-Subject mappings inserted');

            // Demo lessons
            const demoLessons = [
                { title: 'පළමු ශ්‍රේණිය සිංහල - අකුරු හඳුනා ගනිමු', grade: 1, subject: 1, desc: 'ස්වර අකුරු සහ ව්‍යංජන අකුරු හඳුනා ගැනීම.' },
                { title: 'දෙවන ශ්‍රේණිය ගණිතය - සංඛ්‍යා ගණන් කිරීම', grade: 2, subject: 2, desc: '1 සිට 100 දක්වා සංඛ්‍යා ගණන් කිරීම.' },
                { title: 'තෙවන ශ්‍රේණිය පරිසරය - අපේ පවුල', grade: 3, subject: 7, desc: 'පවුලේ සාමාජිකයන් සහ ඔවුන්ගේ භූමිකාවන්.' },
                { title: 'හතරවන ශ්‍රේණිය සිංහල - ව්‍යාකරණ මූලිකාංග', grade: 4, subject: 1, desc: 'නාම පද, ක්‍රියා පද හඳුනා ගැනීම.' },
                { title: 'පස්වන ශ්‍රේණිය ගණිතය - භාග', grade: 5, subject: 2, desc: 'භාග සහ ඒවායේ ගණනය කිරීම්.' },
                { title: 'හයවන ශ්‍රේණිය විද්‍යාව - ජීවීන්ගේ ලෝකය', grade: 6, subject: 3, desc: 'ශාක සහ සත්ත්වයන්ගේ ලෝකය.' },
                { title: 'හත්වන ශ්‍රේණිය ගණිතය - සමීකරණ', grade: 7, subject: 2, desc: 'සරල සමීකරණ විසඳීම.' },
                { title: 'අටවන ශ්‍රේණිය විද්‍යාව - පදාර්ථයේ ස්වභාවය', grade: 8, subject: 3, desc: 'පදාර්ථය, ඉහිල් සහ අවස්ථා සහ ගුණාංග.' },
                { title: 'නවවන ශ්‍රේණිය ගණිතය - ත්‍රිකෝණමිතිය', grade: 9, subject: 2, desc: 'ත්‍රිකෝණමිතික අනුපාත.' },
                { title: 'දසවන ශ්‍රේණිය විද්‍යාව - රසායනික ප්‍රතික්‍රියා', grade: 10, subject: 3, desc: 'රසායනික ප්‍රතික්‍රියා වර්ග.' },
                { title: 'එකොළොස්වන ශ්‍රේණිය ගණිතය - වීජ ගණිතය', grade: 11, subject: 2, desc: 'වීජ ගණිත මූලධර්ම.' },
                { title: 'දොළොස්වන ශ්‍රේණිය භෞතික විද්‍යාව - චලිතය', grade: 12, subject: 13, desc: 'චලිතයේ මූලධර්ම.' },
                { title: 'දහතුන්වන ශ්‍රේණිය රසායන විද්‍යාව - කාබනික රසායනය', grade: 13, subject: 14, desc: 'කාබනික සංයෝග.' }
            ];

            for (const lesson of demoLessons) {
                const grade = await dbGet('SELECT id FROM grades WHERE grade_number = ?', [lesson.grade]);
                if (grade) {
                    await dbRun(
                        'INSERT INTO lessons (title, description, grade_id, subject_id, is_published) VALUES (?, ?, ?, ?, 1)',
                        [lesson.title, lesson.desc, grade.id, lesson.subject]
                    );
                }
            }
            console.log('✅ Demo lessons inserted');

            // Demo papers
            const demoPapers = [
                { title: '6 ශ්‍රේණිය විද්‍යාව - පළමු වාර පරීක්ෂණය', grade: 6, subject: 3, type: 'term', year: 2025 },
                { title: '7 ශ්‍රේණිය ගණිතය - දෙවන වාර පරීක්ෂණය', grade: 7, subject: 2, type: 'term', year: 2025 },
                { title: '8 ශ්‍රේණිය සිංහල - තෙවන වාර පරීක්ෂණය', grade: 8, subject: 1, type: 'term', year: 2025 },
                { title: '9 ශ්‍රේණිය ඉංග්‍රීසි - පුහුණු ප්‍රශ්න පත්‍රය', grade: 9, subject: 4, type: 'practice', year: 2025 },
                { title: '10 ශ්‍රේණිය ගණිතය - ආදර්ශ ප්‍රශ්න පත්‍රය', grade: 10, subject: 2, type: 'model', year: 2025 },
                { title: '11 ශ්‍රේණිය විද්‍යාව - සාමාන්‍ය පෙළ ආදර්ශ ප්‍රශ්න පත්‍රය', grade: 11, subject: 3, type: 'exam', year: 2025 }
            ];

            for (const paper of demoPapers) {
                const grade = await dbGet('SELECT id FROM grades WHERE grade_number = ?', [paper.grade]);
                if (grade) {
                    await dbRun(
                        'INSERT INTO papers (title, grade_id, subject_id, paper_type, year, is_published) VALUES (?, ?, ?, ?, ?, 1)',
                        [paper.title, grade.id, paper.subject, paper.type, paper.year]
                    );
                }
            }
            console.log('✅ Demo papers inserted');

            // Demo videos
            const demoVideos = [
                { title: 'විද්‍යාව: පදාර්ථයේ අවස්ථා', grade: 8, subject: 3, youtube: 'dQw4w9WgXcQ' },
                { title: 'ගණිතය: භාග සරල කරමු', grade: 7, subject: 2, youtube: 'dQw4w9WgXcQ' },
                { title: 'ICT: Computer Network යනු කුමක්ද?', grade: 10, subject: 8, youtube: 'dQw4w9WgXcQ' }
            ];

            for (const video of demoVideos) {
                const grade = await dbGet('SELECT id FROM grades WHERE grade_number = ?', [video.grade]);
                if (grade) {
                    await dbRun(
                        'INSERT INTO videos (title, grade_id, subject_id, youtube_id, video_url, is_published) VALUES (?, ?, ?, ?, ?, 1)',
                        [video.title, grade.id, video.subject, video.youtube, 'https://www.youtube.com/watch?v=' + video.youtube]
                    );
                }
            }
            console.log('✅ Demo videos inserted');

            // Demo articles
            const demoArticles = [
                { title: 'විෂයානුකූලව සූදානම් වීමේ සරල ක්‍රම 10', category: 'අධ්‍යාපනය', content: 'විෂයානුකූලව පෙර කාලය නිවැරදිව සැලසුම් කරගැනීමට උපකාරී අදහස් කිහිපයක්...' },
                { title: 'කියවීමේ පුරුද්ද වර්ධනය කරගන්නේ කෙසේද?', category: 'පුරුදු', content: 'දිනපතා කියවීමේ පුරුද්දක් ඇති කරගැනීමෙන් ප්‍රයෝජනයක් ක්‍රම...' },
                { title: 'තාක්ෂණය සහ නවීන අධ්‍යාපනය', category: 'තාක්ෂණය', content: 'ඩිජිටල් සම්පත් භාවිතයෙන් අධ්‍යාපනයට ශාඛා...' }
            ];

            for (const article of demoArticles) {
                await dbRun(
                    'INSERT INTO articles (title, content, category, is_published) VALUES (?, ?, ?, 1)',
                    [article.title, article.content, article.category]
                );
            }
            console.log('✅ Demo articles inserted');
        }

        // Settings
        const settings = [
            ['site_name', 'අකුරු මංසල'],
            ['site_name_en', 'Akuru Mansala'],
            ['site_tagline', 'ඉගෙනුමට නව මඟක්'],
            ['site_email', 'info@akurumansala.lk'],
            ['site_phone', '+94 767512666'],
            ['site_address', 'කෑගල්ල, ශ්‍රී ලංකාව'],
            ['site_facebook', 'https://facebook.com/akurumansala'],
            ['site_youtube', 'https://youtube.com/@akurumansala'],
            ['site_whatsapp', '+94112345678'],
            ['site_instagram', 'https://instagram.com/akurumansala'],
            ['site_twitter', 'https://twitter.com/akurumansala'],
            ['site_linkedin', ''],
            ['hero_title_1', 'දැනුමට'],
            ['hero_title_2', 'අකුරු'],
            ['hero_title_3', 'එකතු කරමු.'],
            ['hero_description', '1 සිට 13 ශ්‍රේණි දක්වා සිසුන්ට ඉගෙනීමට, ගුරුවරුන්ට අධ්‍යාපනික සම්පත් බෙදා ගැනීමට නිර්මාණය කළ අධ්‍යාපනික වේදිකාවක්.']
        ];

        for (const [key, value] of settings) {
            try {
                await dbRun(
                    'INSERT OR IGNORE INTO settings (setting_key, setting_value) VALUES (?, ?)',
                    [key, value]
                );
            } catch (e) {}
        }

        console.log('🎉 Database seeding completed!');
    } catch (error) {
        console.error('❌ Seeding error:', error);
    }
}

if (require.main === module) {
    seedDatabase().then(() => {
        console.log('✅ Seeding complete');
        process.exit(0);
    }).catch(err => {
        console.error('❌ Seeding failed:', err);
        process.exit(1);
    });
}

module.exports = { seedDatabase };

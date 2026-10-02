// ============================================
// AKURU MANSALA - ADMIN PANEL JAVASCRIPT
// ============================================

const API_BASE = '/api';

const state = {
    user: null,
    token: null,
    grades: [],
    subjects: [],
    currentTab: 'dashboard'
};

// ============================================
// INITIALIZATION
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Admin Panel initializing...');
    
    if (!checkAuth()) return;
    
    loadTheme();
    await loadGrades();
    await loadSubjects();
    showTab('dashboard');
    
    setTimeout(checkPendingCount, 1000);
    
    // Show logs link only for web_developer
    if (state.user && state.user.role === 'web_developer') {
        const logsLink = document.getElementById('logsLink');
        if (logsLink) logsLink.style.display = 'flex';
    }
    
    console.log('✅ Admin Panel ready');
});

// ============================================
// AUTHENTICATION
// ============================================
function checkAuth() {
    state.token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    
    if (!state.token || !userStr) {
        window.location.href = '/login.html';
        return false;
    }
    
    try {
        state.user = JSON.parse(userStr);
        
        // Allow web_developer, admin, and teacher
        const allowedRoles = ['web_developer', 'admin', 'teacher'];
        if (!allowedRoles.includes(state.user.role)) {
            alert('ඔබට මෙම පිටුවට ප්‍රවේශය නැත');
            window.location.href = '/';
            return false;
        }
        
        const userInfo = document.getElementById('userInfo');
        if (userInfo) {
            const roleDisplay = {
                'web_developer': 'Web Developer',
                'admin': 'Admin',
                'teacher': 'Teacher'
            };
            userInfo.innerHTML = `
                <div class="flex items-center space-x-2">
                    <div class="w-8 h-8 rounded-lg bg-gradient-to-tr from-brand-gold to-brand-gold2 flex items-center justify-center text-brand-navy font-bold text-xs">
                        ${state.user.name ? state.user.name.charAt(0) : 'U'}
                    </div>
                    <div class="flex-1 min-w-0">
                        <p class="text-white text-xs font-bold truncate">${state.user.name || 'User'}</p>
                        <p class="text-[10px] text-white/60 uppercase">${roleDisplay[state.user.role] || state.user.role}</p>
                    </div>
                </div>
            `;
        }
        
        return true;
    } catch (e) {
        console.error('Auth parse error:', e);
        window.location.href = '/login.html';
        return false;
    }
}

function logout() {
    if (confirm('ඉවත් වීමට අවශ්‍යද?')) {
        localStorage.clear();
        window.location.href = '/login.html';
    }
}

// ============================================
// API HELPER
// ============================================
async function api(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`;
    
    try {
        const res = await fetch(url, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${state.token}`,
                ...(options.headers || {})
            }
        });
        
        if (res.status === 401) {
            localStorage.clear();
            window.location.href = '/login.html';
            return;
        }
        
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || 'API Error');
        }
        
        return await res.json();
    } catch (err) {
        console.error('API Error:', endpoint, err);
        throw err;
    }
}

// ============================================
// LOAD DATA
// ============================================
async function loadGrades() {
    try {
        const res = await fetch(`${API_BASE}/grades`);
        if (!res.ok) throw new Error('Grades fetch failed');
        const grades = await res.json();
        
        // Handle both array and object response
        state.grades = Array.isArray(grades) ? grades : (grades.grades || []);
        
        console.log('✅ Grades loaded:', state.grades.length);
    } catch (err) {
        console.error('❌ Failed to load grades:', err);
        state.grades = [];
    }
}

async function loadSubjects() {
    try {
        const res = await fetch(`${API_BASE}/subjects`);
        if (!res.ok) throw new Error('Subjects fetch failed');
        const subjects = await res.json();
        
        // Handle both array and object response
        state.subjects = Array.isArray(subjects) ? subjects : (subjects.subjects || []);
        
        console.log('✅ Subjects loaded:', state.subjects.length);
    } catch (err) {
        console.error('❌ Failed to load subjects:', err);
        state.subjects = [];
    }
}

// ============================================
// TABS
// ============================================
function showTab(tab) {
    state.currentTab = tab;
    
    document.querySelectorAll('.sidebar-link').forEach(el => el.classList.remove('active'));
    document.querySelector(`[data-tab="${tab}"]`)?.classList.add('active');
    
    const titles = {
        dashboard: ['Dashboard', 'පද්ධතියේ සමස්ත තොරතුරු'],
        lessons: ['පාඩම්', 'පාඩම් කළමනාකරණය'],
        papers: ['ප්‍රශ්න පත්‍ර', 'ප්‍රශ්න පත්‍ර කළමනාකරණය'],
        videos: ['වීඩියෝ', 'වීඩියෝ කළමනාකරණය'],
        articles: ['ලිපි', 'ලිපි කළමනාකරණය'],
        grades: ['ශ්‍රේණි', 'ශ්‍රේණි කළමනාකරණය'],
        subjects: ['විෂයයන්', 'විෂය කළමනාකරණය'],
        pending: ['අනුමැතිය අපේක්ෂිත', 'ගුරුවරුන්ගේ දත්ත'],
        users: ['පරිශීලකයින්', 'පරිශීලක කළමනාකරණය'],
        settings: ['වෙබ් අඩවි සැකසුම්', 'Social Media සහ වෙබ් අඩවි තොරතුරු'],
        quizzes: ['ප්‍රශ්නාවලි', 'ප්‍රශ්නාවලි කළමනාකරණය'],
        logs: ['ක්‍රියාකාරකම් Logs', 'පද්ධතියේ සියලු ක්‍රියාකාරකම්']
    };
    
    const [title, subtitle] = titles[tab] || ['Admin', ''];
    document.getElementById('pageTitle').textContent = title;
    document.getElementById('pageSubtitle').textContent = subtitle;
    
    const renderers = {
        dashboard: renderDashboard,
        lessons: () => renderResourceTable('lesson'),
        papers: () => renderResourceTable('paper'),
        videos: () => renderResourceTable('video'),
        articles: () => renderResourceTable('article'),
        grades: renderGrades,
        subjects: renderSubjects,
        pending: renderPending,
        users: renderUsers,
        settings: renderSettings,
        quizzes: renderQuizzes,
        logs: renderLogs
    };
    
    if (renderers[tab]) {
        renderers[tab]();
    }
    
    document.getElementById('sidebar')?.classList.remove('open');
}

function toggleSidebar() {
    document.getElementById('sidebar')?.classList.toggle('open');
}

// ============================================
// DASHBOARD
// ============================================
async function renderDashboard() {
    const content = document.getElementById('tabContent');
    content.innerHTML = `<div class="text-center py-12"><div class="w-12 h-12 border-4 border-brand-gold border-t-transparent rounded-full animate-spin mx-auto"></div></div>`;
    
    try {
        const stats = await api('/resources/stats');
        
        content.innerHTML = `
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
                <div class="stat-card bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                    <i class="fa-solid fa-book-open text-4xl opacity-40 mb-4"></i>
                    <div class="text-4xl font-black mb-1">${stats.total_lessons || 0}</div>
                    <div class="text-sm opacity-90 font-bold">පාඩම්</div>
                </div>
                <div class="stat-card bg-gradient-to-br from-pink-500 to-pink-600 text-white">
                    <i class="fa-solid fa-file-lines text-4xl opacity-40 mb-4"></i>
                    <div class="text-4xl font-black mb-1">${stats.total_papers || 0}</div>
                    <div class="text-sm opacity-90 font-bold">ප්‍රශ්න පත්‍ර</div>
                </div>
                <div class="stat-card bg-gradient-to-br from-red-500 to-red-600 text-white">
                    <i class="fa-solid fa-video text-4xl opacity-40 mb-4"></i>
                    <div class="text-4xl font-black mb-1">${stats.total_videos || 0}</div>
                    <div class="text-sm opacity-90 font-bold">වීඩියෝ</div>
                </div>
                <div class="stat-card bg-gradient-to-br from-teal-500 to-teal-600 text-white">
                    <i class="fa-solid fa-newspaper text-4xl opacity-40 mb-4"></i>
                    <div class="text-4xl font-black mb-1">${stats.total_articles || 0}</div>
                    <div class="text-sm opacity-90 font-bold">ලිපි</div>
                </div>
            </div>
            
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div class="stat-card">
                    <div class="w-12 h-12 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center text-xl mb-4">
                        <i class="fa-solid fa-graduation-cap"></i>
                    </div>
                    <div class="text-3xl font-black text-brand-navy">${stats.total_grades || 13}</div>
                    <div class="text-sm text-gray-500">ශ්‍රේණි</div>
                </div>
                <div class="stat-card">
                    <div class="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center text-xl mb-4">
                        <i class="fa-solid fa-book"></i>
                    </div>
                    <div class="text-3xl font-black text-brand-navy">${stats.total_subjects || 20}</div>
                    <div class="text-sm text-gray-500">විෂයයන්</div>
                </div>
                <div class="stat-card">
                    <div class="w-12 h-12 rounded-xl bg-green-100 text-green-600 flex items-center justify-center text-xl mb-4">
                        <i class="fa-solid fa-users"></i>
                    </div>
                    <div class="text-3xl font-black text-brand-navy">${stats.total_users || 0}</div>
                    <div class="text-sm text-gray-500">පරිශීලකයින්</div>
                </div>
            </div>
        `;
    } catch (err) {
        content.innerHTML = `<div class="text-center py-12 text-red-500">දෝෂයක්: ${err.message}</div>`;
    }
}

// ============================================
// RESOURCE TABLES
// ============================================
async function renderResourceTable(type) {
    const content = document.getElementById('tabContent');
    content.innerHTML = `<div class="text-center py-12"><div class="w-12 h-12 border-4 border-brand-gold border-t-transparent rounded-full animate-spin mx-auto"></div></div>`;
    
    const typeMap = { lesson: 'lessons', paper: 'papers', video: 'videos', article: 'articles' };
    const labels = { lesson: 'පාඩම', paper: 'ප්‍රශ්න පත්‍රය', video: 'වීඩියෝව', article: 'ලිපිය' };
    const icons = { lesson: 'fa-book-open', paper: 'fa-file-lines', video: 'fa-video', article: 'fa-newspaper' };
    
    try {
        const data = await api(`/resources?type=${type}&limit=100`);
        const items = data[typeMap[type]] || [];
        
        let html = `
            <div class="flex justify-between items-center mb-6">
                <div class="text-sm text-gray-500">මුළු: <strong>${items.length}</strong> ${labels[type]}</div>
                <button onclick="openForm('${type}')" class="btn-primary">
                    <i class="fa-solid fa-plus"></i>
                    <span>නව ${labels[type]}ක්</span>
                </button>
            </div>
        `;
        
        if (items.length === 0) {
            html += `
                <div class="stat-card text-center py-16">
                    <i class="fa-solid ${icons[type]} text-6xl text-gray-300 mb-4"></i>
                    <p class="text-gray-500 text-lg">දත්ත නොමැත</p>
                    <p class="text-gray-400 text-sm mt-2">පළමු ${labels[type]} එකතු කරන්න</p>
                </div>
            `;
        } else {
            html += `
                <div class="overflow-x-auto">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>ශීර්ෂය</th>
                                <th>ශ්‍රේණිය</th>
                                <th>විෂය</th>
                                <th>ක්‍රියා</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${items.map(item => `
                                <tr>
                                    <td class="text-gray-500">#${item.id}</td>
                                    <td class="font-bold">${item.title || 'N/A'}</td>
                                    <td>${item.grade_name || '-'}</td>
                                    <td>${item.subject_name || '-'}</td>
                                    <td>
                                        <button onclick="deleteItem('${type}', ${item.id})" class="btn-danger">
                                            <i class="fa-solid fa-trash"></i> මකන්න
                                        </button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        }
        
        content.innerHTML = html;
    } catch (err) {
        content.innerHTML = `<div class="text-center py-12 text-red-500">දෝෂයක්: ${err.message}</div>`;
    }
}

// ============================================
// GRADES
// ============================================
async function renderGrades() {
    const content = document.getElementById('tabContent');
    
    try {
        const grades = await api('/grades');
        
        content.innerHTML = `
            <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                ${grades.map(g => `
                    <div class="stat-card text-center">
                        <div class="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center text-white text-2xl mb-3" style="background:${g.color || '#D4A017'}">
                            <i class="fa-solid ${g.icon || 'fa-graduation-cap'}"></i>
                        </div>
                        <h3 class="font-black text-brand-navy">${g.grade_name}</h3>
                        <p class="text-xs text-gray-500 mt-1">${g.lesson_count || 0} පාඩම්</p>
                    </div>
                `).join('')}
            </div>
        `;
    } catch (err) {
        content.innerHTML = `<div class="text-center py-12 text-red-500">දෝෂයක්: ${err.message}</div>`;
    }
}

// ============================================
// SUBJECTS
// ============================================
async function renderSubjects() {
    const content = document.getElementById('tabContent');
    
    try {
        const subjects = await api('/subjects');
        
        content.innerHTML = `
            <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                ${subjects.map(s => `
                    <div class="stat-card text-center">
                        <div class="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center text-white text-2xl mb-3" style="background:${s.color || '#3b82f6'}">
                            <i class="fa-solid ${s.icon || 'fa-book'}"></i>
                        </div>
                        <h3 class="font-bold text-brand-navy text-sm">${s.subject_name}</h3>
                        <p class="text-xs text-gray-500 mt-1">${s.subject_name_en || ''}</p>
                    </div>
                `).join('')}
            </div>
        `;
    } catch (err) {
        content.innerHTML = `<div class="text-center py-12 text-red-500">දෝෂයක්: ${err.message}</div>`;
    }
}

// ============================================
// PENDING APPROVALS
// ============================================
async function renderPending() {
    const content = document.getElementById('tabContent');
    content.innerHTML = `<div class="text-center py-12"><div class="w-12 h-12 border-4 border-brand-gold border-t-transparent rounded-full animate-spin mx-auto"></div></div>`;
    
    try {
        const data = await api('/approval/pending');
        const total = data.total || 0;

        const badge = document.getElementById('pendingBadge');
        if (badge) {
            if (total > 0) {
                badge.textContent = total;
                badge.classList.remove('hidden');
            } else {
                badge.classList.add('hidden');
            }
        }

        if (total === 0) {
            content.innerHTML = `
                <div class="stat-card text-center py-16">
                    <i class="fa-solid fa-check-circle text-6xl text-green-400 mb-4"></i>
                    <p class="text-gray-500 text-lg font-bold">අනුමැතිය අපේක්ෂිත දත්ත නොමැත</p>
                    <p class="text-gray-400 text-sm mt-2">සියලු දත්ත අනුමත කර ඇත</p>
                </div>
            `;
            return;
        }

        let html = `
            <div class="mb-6 flex items-center justify-between">
                <div class="text-sm text-gray-500">
                    මුළු අනුමැතිය අපේක්ෂිත: <strong class="text-red-500 text-lg">${total}</strong>
                </div>
                <button onclick="renderPending()" class="text-sm text-brand-navy font-bold hover:text-brand-gold flex items-center gap-2">
                    <i class="fa-solid fa-refresh"></i>Refresh
                </button>
            </div>
        `;

        if (data.lessons && data.lessons.length > 0) {
            html += renderPendingSection('පාඩම්', data.lessons, 'lesson', 'fa-book-open', 'blue');
        }
        if (data.papers && data.papers.length > 0) {
            html += renderPendingSection('ප්‍රශ්න පත්‍ර', data.papers, 'paper', 'fa-file-lines', 'pink');
        }
        if (data.videos && data.videos.length > 0) {
            html += renderPendingSection('වීඩියෝ', data.videos, 'video', 'fa-video', 'red');
        }
        if (data.articles && data.articles.length > 0) {
            html += renderPendingSection('ලිපි', data.articles, 'article', 'fa-newspaper', 'teal');
        }

        content.innerHTML = html;

    } catch (err) {
        content.innerHTML = `<div class="text-center py-12 text-red-500">දෝෂයක්: ${err.message}</div>`;
    }
}

function renderPendingSection(title, items, type, icon, color) {
    const colorMap = {
        blue: 'bg-blue-100 text-blue-600 border-blue-200',
        pink: 'bg-pink-100 text-pink-600 border-pink-200',
        red: 'bg-red-100 text-red-600 border-red-200',
        teal: 'bg-teal-100 text-teal-600 border-teal-200'
    };

    return `
        <div class="mb-8">
            <h3 class="text-lg font-black text-brand-navy mb-4 flex items-center">
                <i class="fa-solid ${icon} mr-2"></i>${title} (${items.length})
            </h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                ${items.map(item => `
                    <div class="stat-card border-l-4 border-brand-gold">
                        <div class="flex items-start justify-between mb-3">
                            <div class="flex-1">
                                <h4 class="font-bold text-brand-navy text-base mb-1">${item.title}</h4>
                                <p class="text-xs text-gray-500">
                                    ${item.grade_name || ''} ${item.subject_name ? '• ' + item.subject_name : ''}
                                </p>
                                ${item.creator_name ? `
                                    <p class="text-xs text-gray-400 mt-2">
                                        <i class="fa-solid fa-user mr-1"></i>${item.creator_name}
                                    </p>
                                ` : ''}
                                <p class="text-xs text-gray-400 mt-1">
                                    <i class="fa-solid fa-clock mr-1"></i>${new Date(item.created_at).toLocaleDateString('si-LK')}
                                </p>
                            </div>
                            <span class="text-xs font-bold px-3 py-1 rounded-full ${colorMap[color]}">
                                අපේක්ෂිත
                            </span>
                        </div>
                        <div class="flex gap-2 mt-4 pt-4 border-t border-gray-100">
                            <button onclick="approveItem('${type}', ${item.id})" 
                                    class="flex-1 py-2 bg-green-500 hover:bg-green-600 text-white font-bold rounded-lg text-xs transition">
                                <i class="fa-solid fa-check mr-1"></i>අනුමත කරන්න
                            </button>
                            <button onclick="rejectItem('${type}', ${item.id})" 
                                    class="flex-1 py-2 bg-red-500 hover:bg-red-600 text-white font-bold rounded-lg text-xs transition">
                                <i class="fa-solid fa-times mr-1"></i>ප්‍රතික්ෂේප කරන්න
                            </button>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

// ============================================
// APPROVE / REJECT FUNCTIONS
// ============================================
async function approveItem(type, id) {
    if (!confirm('මෙම අයිතමය අනුමත කිරීමට අවශ්‍යද?')) return;
    
    try {
        await api(`/approval/approve/${type}/${id}`, { method: 'POST' });
        showToast('සාර්ථකව අනුමත කරන ලදී!', 'success');
        if (typeof renderPending === 'function') renderPending();
    } catch (err) {
        showToast('දෝෂයක්: ' + err.message, 'error');
    }
}

async function rejectItem(type, id) {
    const reason = prompt('ප්‍රතික්ෂේප කිරීමට හේතුව (අවශ්‍ය නැහැ):');
    if (reason === null) return;
    
    try {
        await api(`/approval/reject/${type}/${id}`, {
            method: 'POST',
            body: JSON.stringify({ reason: reason || 'No reason provided' })
        });
        showToast('සාර්ථකව ප්‍රතික්ෂේප කරන ලදී', 'success');
        if (typeof renderPending === 'function') renderPending();
    } catch (err) {
        showToast('දෝෂයක්: ' + err.message, 'error');
    }
}

async function checkPendingCount() {
    try {
        const data = await api('/approval/count');
        const badge = document.getElementById('pendingBadge');
        if (badge && data.total > 0) {
            badge.textContent = data.total;
            badge.classList.remove('hidden');
        } else if (badge) {
            badge.classList.add('hidden');
        }
    } catch (err) {
        console.error('Pending count error:', err);
    }
}

// ============================================
// USERS
// ============================================
async function renderUsers() {
    const content = document.getElementById('tabContent');
    content.innerHTML = `<div class="text-center py-12"><div class="w-12 h-12 border-4 border-brand-gold border-t-transparent rounded-full animate-spin mx-auto"></div></div>`;
    
    try {
        const data = await api('/auth/users');
        const users = data.users || [];
        
        content.innerHTML = `
            <div class="mb-6 text-sm text-gray-500">මුළු පරිශීලකයින්: <strong>${users.length}</strong></div>
            <div class="overflow-x-auto">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>නම</th>
                            <th>විද්‍යුත් තැපෑල</th>
                            <th>භූමිකාව</th>
                            <th>දුරකථන</th>
                            <th>පාසල</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${users.map(u => `
                            <tr>
                                <td class="font-bold">${u.name}</td>
                                <td>${u.email}</td>
                                <td>
                                    <span class="px-3 py-1 rounded-full text-xs font-bold ${
                                        u.role === 'web_developer' ? 'bg-gradient-to-r from-purple-100 to-pink-100 text-purple-700' :
                                        u.role === 'admin' ? 'bg-purple-100 text-purple-600' : 
                                        u.role === 'teacher' ? 'bg-blue-100 text-blue-600' : 
                                        'bg-gray-100 text-gray-600'}">
                                        ${u.role}
                                    </span>
                                </td>
                                <td>${u.phone || '-'}</td>
                                <td>${u.school || '-'}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    } catch (err) {
        content.innerHTML = `<div class="text-center py-12 text-red-500">දෝෂයක්: ${err.message}</div>`;
    }
}

// ============================================
// FORM MODAL
// ============================================
function openForm(type) {
    const modal = document.getElementById('modal');
    const modalBody = document.getElementById('modalBody');
    
    const labels = { lesson: 'පාඩම', paper: 'ප්‍රශ්න පත්‍රය', video: 'වීඩියෝව', article: 'ලිපිය' };
    document.getElementById('modalTitle').textContent = `නව ${labels[type]}ක් එකතු කරන්න`;
    
    const gradeOptions = state.grades.map(g => `<option value="${g.id}">${g.grade_name}</option>`).join('');
    const subjectOptions = state.subjects.map(s => `<option value="${s.id}">${s.subject_name}</option>`).join('');
    
    let formFields = '';
    
    if (type === 'lesson') {
        formFields = `
            <div class="space-y-4">
                <div>
                    <label class="block text-sm font-bold mb-2">ශීර්ෂය *</label>
                    <input id="f_title" required class="form-input" placeholder="පාඩමේ නම">
                </div>
                <div>
                    <label class="block text-sm font-bold mb-2">විස්තරය</label>
                    <textarea id="f_desc" rows="5" class="form-input" placeholder="පාඩම පිළිබඳ සම්පූර්ණ විස්තරය"></textarea>
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-bold mb-2">ශ්‍රේණිය *</label>
                        <select id="f_grade" required class="form-input">${gradeOptions}</select>
                    </div>
                    <div>
                        <label class="block text-sm font-bold mb-2">විෂය *</label>
                        <select id="f_subject" required class="form-input">${subjectOptions}</select>
                    </div>
                </div>
            </div>
        `;
    } else if (type === 'paper') {
        formFields = `
            <div class="space-y-4">
                <div>
                    <label class="block text-sm font-bold mb-2">ශීර්ෂය *</label>
                    <input id="f_title" required class="form-input" placeholder="ප්‍රශ්න පත්‍රයේ නම">
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-bold mb-2">ශ්‍රේණිය *</label>
                        <select id="f_grade" required class="form-input">${gradeOptions}</select>
                    </div>
                    <div>
                        <label class="block text-sm font-bold mb-2">විෂය *</label>
                        <select id="f_subject" required class="form-input">${subjectOptions}</select>
                    </div>
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-bold mb-2">වර්ගය</label>
                        <select id="f_type" class="form-input">
                            <option value="term">වාර පරීක්ෂණය</option>
                            <option value="school">පාසල් පරීක්ෂණය</option>
                            <option value="practice">පුහුණු</option>
                            <option value="exam">විභාගය</option>
                            <option value="model">ආදර්ශ</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-sm font-bold mb-2">වර්ෂය</label>
                        <input type="number" id="f_year" value="${new Date().getFullYear()}" class="form-input">
                    </div>
                </div>
                <div>
                    <label class="block text-sm font-bold mb-2">📄 PDF ගොනුව</label>
                    <input type="file" id="f_pdf" accept=".pdf" class="form-input">
                    <p class="text-xs text-gray-500 mt-1">උපරිම 50MB. PDF පමණයි.</p>
                </div>
            </div>
        `;
    } else if (type === 'video') {
        formFields = `
            <div class="space-y-4">
                <div>
                    <label class="block text-sm font-bold mb-2">ශීර්ෂය *</label>
                    <input id="f_title" required class="form-input" placeholder="වීඩියෝවේ නම">
                </div>
                <div>
                    <label class="block text-sm font-bold mb-2">විස්තරය</label>
                    <textarea id="f_desc" rows="3" class="form-input" placeholder="වීඩියෝව පිළිබඳ කෙටි විස්තරයක්"></textarea>
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-bold mb-2">ශ්‍රේණිය *</label>
                        <select id="f_grade" required class="form-input">${gradeOptions}</select>
                    </div>
                    <div>
                        <label class="block text-sm font-bold mb-2">විෂය *</label>
                        <select id="f_subject" required class="form-input">${subjectOptions}</select>
                    </div>
                </div>
                <div>
                    <label class="block text-sm font-bold mb-2">YouTube URL *</label>
                    <input id="f_video_url" required class="form-input" placeholder="https://www.youtube.com/watch?v=...">
                </div>
            </div>
        `;
    } else if (type === 'article') {
        formFields = `
            <div class="space-y-4">
                <div>
                    <label class="block text-sm font-bold mb-2">ශීර්ෂය *</label>
                    <input id="f_title" required class="form-input" placeholder="ලිපියේ නම">
                </div>
                <div>
                    <label class="block text-sm font-bold mb-2">විස්තරය</label>
                    <input id="f_desc" class="form-input" placeholder="කෙටි විස්තරයක්">
                </div>
                <div>
                    <label class="block text-sm font-bold mb-2">අන්තර්ගතය *</label>
                    <textarea id="f_content" required rows="8" class="form-input" placeholder="ලිපියේ සම්පූර්ණ අන්තර්ගතය"></textarea>
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-bold mb-2">කාණ්ඩය</label>
                        <input id="f_category" value="අධ්‍යාපනය" class="form-input">
                    </div>
                    <div>
                        <label class="block text-sm font-bold mb-2">කර්තෘ</label>
                        <input id="f_author" value="${state.user.name || 'Admin'}" class="form-input">
                    </div>
                </div>
            </div>
        `;
    }
    
    modalBody.innerHTML = `
        <form id="dataForm" class="space-y-6">
            ${formFields}
            <div class="flex space-x-3 pt-4">
                <button type="button" onclick="closeModal()" class="flex-1 py-3 border-2 border-gray-200 text-gray-600 font-bold rounded-xl hover:bg-gray-50">
                    අවලංගු කරන්න
                </button>
                <button type="submit" class="flex-1 py-3 bg-gradient-to-r from-brand-gold to-brand-gold2 text-brand-navy font-bold rounded-xl hover:shadow-lg">
                    <i class="fa-solid fa-save mr-2"></i>සුරකින්න
                </button>
            </div>
        </form>
    `;
    
    modal.classList.remove('hidden');
    
    document.getElementById('dataForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        await submitForm(type);
    });
}

async function submitForm(type) {
    const endpoint = type;
    
    try {
        let body = {};
        
        if (type === 'lesson' || type === 'paper' || type === 'video') {
            body = {
                title: document.getElementById('f_title').value,
                description: document.getElementById('f_desc')?.value || '',
                grade_id: parseInt(document.getElementById('f_grade').value),
                subject_id: parseInt(document.getElementById('f_subject').value)
            };
        }
        
        if (type === 'paper') {
            body.paper_type = document.getElementById('f_type').value;
            body.year = parseInt(document.getElementById('f_year').value);

            const pdfInput = document.getElementById('f_pdf');
            if (pdfInput && pdfInput.files.length > 0) {
                const file = pdfInput.files[0];
                
                if (file.size > 50 * 1024 * 1024) {
                    showToast('ෆයිල් එක 50MB ට වඩා විශාලයි', 'error');
                    return;
                }
                
                const formData = new FormData();
                formData.append('file', file);
                
                showToast('PDF එක upload වෙමින්...', 'info');
                
                const uploadRes = await fetch(`${API_BASE}/upload`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${state.token}` },
                    body: formData
                });
                
                if (!uploadRes.ok) {
                    const err = await uploadRes.json().catch(() => ({}));
                    throw new Error('PDF upload failed: ' + (err.error || uploadRes.statusText));
                }
                
                const uploadData = await uploadRes.json();
                
                if (uploadData.file && uploadData.file.url) {
                    body.pdf_file = uploadData.file.url;
                } else {
                    throw new Error('PDF upload response invalid');
                }
            }
        }
        
        if (type === 'video') {
            body.video_url = document.getElementById('f_video_url').value;
        }
        
        if (type === 'article') {
            body = {
                title: document.getElementById('f_title').value,
                description: document.getElementById('f_desc').value,
                content: document.getElementById('f_content').value,
                category: document.getElementById('f_category').value,
                author: document.getElementById('f_author').value
            };
        }
        
        const response = await api(`/resources/${endpoint}`, {
            method: 'POST',
            body: JSON.stringify(body)
        });
        
        showToast('✅ සාර්ථකව එකතු කරන ලදී!', 'success');
        closeModal();
        
        const tabMap = { lesson: 'lessons', paper: 'papers', video: 'videos', article: 'articles' };
        showTab(tabMap[type]);
        
    } catch (err) {
        console.error('Submit error:', err);
        showToast('දෝෂයක්: ' + err.message, 'error');
    }
}

async function deleteItem(type, id) {
    if (!confirm('ඔබට මෙය මකා දැමීමට අවශ්‍යද?')) return;
    
    try {
        await api(`/resources/${type}/${id}`, { method: 'DELETE' });
        showToast('සාර්ථකව මකා දමන ලදී', 'success');
        
        const tabMap = { lesson: 'lessons', paper: 'papers', video: 'videos', article: 'articles' };
        showTab(tabMap[type]);
    } catch (err) {
        showToast('දෝෂයක්: ' + err.message, 'error');
    }
}

function closeModal() {
    document.getElementById('modal').classList.add('hidden');
}

// ============================================
// TOAST
// ============================================
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    const icons = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        info: 'fa-info-circle'
    };
    
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <i class="fa-solid ${icons[type]}"></i>
        <span>${message}</span>
    `;
    
    toast.classList.remove('hidden');
    setTimeout(() => toast.classList.add('hidden'), 3000);
}

// ============================================
// THEME
// ============================================
function toggleTheme() {
    const body = document.body;
    const icon = document.getElementById('themeIcon');
    body.classList.toggle('dark');
    
    if (body.classList.contains('dark')) {
        icon.className = 'fa-solid fa-sun text-brand-navy';
        localStorage.setItem('theme', 'dark');
    } else {
        icon.className = 'fa-solid fa-moon text-brand-navy';
        localStorage.setItem('theme', 'light');
    }
}

function loadTheme() {
    const saved = localStorage.getItem('theme');
    if (saved === 'dark') {
        document.body.classList.add('dark');
        const icon = document.getElementById('themeIcon');
        if (icon) icon.className = 'fa-solid fa-sun text-brand-navy';
    }
}

// ============================================
// SETTINGS
// ============================================
async function renderSettings() {
    const content = document.getElementById('tabContent');
    content.innerHTML = `<div class="text-center py-12"><div class="w-12 h-12 border-4 border-brand-gold border-t-transparent rounded-full animate-spin mx-auto"></div></div>`;
    
    try {
        const settings = await api('/settings');
        
        content.innerHTML = `
            <div class="max-w-4xl mx-auto">
                <div class="mb-6">
                    <h2 class="text-2xl font-black text-brand-navy mb-2">වෙබ් අඩවි සැකසුම්</h2>
                    <p class="text-sm text-gray-500">Social Media සහ වෙබ් අඩවි තොරතුරු</p>
                </div>

                <form id="settingsForm" class="space-y-6">
                    <div class="stat-card">
                        <h3 class="text-lg font-black text-brand-navy mb-4 flex items-center">
                            <i class="fa-solid fa-share-nodes text-brand-gold mr-2"></i>Social Media
                        </h3>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label class="block text-sm font-bold mb-2">
                                    <i class="fa-brands fa-facebook text-blue-600 mr-2"></i>Facebook Page URL
                                </label>
                                <input id="s_facebook" value="${settings.site_facebook || ''}" class="form-input" placeholder="https://facebook.com/yourpage">
                            </div>
                            <div>
                                <label class="block text-sm font-bold mb-2">
                                    <i class="fa-brands fa-youtube text-red-600 mr-2"></i>YouTube Channel URL
                                </label>
                                <input id="s_youtube" value="${settings.site_youtube || ''}" class="form-input" placeholder="https://youtube.com/@yourchannel">
                            </div>
                            <div>
                                <label class="block text-sm font-bold mb-2">
                                    <i class="fa-brands fa-whatsapp text-green-600 mr-2"></i>WhatsApp Number
                                </label>
                                <input id="s_whatsapp" value="${settings.site_whatsapp || ''}" class="form-input" placeholder="+94112345678">
                            </div>
                            <div>
                                <label class="block text-sm font-bold mb-2">
                                    <i class="fa-brands fa-instagram text-pink-600 mr-2"></i>Instagram URL
                                </label>
                                <input id="s_instagram" value="${settings.site_instagram || ''}" class="form-input" placeholder="https://instagram.com/yourpage">
                            </div>
                        </div>
                    </div>

                    <div class="stat-card">
                        <h3 class="text-lg font-black text-brand-navy mb-4 flex items-center">
                            <i class="fa-solid fa-address-card text-brand-gold mr-2"></i>සම්බන්ධතා තොරතුරු
                        </h3>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label class="block text-sm font-bold mb-2">
                                    <i class="fa-solid fa-envelope mr-2"></i>Email
                                </label>
                                <input id="s_email" value="${settings.site_email || ''}" class="form-input" placeholder="info@akurumansala.lk">
                            </div>
                            <div>
                                <label class="block text-sm font-bold mb-2">
                                    <i class="fa-solid fa-phone mr-2"></i>Phone
                                </label>
                                <input id="s_phone" value="${settings.site_phone || ''}" class="form-input" placeholder="+94 11 234 5678">
                            </div>
                            <div class="md:col-span-2">
                                <label class="block text-sm font-bold mb-2">
                                    <i class="fa-solid fa-location-dot mr-2"></i>Address
                                </label>
                                <input id="s_address" value="${settings.site_address || ''}" class="form-input" placeholder="කොළඹ, ශ්‍රී ලංකාව">
                            </div>
                        </div>
                    </div>

                    <div class="flex justify-end">
                        <button type="submit" class="btn-primary text-base px-8 py-4">
                            <i class="fa-solid fa-save mr-2"></i>සියල්ල සුරකින්න
                        </button>
                    </div>
                </form>
            </div>
        `;
        
        document.getElementById('settingsForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            try {
                const data = {
                    site_facebook: document.getElementById('s_facebook').value,
                    site_youtube: document.getElementById('s_youtube').value,
                    site_whatsapp: document.getElementById('s_whatsapp').value,
                    site_instagram: document.getElementById('s_instagram').value,
                    site_email: document.getElementById('s_email').value,
                    site_phone: document.getElementById('s_phone').value,
                    site_address: document.getElementById('s_address').value,
                };
                
                await api('/settings', {
                    method: 'POST',
                    body: JSON.stringify(data)
                });
                
                showToast('සාර්ථකව සුරකින ලදී!', 'success');
            } catch (err) {
                showToast('දෝෂයක්: ' + err.message, 'error');
            }
        });
        
    } catch (err) {
        content.innerHTML = `<div class="text-center py-12 text-red-500">දෝෂයක්: ${err.message}</div>`;
    }
}

// ============================================
// QUIZZES MANAGEMENT
// ============================================
async function renderQuizzes() {
    const content = document.getElementById('tabContent');
    content.innerHTML = `<div class="text-center py-12"><div class="w-12 h-12 border-4 border-brand-gold border-t-transparent rounded-full animate-spin mx-auto"></div></div>`;
    
    try {
        const quizzes = await api('/quizzes');
        
        let html = `
            <div class="flex justify-between items-center mb-6">
                <div class="text-sm text-gray-500">මුළු: <strong>${quizzes.length}</strong> ප්‍රශ්නාවලි</div>
                <button onclick="openQuizForm()" class="btn-primary">
                    <i class="fa-solid fa-plus"></i>
                    <span>නව ප්‍රශ්නාවලියක්</span>
                </button>
            </div>
        `;
        
        if (quizzes.length === 0) {
            html += `
                <div class="stat-card text-center py-16">
                    <i class="fa-solid fa-bullseye text-6xl text-gray-300 mb-4"></i>
                    <p class="text-gray-500 text-lg">ප්‍රශ්නාවලි නොමැත</p>
                    <p class="text-gray-400 text-sm mt-2">පළමු ප්‍රශ්නාවලිය එකතු කරන්න</p>
                </div>
            `;
        } else {
            html += `
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    ${quizzes.map(q => `
                        <div class="stat-card">
                            <div class="flex items-start justify-between mb-3">
                                <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-teal-500 text-white flex items-center justify-center text-xl">
                                    <i class="fa-solid fa-bullseye"></i>
                                </div>
                                <span class="text-xs font-bold px-2 py-1 rounded-full bg-green-100 text-green-600">
                                    ${q.question_count || 0} ප්‍රශ්න
                                </span>
                            </div>
                            <h3 class="font-bold text-brand-navy mb-2">${q.title}</h3>
                            <p class="text-xs text-gray-500 mb-4">
                                ${q.grade_name || ''} ${q.subject_name ? '• ' + q.subject_name : ''}
                            </p>
                            <div class="flex gap-2 pt-3 border-t">
                                <button onclick="deleteQuiz(${q.id})" class="flex-1 py-2 bg-red-500 hover:bg-red-600 text-white font-bold rounded-lg text-xs">
                                    <i class="fa-solid fa-trash mr-1"></i>මකන්න
                                </button>
                                <a href="/quiz.html?id=${q.id}" target="_blank" class="flex-1 py-2 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-lg text-xs text-center">
                                    <i class="fa-solid fa-play mr-1"></i>ක්‍රීඩා කරන්න
                                </a>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
        }
        
        content.innerHTML = html;
    } catch (err) {
        content.innerHTML = `<div class="text-center py-12 text-red-500">දෝෂයක්: ${err.message}</div>`;
    }
}

function openQuizForm() {
    const modal = document.getElementById('modal');
    const modalBody = document.getElementById('modalBody');
    
    document.getElementById('modalTitle').textContent = 'නව ප්‍රශ්නාවලියක්';
    
    const gradeOptions = state.grades.map(g => `<option value="${g.id}">${g.grade_name}</option>`).join('');
    const subjectOptions = state.subjects.map(s => `<option value="${s.id}">${s.subject_name}</option>`).join('');
    
    modalBody.innerHTML = `
        <form id="quizForm" class="space-y-5">
            <div>
                <label class="block text-sm font-bold mb-2">ශීර්ෂය *</label>
                <input id="q_title" required class="form-input" placeholder="ප්‍රශ්නාවලියේ නම">
            </div>
            <div>
                <label class="block text-sm font-bold mb-2">විස්තරය</label>
                <textarea id="q_desc" rows="2" class="form-input" placeholder="කෙටි විස්තරයක්"></textarea>
            </div>
            <div class="grid grid-cols-3 gap-3">
                <div>
                    <label class="block text-sm font-bold mb-2">ශ්‍රේණිය *</label>
                    <select id="q_grade" required class="form-input">${gradeOptions}</select>
                </div>
                <div>
                    <label class="block text-sm font-bold mb-2">විෂය *</label>
                    <select id="q_subject" required class="form-input">${subjectOptions}</select>
                </div>
                <div>
                    <label class="block text-sm font-bold mb-2">කාලය (මිනි)</label>
                    <input type="number" id="q_duration" value="15" class="form-input">
                </div>
            </div>
            
            <div class="pt-4 border-t">
                <h3 class="font-black text-brand-navy mb-4">ප්‍රශ්න</h3>
                <div id="questionsContainer"></div>
                <button type="button" onclick="addQuestion()" class="w-full py-3 border-2 border-dashed border-brand-gold text-brand-gold font-bold rounded-xl hover:bg-brand-gold hover:text-white transition">
                    <i class="fa-solid fa-plus mr-2"></i>ප්‍රශ්නයක් එකතු කරන්න
                </button>
            </div>
            
            <div class="flex space-x-3 pt-4">
                <button type="button" onclick="closeModal()" class="flex-1 py-3 border-2 border-gray-200 text-gray-600 font-bold rounded-xl">
                    අවලංගු කරන්න
                </button>
                <button type="submit" class="flex-1 py-3 bg-gradient-to-r from-brand-gold to-brand-gold2 text-brand-navy font-bold rounded-xl">
                    <i class="fa-solid fa-save mr-2"></i>සුරකින්න
                </button>
            </div>
        </form>
    `;
    
    modal.classList.remove('hidden');
    addQuestion();
    
    document.getElementById('quizForm').addEventListener('submit', submitQuiz);
}

let questionCounter = 0;

function addQuestion() {
    questionCounter++;
    const container = document.getElementById('questionsContainer');
    
    const div = document.createElement('div');
    div.className = 'question-item bg-gray-50 rounded-xl p-4 mb-3';
    div.dataset.qid = questionCounter;
    
    div.innerHTML = `
        <div class="flex justify-between items-center mb-3">
            <span class="font-bold text-brand-navy">ප්‍රශ්නය #${questionCounter}</span>
            <button type="button" onclick="this.closest('.question-item').remove()" class="text-red-500 hover:text-red-700">
                <i class="fa-solid fa-trash"></i>
            </button>
        </div>
        <div class="space-y-3">
            <input class="q-text form-input" placeholder="ප්‍රශ්නය" required>
            <div class="grid grid-cols-2 gap-2">
                <input class="q-a form-input" placeholder="A: පිළිතුර 1" required>
                <input class="q-b form-input" placeholder="B: පිළිතුර 2" required>
                <input class="q-c form-input" placeholder="C: පිළිතුර 3" required>
                <input class="q-d form-input" placeholder="D: පිළිතුර 4" required>
            </div>
            <div class="grid grid-cols-2 gap-2">
                <select class="q-correct form-input">
                    <option value="A">A නිවැරදි</option>
                    <option value="B">B නිවැරදි</option>
                    <option value="C">C නිවැරදි</option>
                    <option value="D">D නිවැරදි</option>
                </select>
                <input class="q-explanation form-input" placeholder="විස්තරය (අවශ්‍ය නැහැ)">
            </div>
        </div>
    `;
    
    container.appendChild(div);
}

async function submitQuiz(e) {
    e.preventDefault();
    
    try {
        const questions = [];
        document.querySelectorAll('.question-item').forEach(item => {
            questions.push({
                question: item.querySelector('.q-text').value,
                option_a: item.querySelector('.q-a').value,
                option_b: item.querySelector('.q-b').value,
                option_c: item.querySelector('.q-c').value,
                option_d: item.querySelector('.q-d').value,
                correct_answer: item.querySelector('.q-correct').value,
                explanation: item.querySelector('.q-explanation').value || null
            });
        });
        
        if (questions.length === 0) {
            showToast('අවම වශයෙන් එක් ප්‍රශ්නයක් එකතු කරන්න', 'error');
            return;
        }
        
        const data = {
            title: document.getElementById('q_title').value,
            description: document.getElementById('q_desc').value,
            grade_id: parseInt(document.getElementById('q_grade').value),
            subject_id: parseInt(document.getElementById('q_subject').value),
            duration_minutes: parseInt(document.getElementById('q_duration').value),
            questions
        };
        
        await api('/quizzes', {
            method: 'POST',
            body: JSON.stringify(data)
        });
        
        showToast('සාර්ථකව එකතු කරන ලදී!', 'success');
        closeModal();
        renderQuizzes();
    } catch (err) {
        showToast('දෝෂයක්: ' + err.message, 'error');
    }
}

async function deleteQuiz(id) {
    if (!confirm('මෙම ප්‍රශ්නාවලිය මකා දැමීමට අවශ්‍යද?')) return;
    
    try {
        await api(`/quizzes/${id}`, { method: 'DELETE' });
        showToast('සාර්ථකව මකා දමන ලදී', 'success');
        renderQuizzes();
    } catch (err) {
        showToast('දෝෂයක්: ' + err.message, 'error');
    }
}

// ============================================
// ACTIVITY LOGS (Developer only)
// ============================================
async function renderLogs() {
    const content = document.getElementById('tabContent');
    
    if (state.user.role !== 'web_developer') {
        content.innerHTML = `
            <div class="stat-card text-center py-16">
                <i class="fa-solid fa-lock text-6xl text-red-300 mb-4"></i>
                <p class="text-red-500 text-lg font-bold">ඔබට මෙම කොටසට ප්‍රවේශය නැත</p>
                <p class="text-gray-500 text-sm mt-2">මෙය බලන්න පුළුවන් Web Developer ට විතරයි</p>
            </div>
        `;
        return;
    }
    
    content.innerHTML = `<div class="text-center py-12"><div class="w-12 h-12 border-4 border-brand-gold border-t-transparent rounded-full animate-spin mx-auto"></div></div>`;
    
    try {
        const data = await api('/auth/logs?limit=200');
        const logs = data.logs || [];

        let html = `
            <div class="flex flex-wrap justify-between items-center gap-3 mb-6">
                <div class="text-sm text-gray-500">
                    මුළු logs: <strong>${logs.length}</strong>
                </div>
                <div class="flex gap-2">
                    <button onclick="renderLogs()" class="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-lg text-xs">
                        <i class="fa-solid fa-refresh mr-1"></i>Refresh
                    </button>
                    <button onclick="clearAllLogs()" class="px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-bold rounded-lg text-xs">
                        <i class="fa-solid fa-trash mr-1"></i>සියල්ල මකන්න
                    </button>
                </div>
            </div>
        `;

        if (logs.length === 0) {
            html += `
                <div class="stat-card text-center py-16">
                    <i class="fa-solid fa-clipboard-list text-6xl text-gray-300 mb-4"></i>
                    <p class="text-gray-500 text-lg">Logs නොමැත</p>
                </div>
            `;
        } else {
            html += `
                <div class="overflow-x-auto">
                    <table class="data-table w-full">
                        <thead>
                            <tr>
                                <th>කාලය</th>
                                <th>පරිශීලක</th>
                                <th>ක්‍රියාව</th>
                                <th>විස්තර</th>
                                <th>තත්ත්වය</th>
                                <th>IP</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${logs.map(log => `
                                <tr>
                                    <td class="text-xs text-gray-500 whitespace-nowrap">${new Date(log.created_at).toLocaleString('si-LK')}</td>
                                    <td class="text-xs">${log.user_email || '-'}</td>
                                    <td>
                                        <span class="px-2 py-1 rounded text-xs font-bold ${
                                            log.action.includes('login_success') ? 'bg-green-100 text-green-700' :
                                            log.action.includes('login_failed') ? 'bg-red-100 text-red-700' :
                                            log.action.includes('register') ? 'bg-blue-100 text-blue-700' :
                                            log.action.includes('otp') ? 'bg-purple-100 text-purple-700' :
                                            log.action.includes('password') ? 'bg-yellow-100 text-yellow-700' :
                                            'bg-gray-100 text-gray-700'
                                        }">
                                            ${log.action}
                                        </span>
                                    </td>
                                    <td class="text-xs text-gray-600">${log.details || '-'}</td>
                                    <td>
                                        <span class="px-2 py-1 rounded text-xs font-bold ${
                                            log.status === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                        }">
                                            ${log.status}
                                        </span>
                                    </td>
                                    <td class="text-xs text-gray-500">${log.ip_address || '-'}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        }

        content.innerHTML = html;
    } catch (err) {
        content.innerHTML = `<div class="text-center py-12 text-red-500">දෝෂයක්: ${err.message}</div>`;
    }
}

async function clearAllLogs() {
    if (!confirm('සියලු logs මකා දැමීමට අවශ්‍යද?')) return;
    try {
        await api('/auth/logs', { method: 'DELETE' });
        showToast('සියලු logs මකා දමන ලදී', 'success');
        renderLogs();
    } catch (err) {
        showToast('දෝෂයක්: ' + err.message, 'error');
    }
}

console.log('✅ admin.js loaded');

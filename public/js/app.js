// ============================================
// AKURU MANSALA - MAIN APP JAVASCRIPT
// ============================================

const API_BASE = '/api';

document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 App initializing...');
    
    try { loadTheme(); } catch (e) { console.error('Theme error:', e); }
    
    try { await loadStats(); } catch (e) { console.error('Stats error:', e); }
    try { await loadSettings(); } catch (e) { console.error('Settings error:', e); }
    try { await renderResources(); } catch (e) { console.error('Resources error:', e); }
    
    console.log('✅ App ready');
});

// ============================================
// LOAD STATS
// ============================================
async function loadStats() {
    try {
        const res = await fetch(`${API_BASE}/resources/stats`);
        if (!res.ok) return;
        
        const stats = await res.json();
        
        const statLessons = document.getElementById('statLessons');
        const statPapers = document.getElementById('statPapers');
        const statVideos = document.getElementById('statVideos');
        
        if (statLessons) statLessons.textContent = stats.total_lessons || 0;
        if (statPapers) statPapers.textContent = stats.total_papers || 0;
        if (statVideos) statVideos.textContent = stats.total_videos || 0;
        
        console.log('✅ Stats loaded');
    } catch (err) {
        console.error('Stats error:', err);
    }
}

// ============================================
// LOAD SETTINGS
// ============================================
async function loadSettings() {
    try {
        const res = await fetch(`${API_BASE}/settings`);
        if (!res.ok) return;
        
        const settings = await res.json();
        if (!settings || typeof settings !== 'object') return;
        
        if (settings.site_facebook) {
            document.querySelectorAll('a').forEach(el => {
                if (el.querySelector('.fa-facebook-f')) {
                    el.href = settings.site_facebook;
                    el.target = '_blank';
                }
            });
        }
        
        if (settings.site_youtube) {
            document.querySelectorAll('a').forEach(el => {
                if (el.querySelector('.fa-youtube')) {
                    el.href = settings.site_youtube;
                    el.target = '_blank';
                }
            });
        }
        
        if (settings.site_whatsapp) {
            const phone = settings.site_whatsapp.replace(/[^0-9]/g, '');
            document.querySelectorAll('a').forEach(el => {
                if (el.querySelector('.fa-whatsapp')) {
                    el.href = 'https://wa.me/' + phone;
                    el.target = '_blank';
                }
            });
        }
        
        console.log('✅ Settings loaded');
    } catch (err) {
        console.error('Settings error:', err);
    }
}

// ============================================
// RENDER RESOURCES
// ============================================
async function renderResources() {
    const grid = document.getElementById('resourceGrid');
    if (!grid) return;
    
    grid.innerHTML = `<div class="col-span-3 text-center py-8"><div class="w-12 h-12 border-4 border-brand-gold border-t-transparent rounded-full animate-spin mx-auto"></div></div>`;
    
    try {
        const res = await fetch(`${API_BASE}/resources/stats`);
        if (!res.ok) throw new Error('Failed to load');
        
        const stats = await res.json();
        
        const cards = [
            { title: 'පාඩම්', desc: 'විෂය අනුව සකස් කළ පාඩම්', count: stats.total_lessons || 0, color: '#3b82f6', icon: 'fa-book-open', link: '/resources.html' },
            { title: 'විෂය සටහන්', desc: 'කෙටි, පැහැදිලි සටහන්', count: 0, color: '#a855f7', icon: 'fa-pen-to-square', link: '/resources.html' },
            { title: 'ප්‍රශ්න පත්‍ර', desc: 'පාසල් පරීක්ෂණ සහ පුහුණු පත්‍ර', count: stats.total_papers || 0, color: '#ec4899', icon: 'fa-file-lines', link: '/papers.html' },
            { title: 'වීඩියෝ පාඩම්', desc: 'දෘශ්‍යමය ඉගෙනුම්', count: stats.total_videos || 0, color: '#dc2626', icon: 'fa-video', link: '/videos.html' },
            { title: 'ලිපි', desc: 'අධ්‍යාපනික ලිපි', count: stats.total_articles || 0, color: '#14b8a6', icon: 'fa-newspaper', link: '/resources.html' },
            { title: 'ප්‍රශ්නාවලි', desc: 'Online quizzes', count: 0, color: '#10b981', icon: 'fa-bullseye', link: '/quizzes.html' },
        ];

        grid.innerHTML = cards.map(card => `
            <div class="resource-card">
                <div class="resource-icon" style="background: linear-gradient(135deg, ${card.color}, ${card.color}dd);">
                    <i class="fa-solid ${card.icon}"></i>
                </div>
                <h3 class="text-xl font-black text-brand-navy dark:text-white mb-2">${card.title}</h3>
                <p class="text-gray-600 dark:text-gray-400 text-sm mb-5 flex-1">${card.desc}</p>
                <div class="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-700">
                    <span class="text-xs font-bold text-gray-500 bg-gray-100 dark:bg-gray-800 px-4 py-1.5 rounded-full">${card.count} සම්පත්</span>
                    <a href="${card.link}" class="px-5 py-2.5 text-white text-xs font-bold rounded-xl hover:scale-105 transition" style="background: ${card.color};">
                        බලන්න
                    </a>
                </div>
            </div>
        `).join('');
        
        console.log('✅ Resources rendered');
    } catch (err) {
        console.error('Resources error:', err);
        grid.innerHTML = `<div class="col-span-3 text-center py-12"><p class="text-gray-500">සම්පත් පූරණය කිරීමේ දෝෂයක්</p></div>`;
    }
}

// ============================================
// THEME
// ============================================
function toggleTheme() {
    const body = document.body;
    const icon = document.getElementById('themeIcon');
    body.classList.toggle('dark');
    
    if (body.classList.contains('dark')) {
        if (icon) icon.className = 'fa-solid fa-sun';
        localStorage.setItem('theme', 'dark');
    } else {
        if (icon) icon.className = 'fa-solid fa-moon';
        localStorage.setItem('theme', 'light');
    }
}

function loadTheme() {
    const saved = localStorage.getItem('theme');
    if (saved === 'dark') {
        document.body.classList.add('dark');
        const icon = document.getElementById('themeIcon');
        if (icon) icon.className = 'fa-solid fa-sun';
    }
}

// ============================================
// MOBILE MENU
// ============================================
function toggleMobileMenu() {
    const menu = document.getElementById('mobileMenu');
    if (menu) menu.classList.toggle('hidden');
}

// ============================================
// BACK TO TOP
// ============================================
function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

window.addEventListener('scroll', () => {
    const btn = document.getElementById('backToTop');
    if (btn) {
        if (window.scrollY > 500) {
            btn.classList.remove('hidden');
            btn.classList.add('flex');
        } else {
            btn.classList.add('hidden');
            btn.classList.remove('flex');
        }
    }
});

console.log('✅ app.js loaded');
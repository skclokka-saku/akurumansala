// ============================================
// AKURU MANSALA - RESOURCES PAGE JAVASCRIPT
// ============================================

const API_BASE = '/api';

document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Resources page initializing...');
    
    await loadGrades();
    await loadSubjects();
    await loadResources();
    
    // Add event listeners
    document.getElementById('searchInput')?.addEventListener('input', debounce(loadResources, 500));
    document.getElementById('filterGrade')?.addEventListener('change', loadResources);
    document.getElementById('filterSubject')?.addEventListener('change', loadResources);
    document.getElementById('filterType')?.addEventListener('change', loadResources);
    
    console.log('✅ Resources page ready');
});

// ============================================
// DEBOUNCE
// ============================================
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// ============================================
// LOAD GRADES
// ============================================
async function loadGrades() {
    try {
        const grades = await fetch(`${API_BASE}/grades`).then(r => r.json());
        const select = document.getElementById('filterGrade');
        if (!select) return;
        
        grades.forEach(g => {
            const option = document.createElement('option');
            option.value = g.id;
            option.textContent = g.grade_name;
            select.appendChild(option);
        });
    } catch (err) {
        console.error('Load grades error:', err);
    }
}

// ============================================
// LOAD SUBJECTS
// ============================================
async function loadSubjects() {
    try {
        const subjects = await fetch(`${API_BASE}/subjects`).then(r => r.json());
        const select = document.getElementById('filterSubject');
        if (!select) return;
        
        subjects.forEach(s => {
            const option = document.createElement('option');
            option.value = s.id;
            option.textContent = s.subject_name;
            select.appendChild(option);
        });
    } catch (err) {
        console.error('Load subjects error:', err);
    }
}

// ============================================
// LOAD RESOURCES
// ============================================
async function loadResources() {
    const grid = document.getElementById('resourcesGrid');
    if (!grid) return;
    
    grid.innerHTML = `<div class="col-span-3 text-center py-12">
        <div class="w-12 h-12 border-4 border-brand-gold border-t-transparent rounded-full animate-spin mx-auto"></div>
    </div>`;
    
    try {
        const search = document.getElementById('searchInput')?.value || '';
        const gradeId = document.getElementById('filterGrade')?.value || '';
        const subjectId = document.getElementById('filterSubject')?.value || '';
        const type = document.getElementById('filterType')?.value || 'lesson';
        
        const params = new URLSearchParams();
        if (type) params.append('type', type);
        if (gradeId) params.append('grade_id', gradeId);
        if (subjectId) params.append('subject_id', subjectId);
        if (search) params.append('search', search);
        params.append('limit', '50');
        
        const data = await fetch(`${API_BASE}/resources?${params}`).then(r => r.json());
        
        let items = [];
        if (type === 'lesson' || !type) items = items.concat(data.lessons || []);
        if (type === 'note' || !type) items = items.concat(data.notes || []);
        if (type === 'article' || !type) items = items.concat(data.articles || []);
        
        if (items.length === 0) {
            grid.innerHTML = `<div class="col-span-3 text-center py-16">
                <i class="fa-solid fa-inbox text-6xl text-gray-300 mb-4"></i>
                <p class="text-gray-500 text-lg">සම්පත් හමු නොවීය</p>
                <p class="text-gray-400 text-sm mt-2">වෙනත් සෙවුම් නිර්ණායක උත්සාහ කරන්න</p>
            </div>`;
            return;
        }
        
        const typeIcons = {
            lesson: { icon: 'fa-book-open', color: '#3b82f6', label: 'පාඩම' },
            note: { icon: 'fa-pen-to-square', color: '#a855f7', label: 'සටහන' },
            article: { icon: 'fa-newspaper', color: '#14b8a6', label: 'ලිපිය' }
        };
        
        grid.innerHTML = items.map(item => {
            const typeInfo = typeIcons[item._type] || typeIcons.lesson;
            const itemType = item._type || (item.content && !item.grade_id ? 'article' : 'lesson');
            const info = typeIcons[itemType] || typeIcons.lesson;
            
            return `
                <div class="resource-card">
                    <div class="flex items-start justify-between mb-4">
                        <div class="w-14 h-14 rounded-xl flex items-center justify-center text-white text-xl" 
                             style="background: linear-gradient(135deg, ${info.color}, ${info.color}dd);">
                            <i class="fa-solid ${info.icon}"></i>
                        </div>
                        <span class="text-xs font-bold px-3 py-1 rounded-full" 
                              style="background: ${info.color}20; color: ${info.color};">
                            ${info.label}
                        </span>
                    </div>
                    
                    <h3 class="text-lg font-black text-brand-navy mb-2">${item.title}</h3>
                    <p class="text-sm text-gray-500 mb-4 flex-1">${item.description || 'විස්තරයක් නොමැත'}</p>
                    
                    <div class="flex items-center justify-between pt-4 border-t border-gray-100">
                        <div class="text-xs text-gray-400">
                            ${item.grade_name ? `<i class="fa-solid fa-graduation-cap mr-1"></i>${item.grade_name}` : ''}
                            ${item.subject_name ? `<span class="mx-1">•</span><i class="fa-solid fa-book mr-1"></i>${item.subject_name}` : ''}
                        </div>
                        <a href="#" onclick="viewResource(${item.id}, '${itemType}')" 
                           class="text-brand-gold font-bold text-sm hover:underline">
                            බලන්න →
                        </a>
                    </div>
                </div>
            `;
        }).join('');
        
    } catch (err) {
        console.error('Load resources error:', err);
        grid.innerHTML = `<div class="col-span-3 text-center py-12 text-red-500">දෝෂයක්: ${err.message}</div>`;
    }
}

// ============================================
// VIEW RESOURCE
// ============================================
function viewResource(id, type) {
    alert(`සම්පත #${id} (${type})\n\nමෙය ඉක්මනින් සම්පූර්ණ කරනු ලැබේ.`);
}

console.log('✅ resources.js loaded');
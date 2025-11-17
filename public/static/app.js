// Global state
let token = localStorage.getItem('token');
let currentView = 'feed';
let currentUser = null;

const API_BASE = '/api';

// Toast notification system
function showToast(message, type = 'success') {
    const toastContainer = document.getElementById('toast-container');
    const toast = document.createElement('div');
    
    const icons = {
        success: '✓',
        error: '✕',
        warning: '⚠',
        info: 'ℹ'
    };
    
    const colors = {
        success: 'from-green-500 to-emerald-600',
        error: 'from-red-500 to-rose-600',
        warning: 'from-yellow-500 to-orange-600',
        info: 'from-blue-500 to-cyan-600'
    };
    
    toast.className = `transform transition-all duration-300 ease-out bg-gradient-to-r ${colors[type]} text-white px-6 py-4 rounded-lg shadow-2xl flex items-center space-x-3 min-w-[300px] animate-slide-in`;
    toast.innerHTML = `
        <div class="text-2xl">${icons[type]}</div>
        <div class="flex-1 font-medium">${message}</div>
        <button onclick="this.parentElement.remove()" class="text-white hover:text-gray-200">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    toastContainer.appendChild(toast);
    
    // Auto remove after 3 seconds
    setTimeout(() => {
        toast.classList.add('opacity-0', 'translate-x-full');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Loading overlay
function showLoading() {
    document.getElementById('loading-overlay').classList.remove('hidden');
}

function hideLoading() {
    document.getElementById('loading-overlay').classList.add('hidden');
}

// Button loading state
function setButtonLoading(buttonId, loading = true) {
    const button = document.getElementById(buttonId);
    if (!button) return;
    
    if (loading) {
        button.disabled = true;
        button.dataset.originalText = button.innerHTML;
        button.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>처리 중...';
    } else {
        button.disabled = false;
        button.innerHTML = button.dataset.originalText || button.innerHTML;
    }
}

// Axios config
axios.defaults.headers.common['Authorization'] = token ? `Bearer ${token}` : '';

// Theme management
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeIcon(newTheme);
    
    showToast(newTheme === 'dark' ? '다크 모드로 변경되었습니다 🌙' : '라이트 모드로 변경되었습니다 ☀️', 'info');
}

function updateThemeIcon(theme) {
    const icon = document.getElementById('theme-icon');
    if (icon) {
        icon.className = theme === 'dark' ? 'fas fa-sun text-xl text-gray-300' : 'fas fa-moon text-xl text-gray-700';
    }
}

// Initialize app
document.addEventListener('DOMContentLoaded', async () => {
    initTheme();
    
    if (token) {
        await loadCurrentUser();
        if (currentUser) {
            showView('feed');
            await loadFeed();
        } else {
            showView('auth');
        }
    } else {
        showView('auth');
    }
    
    setupEventListeners();
    registerServiceWorker();
    showInstallPrompt();
});

// Register Service Worker for PWA
async function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        try {
            const registration = await navigator.serviceWorker.register('/sw.js');
            console.log('Service Worker registered:', registration);
        } catch (error) {
            console.log('Service Worker registration failed:', error);
        }
    }
}

// PWA Install Prompt
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
});

function showInstallPrompt() {
    // Show install button if PWA is installable
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        
        // Could show a custom install button here
        console.log('PWA is installable');
    });
}

// Setup event listeners
function setupEventListeners() {
    // Auth tabs
    document.getElementById('tab-login')?.addEventListener('click', () => showAuthTab('login'));
    document.getElementById('tab-signup')?.addEventListener('click', () => showAuthTab('signup'));
    
    // Auth forms
    document.getElementById('login-form')?.addEventListener('submit', handleLogin);
    document.getElementById('signup-form')?.addEventListener('submit', handleSignup);
    
    // Navigation
    document.addEventListener('click', (e) => {
        // Desktop nav
        if (e.target.id === 'nav-feed') showView('feed');
        if (e.target.id === 'nav-stats') showView('stats');
        if (e.target.id === 'nav-weight') showView('weight');
        if (e.target.id === 'nav-logout') handleLogout();
        if (e.target.id === 'nav-edit-profile') showEditProfileModal();
        
        // Mobile nav
        if (e.target.closest('#mobile-nav-feed')) showView('feed');
        if (e.target.closest('#mobile-nav-stats')) showView('stats');
        if (e.target.closest('#mobile-nav-weight')) showView('weight');
        if (e.target.closest('#mobile-nav-add')) showView('add-workout');
        if (e.target.closest('#mobile-nav-profile')) showEditProfileModal();
        
        // Buttons
        if (e.target.id === 'btn-add-workout') showView('add-workout');
        if (e.target.id === 'btn-cancel-workout') showView('feed');
        if (e.target.id === 'btn-clear-form') clearWorkoutForm();
        if (e.target.id === 'btn-add-weight') showAddWeightModal();
        if (e.target.id === 'close-weight-modal') hideAddWeightModal();
        if (e.target.id === 'cancel-weight-modal') hideAddWeightModal();
        if (e.target.id === 'close-profile-modal') hideEditProfileModal();
        if (e.target.id === 'cancel-profile-modal') hideEditProfileModal();
    });
    
    // Add workout form
    document.getElementById('add-workout-form')?.addEventListener('submit', handleAddWorkout);
    
    // Add weight form
    document.getElementById('add-weight-form')?.addEventListener('submit', handleAddWeight);
    
    // Edit profile form
    document.getElementById('edit-profile-form')?.addEventListener('submit', handleEditProfile);
    
    // Set default datetime
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    document.getElementById('workout-started').value = now.toISOString().slice(0, 16);
    
    // Set default date for weight
    const today = new Date().toISOString().split('T')[0];
    if (document.getElementById('weight-date')) {
        document.getElementById('weight-date').value = today;
    }
    
    // Image preview
    const imageInput = document.getElementById('workout-images');
    if (imageInput) {
        imageInput.addEventListener('change', handleImagePreview);
    }
    
    // Theme toggle
    document.getElementById('theme-toggle')?.addEventListener('click', toggleTheme);
}

// Image preview and compression
async function handleImagePreview(e) {
    const files = Array.from(e.target.files).slice(0, 3);
    const previewContainer = document.getElementById('image-preview');
    previewContainer.innerHTML = '';
    
    for (const file of files) {
        if (file.size > 5 * 1024 * 1024) {
            showToast(`${file.name}이(가) 너무 큽니다. 5MB 이하로 선택해주세요.`, 'warning');
            continue;
        }
        
        // Create preview
        const reader = new FileReader();
        reader.onload = (event) => {
            const div = document.createElement('div');
            div.className = 'relative group';
            div.innerHTML = `
                <img src="${event.target.result}" class="w-full h-24 object-cover rounded-lg border border-dark-border">
                <button type="button" onclick="removeImage(this)" 
                    class="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                    <i class="fas fa-times text-xs"></i>
                </button>
                <div class="absolute bottom-1 left-1 bg-black bg-opacity-60 text-white text-xs px-2 py-1 rounded">
                    ${(file.size / 1024).toFixed(0)}KB
                </div>
            `;
            previewContainer.appendChild(div);
        };
        reader.readAsDataURL(file);
    }
}

function removeImage(button) {
    button.parentElement.remove();
    // Reset file input if no images left
    const previewContainer = document.getElementById('image-preview');
    if (previewContainer.children.length === 0) {
        document.getElementById('workout-images').value = '';
    }
}

// Auth functions
function showAuthTab(tab) {
    const loginTab = document.getElementById('tab-login');
    const signupTab = document.getElementById('tab-signup');
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');
    
    if (tab === 'login') {
        loginTab.classList.add('text-blue-600', 'border-b-2', 'border-blue-600');
        loginTab.classList.remove('text-gray-600');
        signupTab.classList.add('text-gray-600');
        signupTab.classList.remove('text-blue-600', 'border-b-2', 'border-blue-600');
        loginForm.classList.remove('hidden');
        signupForm.classList.add('hidden');
    } else {
        signupTab.classList.add('text-blue-600', 'border-b-2', 'border-blue-600');
        signupTab.classList.remove('text-gray-600');
        loginTab.classList.add('text-gray-600');
        loginTab.classList.remove('text-blue-600', 'border-b-2', 'border-blue-600');
        signupForm.classList.remove('hidden');
        loginForm.classList.add('hidden');
    }
}

async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    
    showLoading();
    try {
        const response = await axios.post(`${API_BASE}/auth/login`, { email, password });
        token = response.data.token;
        currentUser = response.data.user;
        localStorage.setItem('token', token);
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        
        hideLoading();
        showToast('로그인 성공! 환영합니다 🎉', 'success');
        showView('feed');
        await loadFeed();
    } catch (error) {
        hideLoading();
        showToast('로그인 실패: ' + (error.response?.data?.error || '이메일 또는 비밀번호를 확인해주세요'), 'error');
        showError('로그인 실패: ' + (error.response?.data?.error || error.message));
    }
}

async function handleSignup(e) {
    e.preventDefault();
    const name = document.getElementById('signup-name').value;
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    const height_cm = document.getElementById('signup-height').value;
    
    showLoading();
    try {
        const response = await axios.post(`${API_BASE}/auth/signup`, { 
            name, email, password, height_cm: height_cm ? parseInt(height_cm) : null 
        });
        token = response.data.token;
        currentUser = response.data.user;
        localStorage.setItem('token', token);
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        
        hideLoading();
        showToast('회원가입 완료! 환영합니다 🎉', 'success');
        showView('feed');
        await loadFeed();
    } catch (error) {
        hideLoading();
        showToast('회원가입 실패: ' + (error.response?.data?.error || error.message), 'error');
        showError('회원가입 실패: ' + (error.response?.data?.error || error.message));
    }
}

function handleLogout() {
    token = null;
    currentUser = null;
    localStorage.removeItem('token');
    axios.defaults.headers.common['Authorization'] = '';
    showView('auth');
}

async function loadCurrentUser() {
    try {
        const response = await axios.get(`${API_BASE}/auth/me`);
        currentUser = response.data.user;
    } catch (error) {
        console.error('Failed to load user:', error);
        currentUser = null;
        token = null;
        localStorage.removeItem('token');
    }
}

// View management
function showView(view) {
    currentView = view;
    
    // Hide all views
    document.getElementById('auth-view').classList.add('hidden');
    document.getElementById('feed-view').classList.add('hidden');
    document.getElementById('add-workout-view').classList.add('hidden');
    document.getElementById('stats-view').classList.add('hidden');
    document.getElementById('weight-view').classList.add('hidden');
    
    // Show selected view
    document.getElementById(`${view}-view`)?.classList.remove('hidden');
    
    // Update navigation (desktop and mobile)
    updateNavigation();
    updateMobileNavigation();
    
    // Scroll to top
    window.scrollTo(0, 0);
    
    // Load data for view
    if (view === 'feed') loadFeed();
    if (view === 'stats') loadStats();
    if (view === 'weight') loadWeight();
    if (view === 'add-workout') loadWorkoutTemplates();
}

// Workout templates - 인기 운동 위주
const workoutTemplates = [
    { type: 'RUN', emoji: '🏃', name: '러닝', distance: 5, duration: 30 },
    { type: 'TREADMILL', emoji: '🏃‍♂️', name: '런닝머신', distance: 5, duration: 30 },
    { type: 'INDOOR_BIKE', emoji: '🚴‍♀️', name: '실내사이클', distance: 10, duration: 40 },
    { type: 'STEPPER', emoji: '🪜', name: '스텝퍼', distance: 0, duration: 30 },
    { type: 'HOME_TRAINING', emoji: '💪', name: '홈트', distance: 0, duration: 40 },
    { type: 'WEIGHT', emoji: '🏋️', name: '웨이트', distance: 0, duration: 60 },
    { type: 'BADMINTON', emoji: '🏸', name: '배드민턴', distance: 0, duration: 60 },
    { type: 'WALK', emoji: '🚶', name: '걷기', distance: 3, duration: 40 }
];

function loadWorkoutTemplates() {
    const container = document.getElementById('workout-templates');
    container.innerHTML = workoutTemplates.map(template => `
        <button type="button" onclick="applyTemplate('${template.type}')" 
            class="stat-card rounded-lg p-3 text-center hover:scale-105 transition-transform">
            <div class="text-2xl mb-1">${template.emoji}</div>
            <div class="text-xs text-gray-300 font-medium">${template.name}</div>
        </button>
    `).join('');
}

function applyTemplate(type) {
    const template = workoutTemplates.find(t => t.type === type);
    if (!template) return;
    
    document.getElementById('workout-type').value = type;
    if (template.distance > 0) {
        document.getElementById('workout-distance').value = template.distance;
    }
    document.getElementById('workout-duration').value = template.duration;
    
    // Scroll to form
    document.getElementById('add-workout-form').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function clearWorkoutForm() {
    document.getElementById('add-workout-form').reset();
    document.getElementById('image-preview').innerHTML = '';
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    document.getElementById('workout-started').value = now.toISOString().slice(0, 16);
}

function updateMobileNavigation() {
    // Remove active class from all mobile nav items
    document.querySelectorAll('.mobile-nav-item').forEach(item => {
        item.classList.remove('active', 'text-accent-blue');
        item.classList.add('text-gray-400');
    });
    
    // Add active class to current view
    let activeNavId = null;
    if (currentView === 'feed') activeNavId = 'mobile-nav-feed';
    if (currentView === 'stats') activeNavId = 'mobile-nav-stats';
    if (currentView === 'weight') activeNavId = 'mobile-nav-weight';
    if (currentView === 'add-workout') activeNavId = 'mobile-nav-add';
    
    if (activeNavId) {
        const activeNav = document.getElementById(activeNavId);
        if (activeNav) {
            activeNav.classList.add('active');
            activeNav.classList.remove('text-gray-400');
        }
    }
}

function updateNavigation() {
    const navMenu = document.getElementById('nav-menu');
    
    if (currentUser) {
        navMenu.innerHTML = `
            <button id="nav-feed" class="nav-link font-medium ${currentView === 'feed' ? 'text-blue-600' : 'text-gray-600'}">
                <i class="fas fa-home mr-1"></i>피드
            </button>
            <button id="nav-stats" class="nav-link font-medium ${currentView === 'stats' ? 'text-blue-600' : 'text-gray-600'}">
                <i class="fas fa-chart-line mr-1"></i>통계
            </button>
            <button id="nav-weight" class="nav-link font-medium ${currentView === 'weight' ? 'text-blue-600' : 'text-gray-600'}">
                <i class="fas fa-weight mr-1"></i>체중
            </button>
            <div class="flex items-center space-x-3 ml-4 pl-4 border-l">
                <span class="text-sm text-gray-600">${currentUser.name}</span>
                <button id="nav-edit-profile" class="text-sm text-blue-600 hover:text-blue-700">
                    <i class="fas fa-user-edit"></i>
                </button>
                <button id="nav-logout" class="text-sm text-red-600 hover:text-red-700">로그아웃</button>
            </div>
        `;
    } else {
        navMenu.innerHTML = '';
    }
}

// Feed functions
async function loadFeed() {
    try {
        const response = await axios.get(`${API_BASE}/workouts/feed`);
        const workouts = response.data;
        
        const feedContainer = document.getElementById('feed-container');
        
        if (workouts.length === 0) {
            feedContainer.innerHTML = `
                <div class="bg-white rounded-lg shadow-md p-8 text-center text-gray-500">
                    <i class="fas fa-inbox text-4xl mb-4"></i>
                    <p>아직 운동 기록이 없습니다. 첫 운동을 기록해보세요!</p>
                </div>
            `;
            return;
        }
        
        feedContainer.innerHTML = workouts.map(workout => `
            <div class="workout-card bg-dark-card rounded-xl shadow-lg p-4 md:p-6 border border-dark-border">
                <div class="flex items-start justify-between mb-4">
                    <div class="flex items-center space-x-2 md:space-x-3">
                        <div class="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-accent-blue to-accent-green rounded-full flex items-center justify-center">
                            <span class="text-white font-bold text-sm md:text-base">${workout.user.name[0]}</span>
                        </div>
                        <div>
                            <div class="font-semibold text-gray-200 text-sm md:text-base">${workout.user.name}</div>
                            <div class="text-xs md:text-sm text-gray-400">${formatDate(workout.created_at)}</div>
                        </div>
                    </div>
                    <div class="flex items-center space-x-2 md:space-x-3">
                        <div class="text-xl md:text-2xl">${getWorkoutEmoji(workout.workout_type)}</div>
                        ${workout.user.id === currentUser.id ? `
                            <div class="relative">
                                <button onclick="toggleWorkoutMenu('${workout.id}')" class="text-gray-400 hover:text-accent-blue text-sm md:text-base">
                                    <i class="fas fa-ellipsis-v"></i>
                                </button>
                                <div id="menu-${workout.id}" class="hidden absolute right-0 mt-2 w-32 md:w-48 bg-dark-bg rounded-lg shadow-xl z-10 border border-dark-border">
                                    <button onclick="deleteWorkout('${workout.id}')" class="w-full text-left px-3 md:px-4 py-2 text-red-400 hover:bg-dark-card rounded-lg text-sm md:text-base">
                                        <i class="fas fa-trash mr-1 md:mr-2"></i>삭제
                                    </button>
                                </div>
                            </div>
                        ` : ''}
                    </div>
                </div>
                
                <div class="mb-4">
                    <div class="text-base md:text-lg font-bold text-accent-blue mb-3">${getWorkoutTypeName(workout.workout_type)}</div>
                    <div class="grid grid-cols-2 md:flex md:flex-wrap gap-2 md:gap-4 text-xs md:text-sm text-gray-300">
                        ${workout.distance_km ? `<div class="flex items-center"><i class="fas fa-route mr-1 text-accent-blue"></i>${workout.distance_km} km</div>` : ''}
                        <div class="flex items-center"><i class="fas fa-clock mr-1 text-accent-green"></i>${workout.duration_min} 분</div>
                        ${workout.pace_sec_per_km ? `<div class="flex items-center"><i class="fas fa-tachometer-alt mr-1 text-accent-purple"></i>${formatPace(workout.pace_sec_per_km)}</div>` : ''}
                        ${workout.calories ? `<div class="flex items-center"><i class="fas fa-fire mr-1 text-accent-orange"></i>${workout.calories} kcal</div>` : ''}
                    </div>
                    ${workout.memo ? `<p class="mt-3 text-gray-300 text-sm md:text-base">${workout.memo}</p>` : ''}
                    ${workout.images && workout.images.length > 0 ? `
                        <div class="mt-3 grid ${workout.images.length === 1 ? 'grid-cols-1' : 'grid-cols-2 md:grid-cols-3'} gap-2">
                            ${workout.images.map(img => `
                                <img src="${img}" alt="운동 이미지" class="rounded-lg object-cover w-full h-32 md:h-48 cursor-pointer border border-dark-border" onclick="window.open('${img}', '_blank')">
                            `).join('')}
                        </div>
                    ` : ''}
                </div>
                
                <div class="flex items-center space-x-4 md:space-x-6 pt-3 border-t border-dark-border">
                    <button onclick="toggleLike('${workout.id}')" class="flex items-center space-x-2 text-gray-400 hover:text-red-400 transition text-sm md:text-base">
                        <i class="fa${workout.liked_by_me ? 's' : 'r'} fa-heart ${workout.liked_by_me ? 'text-red-400' : ''}"></i>
                        <span id="likes-${workout.id}">${workout.likes_count}</span>
                    </button>
                    <button onclick="toggleComments('${workout.id}')" class="flex items-center space-x-2 text-gray-400 hover:text-accent-blue transition text-sm md:text-base">
                        <i class="far fa-comment"></i>
                        <span id="comments-count-${workout.id}">${workout.comments_count}</span>
                    </button>
                </div>
                
                <!-- Comments Section -->
                <div id="comments-${workout.id}" class="hidden mt-4 pt-4 border-t border-dark-border">
                    <div id="comments-list-${workout.id}" class="space-y-3 mb-4">
                        <!-- Comments will be loaded here -->
                    </div>
                    <form onsubmit="addComment(event, '${workout.id}')" class="flex space-x-2">
                        <input type="text" id="comment-input-${workout.id}" 
                            placeholder="댓글을 입력하세요..." 
                            class="flex-1 px-3 py-2 bg-dark-bg border border-dark-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-accent-blue text-gray-200"
                            required>
                        <button type="submit" class="px-4 py-2 bg-accent-blue text-white rounded-lg text-sm font-medium hover:bg-opacity-90 transition">
                            <i class="fas fa-paper-plane"></i>
                        </button>
                    </form>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Failed to load feed:', error);
        showError('피드를 불러오는데 실패했습니다.');
    }
}

// Comments functions
async function toggleComments(workoutId) {
    const commentsSection = document.getElementById(`comments-${workoutId}`);
    const isHidden = commentsSection.classList.contains('hidden');
    
    if (isHidden) {
        commentsSection.classList.remove('hidden');
        await loadComments(workoutId);
    } else {
        commentsSection.classList.add('hidden');
    }
}

async function loadComments(workoutId) {
    try {
        const response = await axios.get(`${API_BASE}/workouts/${workoutId}/comments`);
        const comments = response.data;
        
        const commentsList = document.getElementById(`comments-list-${workoutId}`);
        
        if (comments.length === 0) {
            commentsList.innerHTML = '<p class="text-gray-400 text-sm text-center py-2">첫 댓글을 작성해보세요!</p>';
            return;
        }
        
        commentsList.innerHTML = comments.map(comment => `
            <div class="flex items-start space-x-2">
                <div class="w-8 h-8 bg-gradient-to-br from-accent-green to-accent-blue rounded-full flex items-center justify-center flex-shrink-0">
                    <span class="text-white text-xs font-bold">${comment.user.name[0]}</span>
                </div>
                <div class="flex-1">
                    <div class="flex items-center space-x-2 mb-1">
                        <span class="text-sm font-medium text-gray-200">${comment.user.name}</span>
                        <span class="text-xs text-gray-400">${formatDate(comment.created_at)}</span>
                        ${comment.user.id === currentUser.id ? `
                            <button onclick="deleteComment('${workoutId}', '${comment.id}')" 
                                class="text-xs text-red-400 hover:text-red-300">
                                <i class="fas fa-trash"></i>
                            </button>
                        ` : ''}
                    </div>
                    <p class="text-sm text-gray-300">${comment.text}</p>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Failed to load comments:', error);
    }
}

async function addComment(event, workoutId) {
    event.preventDefault();
    
    const input = document.getElementById(`comment-input-${workoutId}`);
    const text = input.value.trim();
    
    if (!text) return;
    
    try {
        await axios.post(`${API_BASE}/workouts/${workoutId}/comments`, { text });
        input.value = '';
        
        // Reload comments
        await loadComments(workoutId);
        
        // Update comment count
        const countElement = document.getElementById(`comments-count-${workoutId}`);
        if (countElement) {
            countElement.textContent = parseInt(countElement.textContent) + 1;
        }
    } catch (error) {
        console.error('Failed to add comment:', error);
        showToast('댓글 작성에 실패했습니다.', 'error');
    }
}

async function deleteComment(workoutId, commentId) {
    if (!confirm('댓글을 삭제하시겠습니까?')) return;
    
    try {
        await axios.delete(`${API_BASE}/workouts/${workoutId}/comments/${commentId}`);
        
        // Reload comments
        await loadComments(workoutId);
        
        // Update comment count
        const countElement = document.getElementById(`comments-count-${workoutId}`);
        if (countElement) {
            countElement.textContent = Math.max(0, parseInt(countElement.textContent) - 1);
        }
    } catch (error) {
        console.error('Failed to delete comment:', error);
        showToast('댓글 삭제에 실패했습니다.', 'error');
    }
}

async function toggleLike(workoutId) {
    try {
        const workout = (await axios.get(`${API_BASE}/workouts/${workoutId}`)).data;
        
        if (workout.liked_by_me) {
            await axios.delete(`${API_BASE}/workouts/${workoutId}/like`);
        } else {
            await axios.post(`${API_BASE}/workouts/${workoutId}/like`);
        }
        
        await loadFeed();
    } catch (error) {
        console.error('Failed to toggle like:', error);
    }
}

async function handleAddWorkout(e) {
    e.preventDefault();
    
    const submitBtn = document.getElementById('submit-workout-btn');
    const submitText = document.getElementById('submit-workout-text');
    const originalText = submitText.textContent;
    
    try {
        // Disable button and show loading
        submitBtn.disabled = true;
        submitText.textContent = '저장 중...';
        
        const workout_type = document.getElementById('workout-type').value;
        const started_at = document.getElementById('workout-started').value + ':00Z';
        const duration_min = parseInt(document.getElementById('workout-duration').value);
        const distance_km = document.getElementById('workout-distance').value;
        const calories = document.getElementById('workout-calories').value;
        const memo = document.getElementById('workout-memo').value;
        
        // Upload images first
        const imageFiles = document.getElementById('workout-images').files;
        const image_urls = [];
        
        if (imageFiles.length > 0) {
            submitText.textContent = `이미지 업로드 중... (0/${imageFiles.length})`;
            
            for (let i = 0; i < Math.min(imageFiles.length, 3); i++) {
                const formData = new FormData();
                formData.append('image', imageFiles[i]);
                
                const uploadResponse = await axios.post(`${API_BASE}/upload`, formData, {
                    headers: {
                        'Content-Type': 'multipart/form-data'
                    }
                });
                
                image_urls.push(uploadResponse.data.url);
                submitText.textContent = `이미지 업로드 중... (${i + 1}/${imageFiles.length})`;
            }
        }
        
        submitText.textContent = '기록 저장 중...';
        
        const data = {
            workout_type,
            started_at,
            duration_min,
            distance_km: distance_km ? parseFloat(distance_km) : null,
            calories: calories ? parseInt(calories) : null,
            memo: memo || null,
            image_urls: image_urls.length > 0 ? image_urls : null
        };
        
        await axios.post(`${API_BASE}/workouts`, data);
        
        showToast('운동 기록이 추가되었습니다! 🎉', 'success');
        showView('feed');
        document.getElementById('add-workout-form').reset();
        document.getElementById('image-preview').innerHTML = '';
    } catch (error) {
        console.error('Failed to add workout:', error);
        showToast('운동 기록 추가에 실패했습니다: ' + (error.response?.data?.error || error.message), 'error');
    } finally {
        submitBtn.disabled = false;
        submitText.textContent = originalText;
    }
}

// Image preview handler
document.addEventListener('DOMContentLoaded', () => {
    const imageInput = document.getElementById('workout-images');
    if (imageInput) {
        imageInput.addEventListener('change', (e) => {
            const files = e.target.files;
            const preview = document.getElementById('image-preview');
            preview.innerHTML = '';
            
            for (let i = 0; i < Math.min(files.length, 3); i++) {
                const file = files[i];
                const reader = new FileReader();
                
                reader.onload = (e) => {
                    const img = document.createElement('img');
                    img.src = e.target.result;
                    img.className = 'h-20 w-20 object-cover rounded border';
                    preview.appendChild(img);
                };
                
                reader.readAsDataURL(file);
            }
            
            if (files.length > 3) {
                showToast('최대 3장까지만 업로드할 수 있습니다.', 'warning');
            }
        });
    }
});

// Stats functions
let activityChart = null;
let workoutTypeChart = null;

async function loadStats() {
    try {
        const [statsRes, highlightsRes] = await Promise.all([
            axios.get(`${API_BASE}/me/stats?range=weekly`),
            axios.get(`${API_BASE}/me/stats/highlights`)
        ]);
        
        const stats = statsRes.data;
        const highlights = highlightsRes.data;
        
        document.getElementById('stats-distance').textContent = stats.total_distance_km.toFixed(1);
        document.getElementById('stats-duration').textContent = stats.total_duration_min;
        document.getElementById('stats-count').textContent = stats.workout_count;
        
        // Render activity trend chart
        renderActivityChart(stats.by_date);
        
        // Render workout type pie chart
        renderWorkoutTypeChart(stats.by_type);
        
        // By type list
        const byTypeContainer = document.getElementById('stats-by-type');
        byTypeContainer.innerHTML = stats.by_type.map(type => `
            <div class="flex items-center justify-between p-3 bg-dark-bg rounded-lg border border-dark-border">
                <div class="flex items-center space-x-3">
                    <span class="text-2xl">${getWorkoutEmoji(type.workout_type)}</span>
                    <span class="font-medium text-gray-200">${getWorkoutTypeName(type.workout_type)}</span>
                </div>
                <div class="text-right text-sm text-gray-300">
                    <div>${type.count}회 · ${type.duration_min}분</div>
                    ${type.distance_km > 0 ? `<div class="text-accent-blue">${type.distance_km.toFixed(1)} km</div>` : ''}
                </div>
            </div>
        `).join('') || '<p class="text-gray-400">데이터가 없습니다</p>';
        
        // Highlights
        const highlightsContainer = document.getElementById('stats-highlights');
        highlightsContainer.innerHTML = `
            <div class="stat-card rounded-xl p-6 text-center">
                <div class="text-4xl mb-3">🏆</div>
                <div class="text-xs text-gray-400 uppercase tracking-wider mb-2">최장 거리</div>
                <div class="text-3xl font-bold text-accent-blue">${highlights.longest_distance_km.toFixed(1)}</div>
                <div class="text-sm text-gray-300 mt-1">km</div>
            </div>
            <div class="stat-card rounded-xl p-6 text-center">
                <div class="text-4xl mb-3">⏱️</div>
                <div class="text-xs text-gray-400 uppercase tracking-wider mb-2">최장 시간</div>
                <div class="text-3xl font-bold text-accent-green">${highlights.longest_duration_min}</div>
                <div class="text-sm text-gray-300 mt-1">분</div>
            </div>
            <div class="stat-card rounded-xl p-6 text-center">
                <div class="text-4xl mb-3">🔥</div>
                <div class="text-xs text-gray-400 uppercase tracking-wider mb-2">연속 운동일</div>
                <div class="text-3xl font-bold text-accent-orange">${highlights.streak_days}</div>
                <div class="text-sm text-gray-300 mt-1">일</div>
            </div>
        `;
    } catch (error) {
        console.error('Failed to load stats:', error);
    }
}

function renderActivityChart(byDate) {
    const ctx = document.getElementById('activity-chart');
    if (!ctx) return;
    
    // Destroy existing chart
    if (activityChart) {
        activityChart.destroy();
    }
    
    const dates = byDate.map(d => {
        const date = new Date(d.date);
        return `${date.getMonth() + 1}/${date.getDate()}`;
    });
    const distances = byDate.map(d => d.distance_km);
    const durations = byDate.map(d => d.duration_min);
    
    activityChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: dates,
            datasets: [
                {
                    label: '거리 (km)',
                    data: distances,
                    borderColor: '#00d4ff',
                    backgroundColor: 'rgba(0, 212, 255, 0.1)',
                    tension: 0.4,
                    fill: true,
                    yAxisID: 'y'
                },
                {
                    label: '시간 (분)',
                    data: durations,
                    borderColor: '#00ff88',
                    backgroundColor: 'rgba(0, 255, 136, 0.1)',
                    tension: 0.4,
                    fill: true,
                    yAxisID: 'y1'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false
            },
            plugins: {
                legend: {
                    labels: {
                        color: '#e5e7eb',
                        font: { size: 12 }
                    }
                }
            },
            scales: {
                x: {
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    ticks: { color: '#9ca3af' }
                },
                y: {
                    type: 'linear',
                    position: 'left',
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    ticks: { color: '#00d4ff' }
                },
                y1: {
                    type: 'linear',
                    position: 'right',
                    grid: { display: false },
                    ticks: { color: '#00ff88' }
                }
            }
        }
    });
}

function renderWorkoutTypeChart(byType) {
    const ctx = document.getElementById('workout-type-chart');
    if (!ctx) return;
    
    // Destroy existing chart
    if (workoutTypeChart) {
        workoutTypeChart.destroy();
    }
    
    const labels = byType.map(t => getWorkoutTypeName(t.workout_type));
    const data = byType.map(t => t.count);
    const colors = ['#00d4ff', '#00ff88', '#ff6b35', '#a855f7', '#fbbf24', '#ec4899'];
    
    workoutTypeChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: colors.slice(0, data.length),
                borderColor: '#141b2d',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: '#e5e7eb',
                        font: { size: 11 },
                        padding: 10
                    }
                }
            }
        }
    });
}

// Weight functions
let weightChart = null;

async function loadWeight() {
    try {
        const response = await axios.get(`${API_BASE}/me/weights`);
        const weights = response.data;
        
        const weightList = document.getElementById('weight-list');
        const weightChartCanvas = document.getElementById('weight-chart');
        const weightChartEmpty = document.getElementById('weight-chart-empty');
        
        if (weights.length === 0) {
            weightChartCanvas.classList.add('hidden');
            weightChartEmpty.classList.remove('hidden');
            weightList.innerHTML = `
                <div class="bg-dark-card rounded-lg shadow-md p-8 text-center text-gray-400 border border-dark-border">
                    <p>체중 기록이 없습니다</p>
                </div>
            `;
            return;
        }
        
        // Show chart
        weightChartCanvas.classList.remove('hidden');
        weightChartEmpty.classList.add('hidden');
        
        // Render weight chart
        renderWeightChart(weights);
        
        weightList.innerHTML = weights.map(weight => `
            <div class="bg-dark-card rounded-lg shadow-md p-4 flex justify-between items-center border border-dark-border">
                <div>
                    <div class="font-semibold text-accent-blue text-lg">${weight.weight_kg} kg</div>
                    <div class="text-sm text-gray-400">${formatDate(weight.logged_at)}</div>
                </div>
                <button onclick="deleteWeight('${weight.id}')" class="text-red-400 hover:text-red-300 transition">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `).join('');
    } catch (error) {
        console.error('Failed to load weight:', error);
    }
}

function renderWeightChart(weights) {
    const ctx = document.getElementById('weight-chart');
    if (!ctx) return;
    
    // Destroy existing chart
    if (weightChart) {
        weightChart.destroy();
    }
    
    // Sort by date
    const sortedWeights = [...weights].sort((a, b) => 
        new Date(a.logged_at) - new Date(b.logged_at)
    );
    
    const dates = sortedWeights.map(w => {
        const date = new Date(w.logged_at);
        return `${date.getMonth() + 1}/${date.getDate()}`;
    });
    const data = sortedWeights.map(w => w.weight_kg);
    
    weightChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: dates,
            datasets: [{
                label: '체중 (kg)',
                data: data,
                borderColor: '#00d4ff',
                backgroundColor: 'rgba(0, 212, 255, 0.1)',
                tension: 0.4,
                fill: true,
                pointRadius: 5,
                pointHoverRadius: 7,
                pointBackgroundColor: '#00d4ff',
                pointBorderColor: '#141b2d',
                pointBorderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: {
                        color: '#e5e7eb',
                        font: { size: 12 }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `${context.parsed.y.toFixed(1)} kg`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    ticks: { color: '#9ca3af' }
                },
                y: {
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    ticks: { 
                        color: '#00d4ff',
                        callback: function(value) {
                            return value + ' kg';
                        }
                    }
                }
            }
        }
    });
}

function showAddWeightModal() {
    const modal = document.getElementById('add-weight-modal');
    modal.classList.remove('hidden');
    
    // Set default date
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('weight-date').value = today;
}

function hideAddWeightModal() {
    const modal = document.getElementById('add-weight-modal');
    modal.classList.add('hidden');
    document.getElementById('add-weight-form').reset();
}

async function handleAddWeight(e) {
    e.preventDefault();
    
    const weight_kg = parseFloat(document.getElementById('weight-kg').value);
    const logged_at = document.getElementById('weight-date').value;
    
    try {
        await axios.post(`${API_BASE}/me/weights`, { weight_kg, logged_at });
        hideAddWeightModal();
        await loadWeight();
    } catch (error) {
        console.error('Failed to add weight:', error);
        showToast('체중 기록 추가에 실패했습니다: ' + (error.response?.data?.error || error.message), 'error');
    }
}

async function deleteWeight(weightId) {
    if (!confirm('이 체중 기록을 삭제하시겠습니까?')) {
        return;
    }
    
    try {
        await axios.delete(`${API_BASE}/me/weights/${weightId}`);
        await loadWeight();
    } catch (error) {
        console.error('Failed to delete weight:', error);
        showToast('체중 기록 삭제에 실패했습니다', 'error');
    }
}

// Utility functions
function showError(message) {
    const errorEl = document.getElementById('auth-error');
    if (errorEl) {
        errorEl.textContent = message;
        errorEl.classList.remove('hidden');
        setTimeout(() => errorEl.classList.add('hidden'), 5000);
    }
}

function formatDate(dateStr) {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return '방금 전';
    if (diffMins < 60) return `${diffMins}분 전`;
    if (diffHours < 24) return `${diffHours}시간 전`;
    if (diffDays < 7) return `${diffDays}일 전`;
    
    return date.toLocaleDateString('ko-KR');
}

function formatPace(secPerKm) {
    const mins = Math.floor(secPerKm / 60);
    const secs = secPerKm % 60;
    return `${mins}'${secs.toString().padStart(2, '0')}"`;
}

function getWorkoutEmoji(type) {
    const emojis = {
        // 야외 유산소
        'RUN': '🏃',
        'WALK': '🚶',
        'BIKE': '🚴',
        'HIKING': '🥾',
        'SWIMMING': '🏊',
        
        // 실내 유산소
        'TREADMILL': '🏃‍♂️',
        'INDOOR_BIKE': '🚴‍♀️',
        'STEPPER': '🪜',
        'ELLIPTICAL': '⚙️',
        'ROWING': '🚣',
        'JUMP_ROPE': '🪢',
        
        // 근력 운동
        'WEIGHT': '🏋️',
        'HOME_TRAINING': '💪',
        'CROSSFIT': '🤸',
        'CALISTHENICS': '🤸‍♂️',
        
        // 구기 종목
        'BADMINTON': '🏸',
        'TENNIS': '🎾',
        'TABLE_TENNIS': '🏓',
        'BASKETBALL': '🏀',
        'SOCCER': '⚽',
        'VOLLEYBALL': '🏐',
        'GOLF': '⛳',
        
        // 격투기
        'BOXING': '🥊',
        'TAEKWONDO': '🥋',
        'JUDO': '🥋',
        
        // 기타 스포츠
        'YOGA': '🧘',
        'PILATES': '🧘‍♀️',
        'CLIMBING': '🧗',
        'SKIING': '⛷️',
        'SKATEBOARD': '🛹',
        'DANCE': '💃',
        
        'OTHER': '⚡'
    };
    return emojis[type] || '⚡';
}

function getWorkoutTypeName(type) {
    const names = {
        // 야외 유산소
        'RUN': '러닝',
        'WALK': '걷기',
        'BIKE': '사이클',
        'HIKING': '등산',
        'SWIMMING': '수영',
        
        // 실내 유산소
        'TREADMILL': '러닝머신',
        'INDOOR_BIKE': '실내사이클',
        'STEPPER': '스텝퍼',
        'ELLIPTICAL': '일립티컬',
        'ROWING': '로잉머신',
        'JUMP_ROPE': '줄넘기',
        
        // 근력 운동
        'WEIGHT': '웨이트',
        'HOME_TRAINING': '홈트레이닝',
        'CROSSFIT': '크로스핏',
        'CALISTHENICS': '맨몸운동',
        
        // 구기 종목
        'BADMINTON': '배드민턴',
        'TENNIS': '테니스',
        'TABLE_TENNIS': '탁구',
        'BASKETBALL': '농구',
        'SOCCER': '축구',
        'VOLLEYBALL': '배구',
        'GOLF': '골프',
        
        // 격투기
        'BOXING': '복싱',
        'TAEKWONDO': '태권도',
        'JUDO': '유도',
        
        // 기타 스포츠
        'YOGA': '요가',
        'PILATES': '필라테스',
        'CLIMBING': '클라이밍',
        'SKIING': '스키',
        'SKATEBOARD': '스케이트보드',
        'DANCE': '댄스',
        
        'OTHER': '기타'
    };
    return names[type] || '운동';
}

function toggleWorkoutMenu(workoutId) {
    const menu = document.getElementById(`menu-${workoutId}`);
    
    // Close all other menus
    document.querySelectorAll('[id^="menu-"]').forEach(m => {
        if (m.id !== `menu-${workoutId}`) {
            m.classList.add('hidden');
        }
    });
    
    menu.classList.toggle('hidden');
}

async function deleteWorkout(workoutId) {
    if (!confirm('이 운동 기록을 삭제하시겠습니까?')) {
        return;
    }
    
    try {
        await axios.delete(`${API_BASE}/workouts/${workoutId}`);
        showToast('운동 기록이 삭제되었습니다', 'success');
        await loadFeed();
    } catch (error) {
        console.error('Failed to delete workout:', error);
        showToast('운동 기록 삭제에 실패했습니다', 'error');
    }
}

// Close menus when clicking outside
document.addEventListener('click', (e) => {
    if (!e.target.closest('[onclick^="toggleWorkoutMenu"]')) {
        document.querySelectorAll('[id^="menu-"]').forEach(m => {
            m.classList.add('hidden');
        });
    }
});

// Profile functions
function showEditProfileModal() {
    const modal = document.getElementById('edit-profile-modal');
    modal.classList.remove('hidden');
    
    // Pre-fill with current user data
    document.getElementById('profile-name').value = currentUser.name;
    document.getElementById('profile-height').value = currentUser.height_cm || '';
}

function hideEditProfileModal() {
    const modal = document.getElementById('edit-profile-modal');
    modal.classList.add('hidden');
    document.getElementById('edit-profile-form').reset();
}

async function handleEditProfile(e) {
    e.preventDefault();
    
    const name = document.getElementById('profile-name').value;
    const height_cm = document.getElementById('profile-height').value;
    
    try {
        const response = await axios.put(`${API_BASE}/me/profile`, {
            name,
            height_cm: height_cm ? parseInt(height_cm) : null
        });
        
        currentUser = response.data.user;
        hideEditProfileModal();
        updateNavigation();
        showToast('프로필이 업데이트되었습니다', 'success');
    } catch (error) {
        console.error('Failed to update profile:', error);
        showToast('프로필 업데이트에 실패했습니다: ' + (error.response?.data?.error || error.message), 'error');
    }
}

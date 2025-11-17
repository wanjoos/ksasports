// Global state
let token = localStorage.getItem('token');
let currentView = 'feed';
let currentUser = null;
let allWorkouts = []; // Store all workouts for filtering
let filteredWorkouts = []; // Store filtered results
let currentFeedFilter = 'all'; // 'all' or 'following'

const API_BASE = '/api';

// Filter state
const filterState = {
    search: '',
    dateRange: 'all',
    customDateStart: '',
    customDateEnd: '',
    sort: 'date', // date, distance, duration
    workoutType: 'all'
};

// Pagination state
const paginationState = {
    currentPage: 0,
    pageSize: 10,
    hasMore: true,
    isLoading: false
};

// Intersection Observer for infinite scroll
let scrollObserver = null;

// Social state
let searchTimeout = null;

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
        
        // Goals modal
        if (e.target.id === 'btn-set-goals') showSetGoalsModal();
        if (e.target.id === 'close-goals-modal') hideSetGoalsModal();
        if (e.target.id === 'cancel-goals-modal') hideSetGoalsModal();
        if (e.target.id === 'save-goals-btn') saveGoals();
        
        // Lightbox
        if (e.target.id === 'lightbox-close') closeLightbox();
        if (e.target.id === 'lightbox-prev') previousLightboxImage();
        if (e.target.id === 'lightbox-next') nextLightboxImage();
        if (e.target.id === 'lightbox-download') downloadLightboxImage();
        if (e.target.id === 'lightbox-zoom-in') zoomInLightbox();
        if (e.target.id === 'lightbox-zoom-out') zoomOutLightbox();
        if (e.target.id === 'lightbox-zoom-reset') resetLightboxZoom();
        
        // Close lightbox when clicking background
        if (e.target.id === 'lightbox-modal') closeLightbox();
        
        // Edit workout modal
        if (e.target.id === 'close-edit-workout-modal') hideEditWorkoutModal();
        if (e.target.id === 'cancel-edit-workout-modal') hideEditWorkoutModal();
        
        // Social modals
        if (e.target.id === 'btn-search-users') showUserSearchModal();
        if (e.target.id === 'close-user-search-modal') hideUserSearchModal();
        if (e.target.id === 'close-user-profile-modal') hideUserProfileModal();
    });
    
    // Add workout form
    document.getElementById('add-workout-form')?.addEventListener('submit', handleAddWorkout);
    
    // Edit workout form
    document.getElementById('edit-workout-form')?.addEventListener('submit', handleEditWorkout);
    
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
    
    // Filter event listeners
    // Search input with debounce
    let searchTimeout;
    document.getElementById('search-input')?.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            filterState.search = e.target.value.trim();
            applyFilters();
        }, 300);
    });
    
    // Date range select
    document.getElementById('date-range-select')?.addEventListener('change', (e) => {
        filterState.dateRange = e.target.value;
        
        if (e.target.value === 'custom') {
            document.getElementById('custom-date-start').classList.remove('hidden');
            document.getElementById('custom-date-end').classList.remove('hidden');
        } else {
            document.getElementById('custom-date-start').classList.add('hidden');
            document.getElementById('custom-date-end').classList.add('hidden');
        }
        
        applyFilters();
    });
    
    // Custom date inputs
    document.getElementById('date-start')?.addEventListener('change', (e) => {
        filterState.customDateStart = e.target.value;
        applyFilters();
    });
    
    document.getElementById('date-end')?.addEventListener('change', (e) => {
        filterState.customDateEnd = e.target.value;
        applyFilters();
    });
    
    // Sort buttons
    document.addEventListener('click', (e) => {
        const sortBtn = e.target.closest('.sort-btn');
        if (sortBtn) {
            document.querySelectorAll('.sort-btn').forEach(btn => btn.classList.remove('active'));
            sortBtn.classList.add('active');
            filterState.sort = sortBtn.dataset.sort;
            applyFilters();
        }
        
        // Type filter buttons
        const typeBtn = e.target.closest('.type-filter-btn');
        if (typeBtn) {
            document.querySelectorAll('.type-filter-btn').forEach(btn => btn.classList.remove('active'));
            typeBtn.classList.add('active');
            filterState.workoutType = typeBtn.dataset.type;
            applyFilters();
        }
        
        // Feed filter buttons
        const feedFilterBtn = e.target.closest('.feed-filter-btn');
        if (feedFilterBtn) {
            switchFeedFilter(feedFilterBtn.dataset.feedFilter);
        }
    });
    
    // Clear all filters
    document.getElementById('clear-filters')?.addEventListener('click', clearAllFilters);
    
    // User search input with debounce
    document.getElementById('user-search-input')?.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            searchUsers(e.target.value.trim());
        }, 300);
    });
    
    // Lightbox keyboard navigation
    document.addEventListener('keydown', handleLightboxKeyboard);
    
    // Lightbox image interactions
    const lightboxImg = document.getElementById('lightbox-image');
    if (lightboxImg) {
        // Double click to zoom
        lightboxImg.addEventListener('dblclick', toggleLightboxZoom);
        
        // Mouse pan
        lightboxImg.addEventListener('mousedown', startLightboxPan);
        document.addEventListener('mousemove', moveLightboxPan);
        document.addEventListener('mouseup', endLightboxPan);
        
        // Touch pan
        lightboxImg.addEventListener('touchstart', (e) => {
            startLightboxPan(e);
            handleLightboxTouchStart(e);
        });
        lightboxImg.addEventListener('touchmove', moveLightboxPan);
        lightboxImg.addEventListener('touchend', (e) => {
            endLightboxPan();
            handleLightboxTouchEnd(e);
        });
    }
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
    if (view === 'feed') {
        loadFeed().then(() => {
            // Initialize workout type filters after workouts are loaded
            initializeWorkoutTypeFilters();
        });
    }
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
        let response;
        
        if (currentFeedFilter === 'following') {
            response = await axios.get(`${API_BASE}/social/feed/following`);
        } else {
            response = await axios.get(`${API_BASE}/workouts/feed`);
        }
        
        allWorkouts = response.data;
        
        // Apply filters
        applyFilters();
    } catch (error) {
        console.error('Error loading feed:', error);
        showToast('피드를 불러오는데 실패했습니다', 'error');
    }
}

// Apply all filters and render
function applyFilters() {
    let filtered = [...allWorkouts];
    
    // Search filter
    if (filterState.search) {
        const searchLower = filterState.search.toLowerCase();
        filtered = filtered.filter(w => 
            getWorkoutTypeName(w.workout_type).toLowerCase().includes(searchLower) ||
            (w.memo && w.memo.toLowerCase().includes(searchLower))
        );
    }
    
    // Date range filter
    if (filterState.dateRange !== 'all') {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        
        filtered = filtered.filter(w => {
            const workoutDate = new Date(w.started_at);
            
            if (filterState.dateRange === 'today') {
                return workoutDate >= today;
            } else if (filterState.dateRange === 'week') {
                const weekAgo = new Date(today);
                weekAgo.setDate(weekAgo.getDate() - 7);
                return workoutDate >= weekAgo;
            } else if (filterState.dateRange === 'month') {
                const monthAgo = new Date(today);
                monthAgo.setMonth(monthAgo.getMonth() - 1);
                return workoutDate >= monthAgo;
            } else if (filterState.dateRange === 'custom') {
                if (filterState.customDateStart) {
                    const start = new Date(filterState.customDateStart);
                    if (workoutDate < start) return false;
                }
                if (filterState.customDateEnd) {
                    const end = new Date(filterState.customDateEnd);
                    end.setHours(23, 59, 59);
                    if (workoutDate > end) return false;
                }
                return true;
            }
            return true;
        });
    }
    
    // Workout type filter
    if (filterState.workoutType !== 'all') {
        filtered = filtered.filter(w => w.workout_type === filterState.workoutType);
    }
    
    // Sort
    if (filterState.sort === 'date') {
        filtered.sort((a, b) => new Date(b.started_at) - new Date(a.started_at));
    } else if (filterState.sort === 'distance') {
        filtered.sort((a, b) => (b.distance_km || 0) - (a.distance_km || 0));
    } else if (filterState.sort === 'duration') {
        filtered.sort((a, b) => b.duration_min - a.duration_min);
    }
    
    filteredWorkouts = filtered;
    resetPagination(); // Reset pagination when filters change
    renderFeed();
    updateResultsCount();
    updateActiveFilters();
}

// Render feed with current filtered workouts (with pagination)
function renderFeed(append = false) {
    const feedContainer = document.getElementById('feed-container');
    
    if (filteredWorkouts.length === 0) {
        feedContainer.innerHTML = `
            <div class="bg-dark-card rounded-xl shadow-lg p-8 text-center text-gray-400 border border-dark-border">
                <i class="fas fa-inbox text-4xl mb-4"></i>
                <p>${allWorkouts.length === 0 ? '아직 운동 기록이 없습니다. 첫 운동을 기록해보세요!' : '검색 결과가 없습니다. 필터를 조정해보세요.'}</p>
            </div>
        `;
        hideScrollLoading();
        hideScrollEnd();
        paginationState.hasMore = false;
        return;
    }
    
    // Calculate which workouts to show
    const startIdx = 0;
    const endIdx = (paginationState.currentPage + 1) * paginationState.pageSize;
    const workoutsToShow = filteredWorkouts.slice(startIdx, endIdx);
    
    // Check if there are more workouts to load
    paginationState.hasMore = endIdx < filteredWorkouts.length;
    
    const workoutHTML = workoutsToShow.map(workout => `
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
                                    <button onclick="editWorkout('${workout.id}')" class="w-full text-left px-3 md:px-4 py-2 text-accent-blue hover:bg-dark-card rounded-t-lg text-sm md:text-base">
                                        <i class="fas fa-edit mr-1 md:mr-2"></i>수정
                                    </button>
                                    <button onclick="deleteWorkout('${workout.id}')" class="w-full text-left px-3 md:px-4 py-2 text-red-400 hover:bg-dark-card rounded-b-lg text-sm md:text-base">
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
                            ${workout.images.map((img, idx) => `
                                <img src="${img}" alt="운동 이미지" class="rounded-lg object-cover w-full h-32 md:h-48 cursor-pointer border border-dark-border" onclick="openLightbox(${JSON.stringify(workout.images)}, ${idx})">
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
    
    if (append) {
        feedContainer.insertAdjacentHTML('beforeend', workoutHTML);
    } else {
        feedContainer.innerHTML = workoutHTML;
    }
    
    // Update scroll indicators
    hideScrollLoading();
    
    if (paginationState.hasMore) {
        hideScrollEnd();
        setupScrollObserver();
    } else {
        showScrollEnd();
        disconnectScrollObserver();
    }
}

// Infinite scroll functions
function setupScrollObserver() {
    // Disconnect existing observer
    disconnectScrollObserver();
    
    const sentinel = document.getElementById('scroll-sentinel');
    if (!sentinel) return;
    
    const options = {
        root: null,
        rootMargin: '100px',
        threshold: 0.1
    };
    
    scrollObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting && paginationState.hasMore && !paginationState.isLoading) {
                loadMoreWorkouts();
            }
        });
    }, options);
    
    scrollObserver.observe(sentinel);
}

function disconnectScrollObserver() {
    if (scrollObserver) {
        scrollObserver.disconnect();
        scrollObserver = null;
    }
}

function loadMoreWorkouts() {
    if (paginationState.isLoading || !paginationState.hasMore) return;
    
    paginationState.isLoading = true;
    showScrollLoading();
    
    // Simulate network delay for smooth UX
    setTimeout(() => {
        paginationState.currentPage++;
        renderFeed(false); // Re-render with more items
        paginationState.isLoading = false;
    }, 500);
}

function resetPagination() {
    paginationState.currentPage = 0;
    paginationState.hasMore = true;
    paginationState.isLoading = false;
    disconnectScrollObserver();
}

function showScrollLoading() {
    document.getElementById('scroll-loading')?.classList.remove('hidden');
}

function hideScrollLoading() {
    document.getElementById('scroll-loading')?.classList.add('hidden');
}

function showScrollEnd() {
    document.getElementById('scroll-end')?.classList.remove('hidden');
}

function hideScrollEnd() {
    document.getElementById('scroll-end')?.classList.add('hidden');
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
        
        // Check for new badges
        await checkBadges();
        
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
        const [statsRes, highlightsRes, goalsRes] = await Promise.all([
            axios.get(`${API_BASE}/me/stats?range=weekly`),
            axios.get(`${API_BASE}/me/stats/highlights`),
            loadGoalsProgress(),
            loadChallenges(),
            loadBadges()
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

// Filter UI functions
function updateResultsCount() {
    const resultsCount = document.getElementById('results-count');
    if (resultsCount) {
        if (allWorkouts.length === 0) {
            resultsCount.innerHTML = '';
        } else {
            resultsCount.innerHTML = `
                <i class="fas fa-list mr-2"></i>
                ${filteredWorkouts.length}개의 운동 기록 
                ${allWorkouts.length !== filteredWorkouts.length ? `(전체 ${allWorkouts.length}개 중)` : ''}
            `;
        }
    }
}

function updateActiveFilters() {
    const activeFiltersDiv = document.getElementById('active-filters');
    const filterTags = document.getElementById('filter-tags');
    
    const tags = [];
    
    if (filterState.search) {
        tags.push({ type: 'search', label: `검색: ${filterState.search}` });
    }
    
    if (filterState.dateRange !== 'all') {
        let label = '';
        if (filterState.dateRange === 'today') label = '오늘';
        else if (filterState.dateRange === 'week') label = '이번 주';
        else if (filterState.dateRange === 'month') label = '이번 달';
        else if (filterState.dateRange === 'custom') {
            const parts = [];
            if (filterState.customDateStart) parts.push(filterState.customDateStart);
            if (filterState.customDateEnd) parts.push(filterState.customDateEnd);
            label = parts.join(' ~ ') || '기간 선택';
        }
        tags.push({ type: 'dateRange', label: `기간: ${label}` });
    }
    
    if (filterState.workoutType !== 'all') {
        tags.push({ type: 'workoutType', label: `${getWorkoutEmoji(filterState.workoutType)} ${getWorkoutTypeName(filterState.workoutType)}` });
    }
    
    if (tags.length > 0) {
        activeFiltersDiv.classList.remove('hidden');
        filterTags.innerHTML = tags.map(tag => `
            <span class="filter-tag">
                ${tag.label}
                <button onclick="removeFilter('${tag.type}')">
                    <i class="fas fa-times"></i>
                </button>
            </span>
        `).join('');
    } else {
        activeFiltersDiv.classList.add('hidden');
    }
}

function removeFilter(type) {
    if (type === 'search') {
        filterState.search = '';
        document.getElementById('search-input').value = '';
    } else if (type === 'dateRange') {
        filterState.dateRange = 'all';
        filterState.customDateStart = '';
        filterState.customDateEnd = '';
        document.getElementById('date-range-select').value = 'all';
        document.getElementById('custom-date-start').classList.add('hidden');
        document.getElementById('custom-date-end').classList.add('hidden');
    } else if (type === 'workoutType') {
        filterState.workoutType = 'all';
        document.querySelectorAll('.type-filter-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.type === 'all') btn.classList.add('active');
        });
    }
    
    applyFilters();
}

function clearAllFilters() {
    filterState.search = '';
    filterState.dateRange = 'all';
    filterState.customDateStart = '';
    filterState.customDateEnd = '';
    filterState.sort = 'date';
    filterState.workoutType = 'all';
    
    // Reset UI
    document.getElementById('search-input').value = '';
    document.getElementById('date-range-select').value = 'all';
    document.getElementById('custom-date-start').classList.add('hidden');
    document.getElementById('custom-date-end').classList.add('hidden');
    
    document.querySelectorAll('.sort-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.sort === 'date') btn.classList.add('active');
    });
    
    document.querySelectorAll('.type-filter-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.type === 'all') btn.classList.add('active');
    });
    
    applyFilters();
}

function initializeWorkoutTypeFilters() {
    const container = document.getElementById('workout-type-filters');
    if (!container) return;
    
    // Get unique workout types from all workouts
    const types = [...new Set(allWorkouts.map(w => w.workout_type))];
    
    // Add filter buttons for each type
    const buttons = types.map(type => `
        <button data-type="${type}" class="type-filter-btn px-3 py-2 rounded-lg border transition text-sm">
            ${getWorkoutEmoji(type)} ${getWorkoutTypeName(type)}
        </button>
    `).join('');
    
    // Keep the "all" button and add others
    const allButton = container.querySelector('[data-type="all"]');
    if (allButton) {
        container.innerHTML = allButton.outerHTML + buttons;
    }
}

// Edit workout functions
async function editWorkout(workoutId) {
    try {
        // Find the workout from allWorkouts
        const workout = allWorkouts.find(w => w.id === workoutId);
        if (!workout) {
            showToast('운동 기록을 찾을 수 없습니다', 'error');
            return;
        }
        
        // Populate form
        document.getElementById('edit-workout-id').value = workout.id;
        document.getElementById('edit-workout-type').value = workout.workout_type;
        
        // Format datetime for input
        const startedDate = new Date(workout.started_at);
        startedDate.setMinutes(startedDate.getMinutes() - startedDate.getTimezoneOffset());
        document.getElementById('edit-workout-started').value = startedDate.toISOString().slice(0, 16);
        
        document.getElementById('edit-workout-distance').value = workout.distance_km || '';
        document.getElementById('edit-workout-duration').value = workout.duration_min;
        document.getElementById('edit-workout-pace').value = workout.pace_sec_per_km || '';
        document.getElementById('edit-workout-calories').value = workout.calories || '';
        document.getElementById('edit-workout-memo').value = workout.memo || '';
        
        // Show modal
        document.getElementById('edit-workout-modal').classList.remove('hidden');
    } catch (error) {
        console.error('Failed to load workout:', error);
        showToast('운동 기록을 불러오는데 실패했습니다', 'error');
    }
}

function hideEditWorkoutModal() {
    document.getElementById('edit-workout-modal').classList.add('hidden');
}

async function handleEditWorkout(e) {
    e.preventDefault();
    
    try {
        showLoading();
        
        const workoutId = document.getElementById('edit-workout-id').value;
        const workoutData = {
            workout_type: document.getElementById('edit-workout-type').value,
            started_at: new Date(document.getElementById('edit-workout-started').value).toISOString(),
            duration_min: parseInt(document.getElementById('edit-workout-duration').value),
            distance_km: parseFloat(document.getElementById('edit-workout-distance').value) || null,
            pace_sec_per_km: parseInt(document.getElementById('edit-workout-pace').value) || null,
            calories: parseInt(document.getElementById('edit-workout-calories').value) || null,
            memo: document.getElementById('edit-workout-memo').value || null
        };
        
        await axios.put(`${API_BASE}/workouts/${workoutId}`, workoutData);
        
        hideLoading();
        hideEditWorkoutModal();
        showToast('운동 기록이 수정되었습니다! 💪', 'success');
        
        // Reload feed
        await loadFeed();
    } catch (error) {
        hideLoading();
        console.error('Failed to update workout:', error);
        showToast('운동 기록 수정에 실패했습니다', 'error');
    }
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

// Lightbox functions
let lightboxImages = [];
let lightboxCurrentIndex = 0;
let lightboxZoom = 1;
let lightboxPanX = 0;
let lightboxPanY = 0;
let isDragging = false;
let startX = 0;
let startY = 0;

function openLightbox(images, startIndex = 0) {
    lightboxImages = images;
    lightboxCurrentIndex = startIndex;
    lightboxZoom = 1;
    lightboxPanX = 0;
    lightboxPanY = 0;
    
    const modal = document.getElementById('lightbox-modal');
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden'; // Prevent background scroll
    
    updateLightboxImage();
    renderLightboxThumbnails();
    updateLightboxNavigation();
}

function closeLightbox() {
    const modal = document.getElementById('lightbox-modal');
    modal.classList.add('hidden');
    document.body.style.overflow = ''; // Restore scroll
    lightboxImages = [];
    lightboxCurrentIndex = 0;
    resetLightboxZoom();
}

function updateLightboxImage() {
    const img = document.getElementById('lightbox-image');
    const current = document.getElementById('lightbox-current');
    const total = document.getElementById('lightbox-total');
    
    img.src = lightboxImages[lightboxCurrentIndex];
    current.textContent = lightboxCurrentIndex + 1;
    total.textContent = lightboxImages.length;
    
    // Update active thumbnail
    document.querySelectorAll('.lightbox-thumbnail').forEach((thumb, idx) => {
        if (idx === lightboxCurrentIndex) {
            thumb.classList.add('active');
        } else {
            thumb.classList.remove('active');
        }
    });
}

function renderLightboxThumbnails() {
    const container = document.getElementById('lightbox-thumbnails');
    
    if (lightboxImages.length <= 1) {
        container.classList.add('hidden');
        return;
    }
    
    container.classList.remove('hidden');
    container.innerHTML = lightboxImages.map((img, idx) => `
        <img src="${img}" alt="Thumbnail ${idx + 1}" 
            class="lightbox-thumbnail ${idx === lightboxCurrentIndex ? 'active' : ''}"
            onclick="goToLightboxImage(${idx})">
    `).join('');
}

function updateLightboxNavigation() {
    const prevBtn = document.getElementById('lightbox-prev');
    const nextBtn = document.getElementById('lightbox-next');
    
    if (lightboxImages.length <= 1) {
        prevBtn.classList.add('hidden');
        nextBtn.classList.add('hidden');
    } else {
        prevBtn.classList.remove('hidden');
        nextBtn.classList.remove('hidden');
    }
}

function goToLightboxImage(index) {
    lightboxCurrentIndex = index;
    resetLightboxZoom();
    updateLightboxImage();
}

function previousLightboxImage() {
    if (lightboxCurrentIndex > 0) {
        lightboxCurrentIndex--;
        resetLightboxZoom();
        updateLightboxImage();
    }
}

function nextLightboxImage() {
    if (lightboxCurrentIndex < lightboxImages.length - 1) {
        lightboxCurrentIndex++;
        resetLightboxZoom();
        updateLightboxImage();
    }
}

function downloadLightboxImage() {
    const img = lightboxImages[lightboxCurrentIndex];
    const link = document.createElement('a');
    link.href = img;
    link.download = `workout-image-${lightboxCurrentIndex + 1}.jpg`;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('이미지 다운로드 시작!', 'success');
}

// Zoom functions
function zoomInLightbox() {
    lightboxZoom = Math.min(lightboxZoom + 0.5, 3);
    applyLightboxZoom();
}

function zoomOutLightbox() {
    lightboxZoom = Math.max(lightboxZoom - 0.5, 1);
    if (lightboxZoom === 1) {
        resetLightboxZoom();
    } else {
        applyLightboxZoom();
    }
}

function resetLightboxZoom() {
    lightboxZoom = 1;
    lightboxPanX = 0;
    lightboxPanY = 0;
    applyLightboxZoom();
}

function applyLightboxZoom() {
    const img = document.getElementById('lightbox-image');
    img.style.transform = `scale(${lightboxZoom}) translate(${lightboxPanX}px, ${lightboxPanY}px)`;
    
    if (lightboxZoom > 1) {
        img.classList.add('zoomed');
        img.style.cursor = 'move';
    } else {
        img.classList.remove('zoomed');
        img.style.cursor = 'zoom-in';
    }
}

// Double click to zoom
function toggleLightboxZoom() {
    if (lightboxZoom === 1) {
        lightboxZoom = 2;
    } else {
        lightboxZoom = 1;
        lightboxPanX = 0;
        lightboxPanY = 0;
    }
    applyLightboxZoom();
}

// Pan functions
function startLightboxPan(e) {
    if (lightboxZoom <= 1) return;
    
    isDragging = true;
    startX = e.clientX || e.touches[0].clientX;
    startY = e.clientY || e.touches[0].clientY;
}

function moveLightboxPan(e) {
    if (!isDragging || lightboxZoom <= 1) return;
    
    e.preventDefault();
    const currentX = e.clientX || e.touches[0].clientX;
    const currentY = e.clientY || e.touches[0].clientY;
    
    const deltaX = currentX - startX;
    const deltaY = currentY - startY;
    
    lightboxPanX += deltaX / lightboxZoom;
    lightboxPanY += deltaY / lightboxZoom;
    
    startX = currentX;
    startY = currentY;
    
    applyLightboxZoom();
}

function endLightboxPan() {
    isDragging = false;
}

// Keyboard navigation
function handleLightboxKeyboard(e) {
    if (!document.getElementById('lightbox-modal').classList.contains('hidden')) {
        if (e.key === 'Escape') closeLightbox();
        if (e.key === 'ArrowLeft') previousLightboxImage();
        if (e.key === 'ArrowRight') nextLightboxImage();
        if (e.key === '+' || e.key === '=') zoomInLightbox();
        if (e.key === '-' || e.key === '_') zoomOutLightbox();
    }
}

// Swipe support for mobile
let touchStartX = 0;
let touchStartY = 0;

function handleLightboxTouchStart(e) {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
}

function handleLightboxTouchEnd(e) {
    if (lightboxZoom > 1) return; // Don't swipe when zoomed
    
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    
    const diffX = touchStartX - touchEndX;
    const diffY = touchStartY - touchEndY;
    
    // Horizontal swipe
    if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 50) {
        if (diffX > 0) {
            nextLightboxImage();
        } else {
            previousLightboxImage();
        }
    }
}

// Goals functions
async function loadGoalsProgress() {
    try {
        const response = await axios.get(`${API_BASE}/me/goals/progress`);
        const goals = response.data;
        
        const goalsProgress = document.getElementById('goals-progress');
        const goalsEmpty = document.getElementById('goals-empty');
        
        if (goals.length === 0) {
            goalsProgress.innerHTML = '';
            goalsEmpty.classList.remove('hidden');
            return;
        }
        
        goalsEmpty.classList.add('hidden');
        
        // Group by goal type
        const weekly = goals.filter(g => g.goal_type === 'WEEKLY');
        const monthly = goals.filter(g => g.goal_type === 'MONTHLY');
        
        let html = '';
        
        if (weekly.length > 0) {
            html += `
                <div class="mb-6">
                    <h4 class="text-md font-bold text-accent-blue mb-3 flex items-center">
                        <i class="fas fa-calendar-week mr-2"></i>
                        이번 주 목표
                    </h4>
                    <div class="space-y-3">
                        ${weekly.map(goal => renderGoalProgress(goal)).join('')}
                    </div>
                </div>
            `;
        }
        
        if (monthly.length > 0) {
            html += `
                <div>
                    <h4 class="text-md font-bold text-accent-green mb-3 flex items-center">
                        <i class="fas fa-calendar-alt mr-2"></i>
                        이번 달 목표
                    </h4>
                    <div class="space-y-3">
                        ${monthly.map(goal => renderGoalProgress(goal)).join('')}
                    </div>
                </div>
            `;
        }
        
        goalsProgress.innerHTML = html;
        
        // Check for achievements
        goals.forEach(goal => {
            if (goal.is_achieved && !localStorage.getItem(`goal-achieved-${goal.id}`)) {
                showToast(`🎉 목표 달성! ${getGoalTypeName(goal.target_type)} ${goal.target_value}${getGoalUnit(goal.target_type)} 완료!`, 'success');
                localStorage.setItem(`goal-achieved-${goal.id}`, 'true');
            }
        });
    } catch (error) {
        console.error('Failed to load goals:', error);
    }
}

function renderGoalProgress(goal) {
    const targetName = getGoalTypeName(goal.target_type);
    const unit = getGoalUnit(goal.target_type);
    const percentage = goal.percentage;
    const isAchieved = goal.is_achieved;
    
    let progressColor = 'from-accent-blue to-cyan-500';
    if (percentage >= 80) progressColor = 'from-accent-green to-emerald-500';
    else if (percentage >= 50) progressColor = 'from-accent-blue to-cyan-500';
    else progressColor = 'from-gray-500 to-gray-600';
    
    return `
        <div class="goal-card ${isAchieved ? 'achieved' : ''} rounded-lg p-4">
            <div class="flex justify-between items-start mb-3">
                <div class="flex items-center space-x-2">
                    <span class="text-lg">${getGoalIcon(goal.target_type)}</span>
                    <span class="font-semibold text-gray-200">${targetName}</span>
                    ${isAchieved ? '<span class="text-xs bg-accent-green text-white px-2 py-1 rounded-full">달성!</span>' : ''}
                </div>
                <button onclick="deleteGoal('${goal.id}')" class="text-gray-400 hover:text-red-400 transition text-sm">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="mb-2">
                <div class="flex justify-between text-sm mb-1">
                    <span class="text-gray-400">${goal.current_value.toFixed(goal.target_type === 'COUNT' ? 0 : 1)}${unit} / ${goal.target_value}${unit}</span>
                    <span class="font-bold ${isAchieved ? 'text-accent-green' : 'text-accent-blue'}">${percentage}%</span>
                </div>
                <div class="progress-bar">
                    <div class="progress-bar-fill bg-gradient-to-r ${progressColor}" style="width: ${Math.min(percentage, 100)}%"></div>
                </div>
            </div>
            ${!isAchieved && percentage >= 80 ? '<p class="text-xs text-accent-green">조금만 더! 거의 다 왔어요! 💪</p>' : ''}
            ${!isAchieved && percentage < 50 ? '<p class="text-xs text-gray-400">화이팅! 꾸준히 해봐요! 🔥</p>' : ''}
        </div>
    `;
}

function getGoalTypeName(type) {
    const names = {
        'COUNT': '운동 횟수',
        'DISTANCE': '총 거리',
        'DURATION': '총 시간'
    };
    return names[type] || type;
}

function getGoalUnit(type) {
    const units = {
        'COUNT': '회',
        'DISTANCE': 'km',
        'DURATION': '분'
    };
    return units[type] || '';
}

function getGoalIcon(type) {
    const icons = {
        'COUNT': '🔢',
        'DISTANCE': '🏃',
        'DURATION': '⏱️'
    };
    return icons[type] || '🎯';
}

function showSetGoalsModal() {
    document.getElementById('set-goals-modal').classList.remove('hidden');
    loadCurrentGoals();
}

function hideSetGoalsModal() {
    document.getElementById('set-goals-modal').classList.add('hidden');
}

async function loadCurrentGoals() {
    try {
        const response = await axios.get(`${API_BASE}/me/goals/progress`);
        const goals = response.data;
        
        // Clear all inputs first
        ['weekly', 'monthly'].forEach(period => {
            ['count', 'distance', 'duration'].forEach(type => {
                document.getElementById(`${period}-${type}`).value = '';
            });
        });
        
        // Populate with existing goals
        goals.forEach(goal => {
            const period = goal.goal_type.toLowerCase();
            const type = goal.target_type.toLowerCase();
            const input = document.getElementById(`${period}-${type}`);
            if (input) {
                input.value = goal.target_value;
            }
        });
    } catch (error) {
        console.error('Failed to load current goals:', error);
    }
}

async function saveGoals() {
    try {
        showLoading();
        
        const goalsToSave = [];
        
        // Collect weekly goals
        ['count', 'distance', 'duration'].forEach(type => {
            const value = parseFloat(document.getElementById(`weekly-${type}`).value);
            if (value && value > 0) {
                goalsToSave.push({
                    goal_type: 'WEEKLY',
                    target_type: type.toUpperCase(),
                    target_value: value
                });
            }
        });
        
        // Collect monthly goals
        ['count', 'distance', 'duration'].forEach(type => {
            const value = parseFloat(document.getElementById(`monthly-${type}`).value);
            if (value && value > 0) {
                goalsToSave.push({
                    goal_type: 'MONTHLY',
                    target_type: type.toUpperCase(),
                    target_value: value
                });
            }
        });
        
        if (goalsToSave.length === 0) {
            hideLoading();
            showToast('최소 하나의 목표를 설정해주세요', 'warning');
            return;
        }
        
        // Save all goals
        await Promise.all(
            goalsToSave.map(goal => axios.post(`${API_BASE}/me/goals`, goal))
        );
        
        hideLoading();
        hideSetGoalsModal();
        showToast('목표가 설정되었습니다! 🎯', 'success');
        
        // Reload goals
        await loadGoalsProgress();
    } catch (error) {
        hideLoading();
        console.error('Failed to save goals:', error);
        showToast('목표 설정에 실패했습니다', 'error');
    }
}

async function deleteGoal(goalId) {
    if (!confirm('이 목표를 삭제하시겠습니까?')) {
        return;
    }
    
    try {
        await axios.delete(`${API_BASE}/me/goals/${goalId}`);
        showToast('목표가 삭제되었습니다', 'success');
        localStorage.removeItem(`goal-achieved-${goalId}`);
        await loadGoalsProgress();
    } catch (error) {
        console.error('Failed to delete goal:', error);
        showToast('목표 삭제에 실패했습니다', 'error');
    }
}

// Social functions
function showUserSearchModal() {
    document.getElementById('user-search-modal').classList.remove('hidden');
    document.getElementById('user-search-input').value = '';
    document.getElementById('user-search-results').innerHTML = `
        <div class="text-center text-gray-400 py-8">
            <i class="fas fa-users text-4xl mb-3"></i>
            <p>이름이나 이메일로 친구를 검색해보세요</p>
        </div>
    `;
}

function hideUserSearchModal() {
    document.getElementById('user-search-modal').classList.add('hidden');
}

async function searchUsers(query) {
    if (query.length < 2) {
        document.getElementById('user-search-results').innerHTML = `
            <div class="text-center text-gray-400 py-8">
                <i class="fas fa-users text-4xl mb-3"></i>
                <p>최소 2글자 이상 입력해주세요</p>
            </div>
        `;
        return;
    }
    
    try {
        const response = await axios.get(`${API_BASE}/social/users/search?q=${encodeURIComponent(query)}`);
        const users = response.data;
        
        const resultsContainer = document.getElementById('user-search-results');
        
        if (users.length === 0) {
            resultsContainer.innerHTML = `
                <div class="text-center text-gray-400 py-8">
                    <i class="fas fa-search text-4xl mb-3"></i>
                    <p>검색 결과가 없습니다</p>
                </div>
            `;
            return;
        }
        
        resultsContainer.innerHTML = users.map(user => `
            <div class="flex items-center justify-between p-4 bg-dark-bg rounded-lg border border-dark-border hover:border-accent-blue transition">
                <div class="flex items-center space-x-3 flex-1 cursor-pointer" onclick="showUserProfile('${user.id}')">
                    <div class="w-12 h-12 bg-gradient-to-br from-accent-blue to-accent-green rounded-full flex items-center justify-center">
                        <span class="text-white font-bold text-lg">${user.name[0]}</span>
                    </div>
                    <div class="flex-1">
                        <div class="font-semibold text-gray-200">${user.name}</div>
                        <div class="text-sm text-gray-400">${user.email}</div>
                        ${user.follows_you ? '<span class="text-xs text-accent-blue">나를 팔로우함</span>' : ''}
                    </div>
                </div>
                <button onclick="toggleFollow('${user.id}', ${user.is_following})" 
                    class="px-4 py-2 rounded-lg font-medium text-sm transition ${user.is_following ? 'bg-gray-700 text-gray-200 hover:bg-gray-600' : 'bg-accent-blue text-white hover:bg-opacity-90'}">
                    ${user.is_following ? '팔로잉' : '팔로우'}
                </button>
            </div>
        `).join('');
    } catch (error) {
        console.error('Search users error:', error);
        showToast('사용자 검색에 실패했습니다', 'error');
    }
}

async function showUserProfile(userId) {
    try {
        showLoading();
        const response = await axios.get(`${API_BASE}/social/users/${userId}`);
        const user = response.data;
        
        hideUserSearchModal();
        
        const content = document.getElementById('user-profile-content');
        content.innerHTML = `
            <div class="text-center mb-6">
                <div class="w-24 h-24 bg-gradient-to-br from-accent-blue to-accent-green rounded-full flex items-center justify-center mx-auto mb-4">
                    <span class="text-white font-bold text-4xl">${user.name[0]}</span>
                </div>
                <h3 class="text-2xl font-bold text-gray-200 mb-2">${user.name}</h3>
                <p class="text-gray-400">${user.email}</p>
                ${user.follows_you ? '<p class="text-sm text-accent-blue mt-2">나를 팔로우합니다</p>' : ''}
            </div>
            
            <div class="grid grid-cols-3 gap-4 mb-6">
                <div class="text-center p-4 bg-dark-bg rounded-lg">
                    <div class="text-2xl font-bold text-accent-blue">${user.workout_count}</div>
                    <div class="text-sm text-gray-400">운동</div>
                </div>
                <div class="text-center p-4 bg-dark-bg rounded-lg cursor-pointer hover:bg-opacity-80" onclick="showFollowersList('${user.id}')">
                    <div class="text-2xl font-bold text-accent-green">${user.followers_count}</div>
                    <div class="text-sm text-gray-400">팔로워</div>
                </div>
                <div class="text-center p-4 bg-dark-bg rounded-lg cursor-pointer hover:bg-opacity-80" onclick="showFollowingList('${user.id}')">
                    <div class="text-2xl font-bold text-accent-purple">${user.following_count}</div>
                    <div class="text-sm text-gray-400">팔로잉</div>
                </div>
            </div>
            
            <div class="grid grid-cols-2 gap-4 mb-6">
                <div class="p-4 bg-dark-bg rounded-lg">
                    <div class="text-sm text-gray-400 mb-1">총 거리</div>
                    <div class="text-xl font-bold text-gray-200">${user.total_distance_km.toFixed(1)} km</div>
                </div>
                <div class="p-4 bg-dark-bg rounded-lg">
                    <div class="text-sm text-gray-400 mb-1">총 시간</div>
                    <div class="text-xl font-bold text-gray-200">${user.total_duration_min} 분</div>
                </div>
            </div>
            
            <button id="profile-follow-btn" onclick="toggleFollowFromProfile('${user.id}', ${user.is_following})" 
                class="w-full py-3 rounded-lg font-semibold transition ${user.is_following ? 'bg-gray-700 text-gray-200 hover:bg-gray-600' : 'bg-accent-blue text-white hover:bg-opacity-90'}">
                ${user.is_following ? '팔로잉 중' : '팔로우'}
            </button>
        `;
        
        document.getElementById('user-profile-modal').classList.remove('hidden');
        hideLoading();
    } catch (error) {
        hideLoading();
        console.error('Load user profile error:', error);
        showToast('프로필을 불러오는데 실패했습니다', 'error');
    }
}

function hideUserProfileModal() {
    document.getElementById('user-profile-modal').classList.add('hidden');
}

async function toggleFollow(userId, isFollowing) {
    try {
        if (isFollowing) {
            await axios.delete(`${API_BASE}/social/users/${userId}/follow`);
            showToast('언팔로우했습니다', 'info');
        } else {
            await axios.post(`${API_BASE}/social/users/${userId}/follow`);
            showToast('팔로우했습니다! 👥', 'success');
        }
        
        // Refresh search results
        const searchInput = document.getElementById('user-search-input');
        if (searchInput.value) {
            await searchUsers(searchInput.value);
        }
    } catch (error) {
        console.error('Toggle follow error:', error);
        showToast('팔로우 변경에 실패했습니다', 'error');
    }
}

async function toggleFollowFromProfile(userId, isFollowing) {
    try {
        if (isFollowing) {
            await axios.delete(`${API_BASE}/social/users/${userId}/follow`);
            showToast('언팔로우했습니다', 'info');
        } else {
            await axios.post(`${API_BASE}/social/users/${userId}/follow`);
            showToast('팔로우했습니다! 👥', 'success');
        }
        
        // Reload profile
        hideUserProfileModal();
        await showUserProfile(userId);
    } catch (error) {
        console.error('Toggle follow error:', error);
        showToast('팔로우 변경에 실패했습니다', 'error');
    }
}

async function switchFeedFilter(filter) {
    currentFeedFilter = filter;
    
    // Update button states
    document.querySelectorAll('.feed-filter-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.feedFilter === filter) {
            btn.classList.add('active');
        }
    });
    
    // Load appropriate feed
    await loadFeed();
}

// Update loadFeed to support following filter
async function loadFeedWithFilter() {
    try {
        let response;
        
        if (currentFeedFilter === 'following') {
            response = await axios.get(`${API_BASE}/social/feed/following`);
        } else {
            response = await axios.get(`${API_BASE}/workouts/feed`);
        }
        
        allWorkouts = response.data;
        
        // Apply filters
        applyFilters();
    } catch (error) {
        console.error('Error loading feed:', error);
        showToast('피드를 불러오는데 실패했습니다', 'error');
    }
}

async function showFollowersList(userId) {
    try {
        showLoading();
        const response = await axios.get(`${API_BASE}/social/users/${userId}/followers`);
        const followers = response.data;
        
        hideLoading();
        
        if (followers.length === 0) {
            showToast('팔로워가 없습니다', 'info');
            return;
        }
        
        // Show in search modal
        hideUserProfileModal();
        showUserSearchModal();
        
        document.getElementById('user-search-results').innerHTML = `
            <div class="mb-4 text-lg font-bold text-gray-200">팔로워 목록</div>
            ${followers.map(user => `
                <div class="flex items-center justify-between p-4 bg-dark-bg rounded-lg border border-dark-border hover:border-accent-blue transition">
                    <div class="flex items-center space-x-3 flex-1 cursor-pointer" onclick="showUserProfile('${user.id}')">
                        <div class="w-12 h-12 bg-gradient-to-br from-accent-blue to-accent-green rounded-full flex items-center justify-center">
                            <span class="text-white font-bold text-lg">${user.name[0]}</span>
                        </div>
                        <div class="flex-1">
                            <div class="font-semibold text-gray-200">${user.name}</div>
                            <div class="text-sm text-gray-400">${user.email}</div>
                        </div>
                    </div>
                    <button onclick="toggleFollow('${user.id}', ${user.is_following})" 
                        class="px-4 py-2 rounded-lg font-medium text-sm transition ${user.is_following ? 'bg-gray-700 text-gray-200 hover:bg-gray-600' : 'bg-accent-blue text-white hover:bg-opacity-90'}">
                        ${user.is_following ? '팔로잉' : '팔로우'}
                    </button>
                </div>
            `).join('')}
        `;
    } catch (error) {
        hideLoading();
        console.error('Load followers error:', error);
        showToast('팔로워 목록을 불러오는데 실패했습니다', 'error');
    }
}

async function showFollowingList(userId) {
    try {
        showLoading();
        const response = await axios.get(`${API_BASE}/social/users/${userId}/following`);
        const following = response.data;
        
        hideLoading();
        
        if (following.length === 0) {
            showToast('팔로잉이 없습니다', 'info');
            return;
        }
        
        // Show in search modal
        hideUserProfileModal();
        showUserSearchModal();
        
        document.getElementById('user-search-results').innerHTML = `
            <div class="mb-4 text-lg font-bold text-gray-200">팔로잉 목록</div>
            ${following.map(user => `
                <div class="flex items-center justify-between p-4 bg-dark-bg rounded-lg border border-dark-border hover:border-accent-blue transition">
                    <div class="flex items-center space-x-3 flex-1 cursor-pointer" onclick="showUserProfile('${user.id}')">
                        <div class="w-12 h-12 bg-gradient-to-br from-accent-blue to-accent-green rounded-full flex items-center justify-center">
                            <span class="text-white font-bold text-lg">${user.name[0]}</span>
                        </div>
                        <div class="flex-1">
                            <div class="font-semibold text-gray-200">${user.name}</div>
                            <div class="text-sm text-gray-400">${user.email}</div>
                        </div>
                    </div>
                    <button onclick="toggleFollow('${user.id}', ${user.is_following})" 
                        class="px-4 py-2 rounded-lg font-medium text-sm transition ${user.is_following ? 'bg-gray-700 text-gray-200 hover:bg-gray-600' : 'bg-accent-blue text-white hover:bg-opacity-90'}">
                        ${user.is_following ? '팔로잉' : '팔로우'}
                    </button>
                </div>
            `).join('')}
        `;
    } catch (error) {
        hideLoading();
        console.error('Load following error:', error);
        showToast('팔로잉 목록을 불러오는데 실패했습니다', 'error');
    }
}

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

// ================================
// Challenge System Functions
// ================================

// Load challenges and badges
async function loadChallenges() {
    try {
        const response = await axios.get(`${API_BASE}/challenges`);
        const challenges = response.data;
        
        const container = document.getElementById('challenges-list');
        if (!container) return;
        
        if (challenges.length === 0) {
            container.innerHTML = `
                <div class="text-center py-12 text-gray-400">
                    <i class="fas fa-trophy text-5xl mb-4 opacity-50"></i>
                    <p class="text-lg">아직 진행 중인 챌린지가 없습니다</p>
                    <p class="text-sm mt-2">첫 번째 챌린지를 만들어보세요!</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = challenges.map(challenge => {
            const startDate = new Date(challenge.start_date);
            const endDate = new Date(challenge.end_date);
            const now = new Date();
            const isActive = now >= startDate && now <= endDate;
            const isUpcoming = now < startDate;
            const isEnded = now > endDate;
            
            let statusBadge = '';
            if (isActive) {
                statusBadge = '<span class="bg-green-500 text-white text-xs px-2 py-1 rounded">진행중</span>';
            } else if (isUpcoming) {
                statusBadge = '<span class="bg-blue-500 text-white text-xs px-2 py-1 rounded">시작 전</span>';
            } else {
                statusBadge = '<span class="bg-gray-500 text-white text-xs px-2 py-1 rounded">종료</span>';
            }
            
            const typeIcons = {
                'DISTANCE': '🏃',
                'DURATION': '⏱️',
                'COUNT': '🔢'
            };
            
            const typeLabels = {
                'DISTANCE': '거리',
                'DURATION': '시간',
                'COUNT': '횟수'
            };
            
            return `
                <div class="workout-card rounded-xl p-6 cursor-pointer" onclick="showChallengeDetailModal('${challenge.id}')">
                    <div class="flex justify-between items-start mb-4">
                        <div class="flex-1">
                            <div class="flex items-center space-x-2 mb-2">
                                <span class="text-2xl">${typeIcons[challenge.challenge_type]}</span>
                                <h3 class="text-xl font-bold text-gray-200">${challenge.title}</h3>
                            </div>
                            <p class="text-gray-400 text-sm mb-2">${challenge.description || ''}</p>
                            <div class="flex items-center space-x-3 text-xs text-gray-500">
                                <span><i class="fas fa-user mr-1"></i>${challenge.creator_name}</span>
                                <span><i class="fas fa-users mr-1"></i>${challenge.participants_count}명 참가</span>
                            </div>
                        </div>
                        <div class="flex flex-col items-end space-y-2">
                            ${statusBadge}
                            ${challenge.is_participating ? '<span class="bg-accent-blue text-white text-xs px-2 py-1 rounded">참가중</span>' : ''}
                        </div>
                    </div>
                    
                    <div class="border-t border-dark-border pt-4">
                        <div class="flex justify-between items-center text-sm">
                            <div>
                                <span class="text-gray-400">${typeLabels[challenge.challenge_type]} 목표:</span>
                                <span class="text-accent-green font-bold ml-2">
                                    ${challenge.target_value}${challenge.challenge_type === 'DISTANCE' ? 'km' : challenge.challenge_type === 'DURATION' ? '분' : '회'}
                                </span>
                            </div>
                            <div class="text-gray-500">
                                ${startDate.toLocaleDateString()} ~ ${endDate.toLocaleDateString()}
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
        
    } catch (error) {
        console.error('Failed to load challenges:', error);
        showToast('챌린지를 불러오는데 실패했습니다', 'error');
    }
}

// Load user badges
async function loadBadges() {
    try {
        const response = await axios.get(`${API_BASE}/challenges/badges/me`);
        const { earned, all } = response.data;
        
        const container = document.getElementById('badges-collection');
        if (!container) return;
        
        container.innerHTML = all.map(badge => {
            const isEarned = earned.some(e => e.badge_id === badge.id);
            
            return `
                <div class="stat-card rounded-lg p-4 text-center ${isEarned ? '' : 'opacity-40'}">
                    <div class="text-4xl mb-2">${badge.icon}</div>
                    <h4 class="font-bold text-gray-200 text-sm mb-1">${badge.name}</h4>
                    <p class="text-xs text-gray-400 mb-2">${badge.description}</p>
                    ${isEarned ? 
                        `<div class="text-xs text-accent-green font-bold">✓ 획득</div>` : 
                        `<div class="text-xs text-gray-500">미획득</div>`
                    }
                </div>
            `;
        }).join('');
        
        // Update badge count
        document.getElementById('earned-badges-count').textContent = earned.length;
        document.getElementById('total-badges-count').textContent = all.length;
        
    } catch (error) {
        console.error('Failed to load badges:', error);
        showToast('배지를 불러오는데 실패했습니다', 'error');
    }
}

// Show challenge detail modal with leaderboard
async function showChallengeDetailModal(challengeId) {
    try {
        showLoading();
        const response = await axios.get(`${API_BASE}/challenges/${challengeId}`);
        hideLoading();
        
        const challenge = response.data;
        const leaderboard = challenge.leaderboard || [];
        
        const typeLabels = {
            'DISTANCE': '거리',
            'DURATION': '시간',
            'COUNT': '횟수'
        };
        
        const typeUnits = {
            'DISTANCE': 'km',
            'DURATION': '분',
            'COUNT': '회'
        };
        
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4';
        modal.innerHTML = `
            <div class="bg-dark-card rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div class="p-6 border-b border-dark-border">
                    <div class="flex justify-between items-start mb-4">
                        <h2 class="text-2xl font-bold text-gray-200">${challenge.title}</h2>
                        <button onclick="this.closest('.fixed').remove()" class="text-gray-400 hover:text-gray-200">
                            <i class="fas fa-times text-xl"></i>
                        </button>
                    </div>
                    <p class="text-gray-400 mb-4">${challenge.description || ''}</p>
                    
                    <div class="grid grid-cols-2 gap-4 mb-4">
                        <div class="bg-dark-bg rounded-lg p-4">
                            <div class="text-gray-400 text-sm mb-1">목표</div>
                            <div class="text-accent-green text-2xl font-bold">
                                ${challenge.target_value}${typeUnits[challenge.challenge_type]}
                            </div>
                        </div>
                        <div class="bg-dark-bg rounded-lg p-4">
                            <div class="text-gray-400 text-sm mb-1">참가자</div>
                            <div class="text-accent-blue text-2xl font-bold">${challenge.participants_count}명</div>
                        </div>
                    </div>
                    
                    <div class="flex items-center justify-between text-sm text-gray-400 mb-4">
                        <span><i class="fas fa-calendar mr-2"></i>${new Date(challenge.start_date).toLocaleDateString()} ~ ${new Date(challenge.end_date).toLocaleDateString()}</span>
                        <span><i class="fas fa-user mr-2"></i>${challenge.creator_name}</span>
                    </div>
                    
                    ${challenge.is_participating ? `
                        <button onclick="leaveChallengeConfirm('${challenge.id}')" 
                            class="w-full bg-red-600 hover:bg-red-700 text-white py-3 rounded-lg font-semibold transition">
                            <i class="fas fa-sign-out-alt mr-2"></i>챌린지 나가기
                        </button>
                    ` : `
                        <button onclick="joinChallenge('${challenge.id}')" 
                            class="w-full btn-primary text-white py-3 rounded-lg font-semibold">
                            <i class="fas fa-plus mr-2"></i>챌린지 참가하기
                        </button>
                    `}
                </div>
                
                <div class="p-6">
                    <h3 class="text-xl font-bold text-gray-200 mb-4 flex items-center">
                        <i class="fas fa-trophy text-accent-green mr-2"></i>
                        리더보드 (TOP 10)
                    </h3>
                    
                    ${leaderboard.length === 0 ? `
                        <div class="text-center py-8 text-gray-400">
                            <i class="fas fa-medal text-4xl mb-3 opacity-50"></i>
                            <p>아직 기록이 없습니다</p>
                        </div>
                    ` : `
                        <div class="space-y-3">
                            ${leaderboard.map((entry, index) => `
                                <div class="flex items-center justify-between bg-dark-bg rounded-lg p-4 ${index < 3 ? 'border-2 border-accent-green' : ''}">
                                    <div class="flex items-center space-x-4">
                                        <div class="text-2xl font-bold ${index === 0 ? 'text-yellow-500' : index === 1 ? 'text-gray-300' : index === 2 ? 'text-orange-600' : 'text-gray-500'}">
                                            ${index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                                        </div>
                                        <div>
                                            <div class="font-bold text-gray-200">${entry.name}</div>
                                            <div class="text-sm text-gray-400">${typeLabels[challenge.challenge_type]}</div>
                                        </div>
                                    </div>
                                    <div class="text-right">
                                        <div class="text-2xl font-bold text-accent-green">${entry.progress.toFixed(1)}</div>
                                        <div class="text-sm text-gray-400">${typeUnits[challenge.challenge_type]}</div>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    `}
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
    } catch (error) {
        hideLoading();
        console.error('Failed to load challenge detail:', error);
        showToast('챌린지 정보를 불러오는데 실패했습니다', 'error');
    }
}

// Show create challenge modal
function showCreateChallengeModal() {
    const modal = document.createElement('div');
    modal.id = 'create-challenge-modal';
    modal.className = 'fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4';
    modal.innerHTML = `
        <div class="bg-dark-card rounded-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto">
            <div class="p-6">
                <div class="flex justify-between items-center mb-6">
                    <h2 class="text-2xl font-bold text-gray-200">새 챌린지 만들기</h2>
                    <button onclick="document.getElementById('create-challenge-modal').remove()" class="text-gray-400 hover:text-gray-200">
                        <i class="fas fa-times text-xl"></i>
                    </button>
                </div>
                
                <form id="create-challenge-form" class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-300 mb-2">챌린지 제목 *</label>
                        <input type="text" id="challenge-title" required
                            class="w-full px-4 py-3 bg-dark-bg border border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-blue text-gray-200"
                            placeholder="예: 12월 100km 달리기 챌린지">
                    </div>
                    
                    <div>
                        <label class="block text-sm font-medium text-gray-300 mb-2">설명</label>
                        <textarea id="challenge-description" rows="3"
                            class="w-full px-4 py-3 bg-dark-bg border border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-blue text-gray-200"
                            placeholder="챌린지에 대한 설명을 입력하세요"></textarea>
                    </div>
                    
                    <div>
                        <label class="block text-sm font-medium text-gray-300 mb-2">챌린지 타입 *</label>
                        <select id="challenge-type" required
                            class="w-full px-4 py-3 bg-dark-bg border border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-blue text-gray-200">
                            <option value="DISTANCE">🏃 거리 (km)</option>
                            <option value="DURATION">⏱️ 시간 (분)</option>
                            <option value="COUNT">🔢 횟수 (회)</option>
                        </select>
                    </div>
                    
                    <div>
                        <label class="block text-sm font-medium text-gray-300 mb-2">목표 값 *</label>
                        <input type="number" id="challenge-target" required min="1" step="0.1"
                            class="w-full px-4 py-3 bg-dark-bg border border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-blue text-gray-200"
                            placeholder="예: 100">
                    </div>
                    
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-300 mb-2">시작일 *</label>
                            <input type="date" id="challenge-start-date" required
                                class="w-full px-4 py-3 bg-dark-bg border border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-blue text-gray-200">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-300 mb-2">종료일 *</label>
                            <input type="date" id="challenge-end-date" required
                                class="w-full px-4 py-3 bg-dark-bg border border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-blue text-gray-200">
                        </div>
                    </div>
                    
                    <div class="flex items-center space-x-2">
                        <input type="checkbox" id="challenge-is-public" checked
                            class="w-5 h-5 text-accent-blue bg-dark-bg border-dark-border rounded focus:ring-accent-blue">
                        <label for="challenge-is-public" class="text-sm text-gray-300">
                            공개 챌린지 (모든 사용자가 참가 가능)
                        </label>
                    </div>
                    
                    <div class="flex space-x-4 pt-4">
                        <button type="submit" class="flex-1 btn-primary text-white py-3 rounded-lg font-semibold">
                            <i class="fas fa-plus mr-2"></i>챌린지 만들기
                        </button>
                        <button type="button" onclick="document.getElementById('create-challenge-modal').remove()"
                            class="flex-1 bg-gray-700 text-gray-200 py-3 rounded-lg hover:bg-gray-600 transition font-semibold">
                            취소
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Set default dates (today and 30 days later)
    const today = new Date();
    const endDate = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
    document.getElementById('challenge-start-date').valueAsDate = today;
    document.getElementById('challenge-end-date').valueAsDate = endDate;
    
    // Form submit handler
    document.getElementById('create-challenge-form').addEventListener('submit', handleCreateChallenge);
}

// Handle create challenge
async function handleCreateChallenge(e) {
    e.preventDefault();
    
    const title = document.getElementById('challenge-title').value;
    const description = document.getElementById('challenge-description').value;
    const challenge_type = document.getElementById('challenge-type').value;
    const target_value = parseFloat(document.getElementById('challenge-target').value);
    const start_date = document.getElementById('challenge-start-date').value;
    const end_date = document.getElementById('challenge-end-date').value;
    const is_public = document.getElementById('challenge-is-public').checked ? 1 : 0;
    
    try {
        showLoading();
        await axios.post(`${API_BASE}/challenges`, {
            title,
            description,
            challenge_type,
            target_value,
            start_date,
            end_date,
            is_public
        });
        
        hideLoading();
        document.getElementById('create-challenge-modal').remove();
        showToast('챌린지가 생성되었습니다!', 'success');
        await loadChallenges();
        
    } catch (error) {
        hideLoading();
        console.error('Failed to create challenge:', error);
        showToast('챌린지 생성에 실패했습니다: ' + (error.response?.data?.error || error.message), 'error');
    }
}

// Join challenge
async function joinChallenge(challengeId) {
    try {
        showLoading();
        await axios.post(`${API_BASE}/challenges/${challengeId}/join`);
        hideLoading();
        
        showToast('챌린지에 참가했습니다!', 'success');
        document.querySelector('.fixed').remove(); // Close modal
        await loadChallenges();
        
    } catch (error) {
        hideLoading();
        console.error('Failed to join challenge:', error);
        showToast('챌린지 참가에 실패했습니다: ' + (error.response?.data?.error || error.message), 'error');
    }
}

// Leave challenge with confirmation
function leaveChallengeConfirm(challengeId) {
    if (confirm('정말 이 챌린지에서 나가시겠습니까?')) {
        leaveChallenge(challengeId);
    }
}

// Leave challenge
async function leaveChallenge(challengeId) {
    try {
        showLoading();
        await axios.delete(`${API_BASE}/challenges/${challengeId}/join`);
        hideLoading();
        
        showToast('챌린지에서 나갔습니다', 'success');
        document.querySelector('.fixed').remove(); // Close modal
        await loadChallenges();
        
    } catch (error) {
        hideLoading();
        console.error('Failed to leave challenge:', error);
        showToast('챌린지 나가기에 실패했습니다: ' + (error.response?.data?.error || error.message), 'error');
    }
}

// Check and award badges after workout
async function checkBadges() {
    try {
        const response = await axios.post(`${API_BASE}/challenges/badges/check`);
        const newBadges = response.data.new_badges || [];
        
        // Show toast for each new badge
        for (const badge of newBadges) {
            showToast(`🎉 배지 획득: ${badge.icon} ${badge.name}!`, 'success');
        }
        
        if (newBadges.length > 0) {
            await loadBadges();
        }
        
    } catch (error) {
        console.error('Failed to check badges:', error);
    }
}

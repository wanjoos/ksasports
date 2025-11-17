// Global state
let token = localStorage.getItem('token');
let currentView = 'feed';
let currentUser = null;

const API_BASE = '/api';

// Axios config
axios.defaults.headers.common['Authorization'] = token ? `Bearer ${token}` : '';

// Initialize app
document.addEventListener('DOMContentLoaded', async () => {
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
});

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
    
    try {
        const response = await axios.post(`${API_BASE}/auth/login`, { email, password });
        token = response.data.token;
        currentUser = response.data.user;
        localStorage.setItem('token', token);
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        
        showView('feed');
        await loadFeed();
    } catch (error) {
        showError('로그인 실패: ' + (error.response?.data?.error || error.message));
    }
}

async function handleSignup(e) {
    e.preventDefault();
    const name = document.getElementById('signup-name').value;
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    const height_cm = document.getElementById('signup-height').value;
    
    try {
        const response = await axios.post(`${API_BASE}/auth/signup`, { 
            name, email, password, height_cm: height_cm ? parseInt(height_cm) : null 
        });
        token = response.data.token;
        currentUser = response.data.user;
        localStorage.setItem('token', token);
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        
        showView('feed');
        await loadFeed();
    } catch (error) {
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
                    <button class="flex items-center space-x-2 text-gray-400 hover:text-accent-blue transition text-sm md:text-base">
                        <i class="far fa-comment"></i>
                        <span>${workout.comments_count}</span>
                    </button>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Failed to load feed:', error);
        showError('피드를 불러오는데 실패했습니다.');
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
        
        showView('feed');
        document.getElementById('add-workout-form').reset();
        document.getElementById('image-preview').innerHTML = '';
    } catch (error) {
        console.error('Failed to add workout:', error);
        alert('운동 기록 추가에 실패했습니다: ' + (error.response?.data?.error || error.message));
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
                alert('최대 3장까지만 업로드할 수 있습니다.');
            }
        });
    }
});

// Stats functions
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
        
        // By type
        const byTypeContainer = document.getElementById('stats-by-type');
        byTypeContainer.innerHTML = stats.by_type.map(type => `
            <div class="flex items-center justify-between p-3 bg-gray-50 rounded">
                <div class="flex items-center space-x-3">
                    <span class="text-2xl">${getWorkoutEmoji(type.workout_type)}</span>
                    <span class="font-medium">${getWorkoutTypeName(type.workout_type)}</span>
                </div>
                <div class="text-right text-sm text-gray-600">
                    <div>${type.count}회 · ${type.duration_min}분</div>
                    ${type.distance_km > 0 ? `<div>${type.distance_km.toFixed(1)} km</div>` : ''}
                </div>
            </div>
        `).join('') || '<p class="text-gray-500">데이터가 없습니다</p>';
        
        // Highlights
        const highlightsContainer = document.getElementById('stats-highlights');
        highlightsContainer.innerHTML = `
            <div class="text-center">
                <div class="text-3xl mb-2">🏆</div>
                <div class="text-sm text-gray-600">최장 거리</div>
                <div class="text-xl font-bold text-gray-800">${highlights.longest_distance_km.toFixed(1)} km</div>
            </div>
            <div class="text-center">
                <div class="text-3xl mb-2">⏱️</div>
                <div class="text-sm text-gray-600">최장 시간</div>
                <div class="text-xl font-bold text-gray-800">${highlights.longest_duration_min} 분</div>
            </div>
            <div class="text-center">
                <div class="text-3xl mb-2">🔥</div>
                <div class="text-sm text-gray-600">연속 운동일</div>
                <div class="text-xl font-bold text-gray-800">${highlights.streak_days} 일</div>
            </div>
        `;
    } catch (error) {
        console.error('Failed to load stats:', error);
    }
}

// Weight functions
async function loadWeight() {
    try {
        const response = await axios.get(`${API_BASE}/me/weights`);
        const weights = response.data;
        
        const weightList = document.getElementById('weight-list');
        
        if (weights.length === 0) {
            weightList.innerHTML = `
                <div class="bg-white rounded-lg shadow-md p-8 text-center text-gray-500">
                    <p>체중 기록이 없습니다</p>
                </div>
            `;
            return;
        }
        
        weightList.innerHTML = weights.map(weight => `
            <div class="bg-white rounded-lg shadow-md p-4 flex justify-between items-center">
                <div>
                    <div class="font-semibold text-gray-800">${weight.weight_kg} kg</div>
                    <div class="text-sm text-gray-500">${formatDate(weight.logged_at)}</div>
                </div>
                <button onclick="deleteWeight('${weight.id}')" class="text-red-500 hover:text-red-700 transition">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `).join('');
    } catch (error) {
        console.error('Failed to load weight:', error);
    }
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
        alert('체중 기록 추가에 실패했습니다: ' + (error.response?.data?.error || error.message));
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
        alert('체중 기록 삭제에 실패했습니다');
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
        'RUN': '🏃',
        'WALK': '🚶',
        'BIKE': '🚴',
        'BADMINTON': '🏸',
        'WEIGHT': '🏋️',
        'OTHER': '💪'
    };
    return emojis[type] || '💪';
}

function getWorkoutTypeName(type) {
    const names = {
        'RUN': '러닝',
        'WALK': '걷기',
        'BIKE': '사이클',
        'BADMINTON': '배드민턴',
        'WEIGHT': '웨이트',
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
        await loadFeed();
    } catch (error) {
        console.error('Failed to delete workout:', error);
        alert('운동 기록 삭제에 실패했습니다');
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
        alert('프로필이 업데이트되었습니다');
    } catch (error) {
        console.error('Failed to update profile:', error);
        alert('프로필 업데이트에 실패했습니다: ' + (error.response?.data?.error || error.message));
    }
}

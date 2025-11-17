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
        if (e.target.id === 'nav-feed') showView('feed');
        if (e.target.id === 'nav-stats') showView('stats');
        if (e.target.id === 'nav-weight') showView('weight');
        if (e.target.id === 'nav-logout') handleLogout();
        if (e.target.id === 'btn-add-workout') showView('add-workout');
        if (e.target.id === 'btn-cancel-workout') showView('feed');
        if (e.target.id === 'btn-add-weight') showAddWeightModal();
        if (e.target.id === 'close-weight-modal') hideAddWeightModal();
        if (e.target.id === 'cancel-weight-modal') hideAddWeightModal();
    });
    
    // Add workout form
    document.getElementById('add-workout-form')?.addEventListener('submit', handleAddWorkout);
    
    // Add weight form
    document.getElementById('add-weight-form')?.addEventListener('submit', handleAddWeight);
    
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
    
    // Update navigation
    updateNavigation();
    
    // Load data for view
    if (view === 'feed') loadFeed();
    if (view === 'stats') loadStats();
    if (view === 'weight') loadWeight();
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
            <div class="workout-card bg-white rounded-lg shadow-md p-6">
                <div class="flex items-start justify-between mb-4">
                    <div class="flex items-center space-x-3">
                        <div class="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                            <span class="text-blue-600 font-bold">${workout.user.name[0]}</span>
                        </div>
                        <div>
                            <div class="font-semibold text-gray-800">${workout.user.name}</div>
                            <div class="text-sm text-gray-500">${formatDate(workout.created_at)}</div>
                        </div>
                    </div>
                    <div class="flex items-center space-x-3">
                        <div class="text-2xl">${getWorkoutEmoji(workout.workout_type)}</div>
                        ${workout.user.id === currentUser.id ? `
                            <div class="relative">
                                <button onclick="toggleWorkoutMenu('${workout.id}')" class="text-gray-400 hover:text-gray-600">
                                    <i class="fas fa-ellipsis-v"></i>
                                </button>
                                <div id="menu-${workout.id}" class="hidden absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg z-10">
                                    <button onclick="deleteWorkout('${workout.id}')" class="w-full text-left px-4 py-2 text-red-600 hover:bg-gray-100 rounded-lg">
                                        <i class="fas fa-trash mr-2"></i>삭제
                                    </button>
                                </div>
                            </div>
                        ` : ''}
                    </div>
                </div>
                
                <div class="mb-4">
                    <div class="text-lg font-semibold text-gray-800 mb-2">${getWorkoutTypeName(workout.workout_type)}</div>
                    <div class="flex flex-wrap gap-4 text-sm text-gray-600">
                        ${workout.distance_km ? `<span><i class="fas fa-route mr-1"></i>${workout.distance_km} km</span>` : ''}
                        <span><i class="fas fa-clock mr-1"></i>${workout.duration_min} 분</span>
                        ${workout.pace_sec_per_km ? `<span><i class="fas fa-tachometer-alt mr-1"></i>${formatPace(workout.pace_sec_per_km)}</span>` : ''}
                        ${workout.calories ? `<span><i class="fas fa-fire mr-1"></i>${workout.calories} kcal</span>` : ''}
                    </div>
                    ${workout.memo ? `<p class="mt-3 text-gray-700">${workout.memo}</p>` : ''}
                    ${workout.images && workout.images.length > 0 ? `
                        <div class="mt-3 grid ${workout.images.length === 1 ? 'grid-cols-1' : 'grid-cols-2 md:grid-cols-3'} gap-2">
                            ${workout.images.map(img => `
                                <img src="${img}" alt="운동 이미지" class="rounded-lg object-cover w-full h-48 cursor-pointer" onclick="window.open('${img}', '_blank')">
                            `).join('')}
                        </div>
                    ` : ''}
                </div>
                
                <div class="flex items-center space-x-6 pt-4 border-t">
                    <button onclick="toggleLike('${workout.id}')" class="flex items-center space-x-2 text-gray-600 hover:text-red-500 transition">
                        <i class="fa${workout.liked_by_me ? 's' : 'r'} fa-heart ${workout.liked_by_me ? 'text-red-500' : ''}"></i>
                        <span id="likes-${workout.id}">${workout.likes_count}</span>
                    </button>
                    <button class="flex items-center space-x-2 text-gray-600 hover:text-blue-500 transition">
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

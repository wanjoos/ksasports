import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serveStatic } from 'hono/cloudflare-workers';
import type { Bindings } from './types';

// Import routes
import auth from './routes/auth';
import workouts from './routes/workouts';
import stats from './routes/stats';
import weight from './routes/weight';
import upload from './routes/upload';
import profile from './routes/profile';

const app = new Hono<{ Bindings: Bindings }>();

// Enable CORS for API routes
app.use('/api/*', cors());

// Serve static files
app.use('/static/*', serveStatic({ root: './' }));

// API routes
app.route('/api/auth', auth);
app.route('/api/workouts', workouts);
app.route('/api/me/stats', stats);
app.route('/api/me/weights', weight);
app.route('/api/me/profile', profile);
app.route('/api/upload', upload);

// Serve images from R2
app.get('/images/*', async (c) => {
  const path = c.req.path.replace('/images/', '');
  return c.redirect(`/api/upload/${path}`);
});

// Home page
app.get('/', (c) => {
  return c.html(`
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <meta name="theme-color" content="#0a0e27">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
    <meta name="apple-mobile-web-app-title" content="Workout">
    <link rel="manifest" href="/manifest.json">
    <link rel="apple-touch-icon" href="/icon-192.png">
    <title>Workout Together - 함께하는 운동 기록</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
    <script>
        tailwind.config = {
            theme: {
                extend: {
                    colors: {
                        'dark-bg': '#0a0e27',
                        'dark-card': '#141b2d',
                        'dark-border': '#1f2937',
                        'accent-blue': '#00d4ff',
                        'accent-green': '#00ff88',
                        'accent-orange': '#ff6b35',
                        'accent-purple': '#a855f7'
                    }
                }
            }
        }
    </script>
    <style>
        * {
            -webkit-tap-highlight-color: transparent;
        }
        body {
            background: linear-gradient(135deg, #0a0e27 0%, #1a1f3a 100%);
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            overflow-x: hidden;
        }
        .workout-card {
            transition: all 0.3s ease;
            background: linear-gradient(135deg, #141b2d 0%, #1f2937 100%);
        }
        .workout-card:active {
            transform: scale(0.98);
        }
        @media (min-width: 768px) {
            .workout-card:hover {
                transform: translateY(-4px);
                box-shadow: 0 8px 24px rgba(0, 212, 255, 0.2);
            }
        }
        .stat-card {
            background: linear-gradient(135deg, #141b2d 0%, #1f2937 100%);
            border: 1px solid rgba(0, 212, 255, 0.1);
            transition: all 0.3s ease;
        }
        .stat-card:active {
            transform: scale(0.98);
        }
        @media (min-width: 768px) {
            .stat-card:hover {
                border-color: rgba(0, 212, 255, 0.4);
                box-shadow: 0 4px 16px rgba(0, 212, 255, 0.15);
            }
        }
        .nav-link {
            transition: all 0.2s;
            position: relative;
        }
        .nav-link.active::after {
            content: '';
            position: absolute;
            bottom: -8px;
            left: 0;
            right: 0;
            height: 2px;
            background: linear-gradient(90deg, #00d4ff, #00ff88);
        }
        .gradient-text {
            background: linear-gradient(90deg, #00d4ff, #00ff88);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }
        .btn-primary {
            background: linear-gradient(135deg, #00d4ff 0%, #0099cc 100%);
            transition: all 0.3s ease;
        }
        .btn-primary:active {
            transform: scale(0.95);
        }
        @media (min-width: 768px) {
            .btn-primary:hover {
                box-shadow: 0 4px 16px rgba(0, 212, 255, 0.4);
                transform: translateY(-2px);
            }
        }
        input, select, textarea {
            background: #1f2937 !important;
            border-color: #374151 !important;
            color: #e5e7eb !important;
            font-size: 16px !important; /* Prevent zoom on iOS */
        }
        input:focus, select:focus, textarea:focus {
            border-color: #00d4ff !important;
            box-shadow: 0 0 0 3px rgba(0, 212, 255, 0.1) !important;
        }
        /* Mobile bottom navigation */
        @media (max-width: 767px) {
            body {
                padding-bottom: 80px;
            }
            .mobile-nav {
                position: fixed;
                bottom: 0;
                left: 0;
                right: 0;
                background: linear-gradient(to top, #141b2d 0%, rgba(20, 27, 45, 0.98) 100%);
                border-top: 1px solid rgba(0, 212, 255, 0.1);
                backdrop-blur-lg;
                z-index: 100;
                padding: 12px 0 env(safe-area-inset-bottom, 12px) 0;
            }
            .mobile-nav-item {
                flex: 1;
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 4px;
                padding: 8px;
                transition: all 0.2s;
            }
            .mobile-nav-item.active {
                color: #00d4ff;
            }
            .mobile-nav-item:active {
                transform: scale(0.9);
            }
        }
        /* Hide desktop nav on mobile */
        @media (max-width: 767px) {
            .desktop-nav {
                display: none !important;
            }
        }
        /* Smooth scrolling */
        html {
            scroll-behavior: smooth;
        }
        /* Toast animation */
        @keyframes slide-in {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        .animate-slide-in {
            animation: slide-in 0.3s ease-out;
        }
    </style>
</head>
<body class="bg-dark-bg text-gray-100">
    <!-- Desktop Navigation -->
    <nav class="bg-dark-card border-b border-dark-border sticky top-0 z-50 backdrop-blur-lg bg-opacity-90">
        <div class="max-w-6xl mx-auto px-4 py-3 md:py-4">
            <div class="flex justify-between items-center">
                <div class="flex items-center space-x-2 md:space-x-3">
                    <i class="fas fa-running text-accent-blue text-2xl md:text-3xl"></i>
                    <h1 class="text-lg md:text-2xl font-bold gradient-text">WORKOUT</h1>
                </div>
                <div id="nav-menu" class="desktop-nav flex items-center space-x-4 md:space-x-6">
                    <!-- Will be populated by JS for desktop -->
                </div>
            </div>
        </div>
    </nav>

    <!-- Mobile Bottom Navigation -->
    <div class="mobile-nav md:hidden">
        <div class="flex justify-around items-center">
            <button id="mobile-nav-feed" class="mobile-nav-item text-gray-400">
                <i class="fas fa-home text-xl"></i>
                <span class="text-xs">피드</span>
            </button>
            <button id="mobile-nav-add" class="mobile-nav-item text-gray-400">
                <i class="fas fa-plus-circle text-2xl"></i>
                <span class="text-xs">기록</span>
            </button>
            <button id="mobile-nav-stats" class="mobile-nav-item text-gray-400">
                <i class="fas fa-chart-bar text-xl"></i>
                <span class="text-xs">통계</span>
            </button>
            <button id="mobile-nav-weight" class="mobile-nav-item text-gray-400">
                <i class="fas fa-weight text-xl"></i>
                <span class="text-xs">체중</span>
            </button>
            <button id="mobile-nav-profile" class="mobile-nav-item text-gray-400">
                <i class="fas fa-user text-xl"></i>
                <span class="text-xs">프로필</span>
            </button>
        </div>
    </div>

    <!-- Main Content -->
    <div class="max-w-6xl mx-auto px-3 md:px-4 py-4 md:py-8">
        <!-- Auth View (Login/Signup) -->
        <div id="auth-view" class="hidden">
            <div class="max-w-md mx-auto">
                <div class="bg-dark-card rounded-xl shadow-2xl p-8 border border-dark-border">
                    <div class="text-center mb-8">
                        <i class="fas fa-running text-accent-blue text-5xl mb-4"></i>
                        <h2 class="text-2xl font-bold gradient-text">WORKOUT TOGETHER</h2>
                    </div>
                    <div class="flex space-x-4 mb-6 border-b border-dark-border">
                        <button id="tab-login" class="tab-btn pb-3 px-4 font-semibold text-accent-blue border-b-2 border-accent-blue">로그인</button>
                        <button id="tab-signup" class="tab-btn pb-3 px-4 font-semibold text-gray-400">회원가입</button>
                    </div>
                    
                    <!-- Login Form -->
                    <form id="login-form" class="space-y-5">
                        <div>
                            <label class="block text-sm font-medium text-gray-300 mb-2">이메일</label>
                            <input type="email" id="login-email" class="w-full px-4 py-3 bg-dark-bg border border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-blue" required>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-300 mb-2">비밀번호</label>
                            <input type="password" id="login-password" class="w-full px-4 py-3 bg-dark-bg border border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-blue" required>
                        </div>
                        <button type="submit" class="w-full btn-primary text-white py-3 rounded-lg font-semibold">로그인</button>
                    </form>
                    
                    <!-- Signup Form -->
                    <form id="signup-form" class="space-y-5 hidden">
                        <div>
                            <label class="block text-sm font-medium text-gray-300 mb-2">이름</label>
                            <input type="text" id="signup-name" class="w-full px-4 py-3 bg-dark-bg border border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-blue" required>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-300 mb-2">이메일</label>
                            <input type="email" id="signup-email" class="w-full px-4 py-3 bg-dark-bg border border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-blue" required>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-300 mb-2">비밀번호</label>
                            <input type="password" id="signup-password" class="w-full px-4 py-3 bg-dark-bg border border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-blue" required>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-300 mb-2">키 (cm, 선택)</label>
                            <input type="number" id="signup-height" class="w-full px-4 py-3 bg-dark-bg border border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-blue">
                        </div>
                        <button type="submit" class="w-full btn-primary text-white py-3 rounded-lg font-semibold">회원가입</button>
                    </form>
                    
                    <div id="auth-error" class="mt-4 text-red-400 text-sm hidden p-3 bg-red-900 bg-opacity-20 rounded-lg border border-red-800"></div>
                </div>
            </div>
        </div>

        <!-- Feed View -->
        <div id="feed-view" class="hidden">
            <div class="flex justify-between items-center mb-4 md:mb-8">
                <h2 class="text-2xl md:text-3xl font-bold gradient-text">활동 피드</h2>
                <button id="btn-add-workout" class="hidden md:flex btn-primary text-white px-6 py-3 rounded-lg font-semibold items-center space-x-2">
                    <i class="fas fa-plus"></i>
                    <span>운동 기록</span>
                </button>
            </div>
            <div id="feed-container" class="space-y-4 md:space-y-6">
                <!-- Feed items will be populated here -->
            </div>
        </div>

        <!-- Add Workout View -->
        <div id="add-workout-view" class="hidden">
            <div class="max-w-2xl mx-auto">
                <!-- Quick Templates -->
                <div class="mb-6">
                    <h3 class="text-sm font-medium text-gray-400 mb-3 flex items-center">
                        <i class="fas fa-bolt text-accent-blue mr-2"></i>
                        빠른 시작
                    </h3>
                    <div id="workout-templates" class="grid grid-cols-4 md:grid-cols-8 gap-2">
                        <!-- Will be populated by JS -->
                    </div>
                </div>
                
                <div class="bg-dark-card rounded-xl shadow-2xl p-8 border border-dark-border">
                    <div class="flex justify-between items-center mb-8">
                        <h2 class="text-3xl font-bold gradient-text">운동 기록 추가</h2>
                        <button type="button" id="btn-clear-form" class="text-sm text-gray-400 hover:text-accent-blue">
                            <i class="fas fa-redo mr-1"></i>초기화
                        </button>
                    </div>
                    <form id="add-workout-form" class="space-y-5">
                        <div>
                            <label class="block text-sm font-medium text-gray-300 mb-2">운동 종류</label>
                            <select id="workout-type" class="w-full px-4 py-3 bg-dark-bg border border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-blue" required>
                                <optgroup label="🏃 야외 유산소">
                                    <option value="RUN">🏃 러닝</option>
                                    <option value="WALK">🚶 걷기</option>
                                    <option value="BIKE">🚴 사이클</option>
                                    <option value="HIKING">🥾 등산</option>
                                    <option value="SWIMMING">🏊 수영</option>
                                </optgroup>
                                <optgroup label="🏠 실내 유산소">
                                    <option value="TREADMILL">🏃‍♂️ 러닝머신</option>
                                    <option value="INDOOR_BIKE">🚴‍♀️ 실내사이클</option>
                                    <option value="STEPPER">🪜 스텝퍼</option>
                                    <option value="ELLIPTICAL">⚙️ 일립티컬</option>
                                    <option value="ROWING">🚣 로잉머신</option>
                                    <option value="JUMP_ROPE">🪢 줄넘기</option>
                                </optgroup>
                                <optgroup label="💪 근력 운동">
                                    <option value="WEIGHT">🏋️ 웨이트</option>
                                    <option value="HOME_TRAINING">💪 홈트레이닝</option>
                                    <option value="CROSSFIT">🤸 크로스핏</option>
                                    <option value="CALISTHENICS">🤸‍♂️ 맨몸운동</option>
                                </optgroup>
                                <optgroup label="🏀 구기 종목">
                                    <option value="BADMINTON">🏸 배드민턴</option>
                                    <option value="TENNIS">🎾 테니스</option>
                                    <option value="TABLE_TENNIS">🏓 탁구</option>
                                    <option value="BASKETBALL">🏀 농구</option>
                                    <option value="SOCCER">⚽ 축구</option>
                                    <option value="VOLLEYBALL">🏐 배구</option>
                                    <option value="GOLF">⛳ 골프</option>
                                </optgroup>
                                <optgroup label="🥊 격투기">
                                    <option value="BOXING">🥊 복싱</option>
                                    <option value="TAEKWONDO">🥋 태권도</option>
                                    <option value="JUDO">🥋 유도</option>
                                </optgroup>
                                <optgroup label="🧘 기타 스포츠">
                                    <option value="YOGA">🧘 요가</option>
                                    <option value="PILATES">🧘‍♀️ 필라테스</option>
                                    <option value="CLIMBING">🧗 클라이밍</option>
                                    <option value="SKIING">⛷️ 스키</option>
                                    <option value="SKATEBOARD">🛹 스케이트보드</option>
                                    <option value="DANCE">💃 댄스</option>
                                </optgroup>
                                <optgroup label="기타">
                                    <option value="OTHER">⚡ 기타</option>
                                </optgroup>
                            </select>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-300 mb-2">시작 시간</label>
                            <input type="datetime-local" id="workout-started" class="w-full px-4 py-3 bg-dark-bg border border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-blue" required>
                        </div>
                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <label class="block text-sm font-medium text-gray-300 mb-2">운동 시간 (분)</label>
                                <input type="number" id="workout-duration" class="w-full px-4 py-3 bg-dark-bg border border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-blue" required>
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-300 mb-2">거리 (km, 선택)</label>
                                <input type="number" step="0.01" id="workout-distance" class="w-full px-4 py-3 bg-dark-bg border border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-blue">
                            </div>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-300 mb-2">칼로리 (선택)</label>
                            <input type="number" id="workout-calories" class="w-full px-4 py-3 bg-dark-bg border border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-blue">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-300 mb-2">메모</label>
                            <textarea id="workout-memo" rows="3" class="w-full px-4 py-3 bg-dark-bg border border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-blue"></textarea>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-300 mb-2">이미지 (선택, 최대 3장)</label>
                            <div class="relative">
                                <input type="file" id="workout-images" accept="image/jpeg,image/jpg,image/png,image/webp" multiple class="hidden">
                                <button type="button" onclick="document.getElementById('workout-images').click()" 
                                    class="w-full px-4 py-3 bg-dark-bg border border-dark-border rounded-lg text-gray-300 hover:border-accent-blue transition flex items-center justify-center space-x-2">
                                    <i class="fas fa-camera text-accent-blue"></i>
                                    <span>사진 추가 (최대 3장, 5MB)</span>
                                </button>
                            </div>
                            <div id="image-preview" class="mt-3 grid grid-cols-3 gap-2"></div>
                        </div>
                        <div class="flex space-x-4 pt-4">
                            <button type="submit" id="submit-workout-btn" class="flex-1 btn-primary text-white py-3 rounded-lg font-semibold">
                                <span id="submit-workout-text">저장</span>
                            </button>
                            <button type="button" id="btn-cancel-workout" class="flex-1 bg-gray-700 text-gray-200 py-3 rounded-lg hover:bg-gray-600 transition font-semibold">취소</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>

        <!-- Stats View -->
        <div id="stats-view" class="hidden">
            <h2 class="text-2xl md:text-3xl font-bold gradient-text mb-4 md:mb-8">나의 통계</h2>
            
            <!-- Main Stats Cards -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-6 mb-4 md:mb-8">
                <div class="stat-card rounded-xl md:rounded-2xl p-6 md:p-8 text-center">
                    <i class="fas fa-route text-accent-blue text-3xl md:text-4xl mb-3 md:mb-4"></i>
                    <div class="text-xs md:text-sm text-gray-400 uppercase tracking-wider mb-1 md:mb-2">총 거리</div>
                    <div class="text-4xl md:text-5xl font-bold text-accent-blue mb-1"><span id="stats-distance">0</span></div>
                    <div class="text-lg md:text-xl text-gray-300">km</div>
                </div>
                <div class="stat-card rounded-xl md:rounded-2xl p-6 md:p-8 text-center">
                    <i class="fas fa-clock text-accent-green text-3xl md:text-4xl mb-3 md:mb-4"></i>
                    <div class="text-xs md:text-sm text-gray-400 uppercase tracking-wider mb-1 md:mb-2">총 시간</div>
                    <div class="text-4xl md:text-5xl font-bold text-accent-green mb-1"><span id="stats-duration">0</span></div>
                    <div class="text-lg md:text-xl text-gray-300">분</div>
                </div>
                <div class="stat-card rounded-xl md:rounded-2xl p-6 md:p-8 text-center">
                    <i class="fas fa-fire text-accent-orange text-3xl md:text-4xl mb-3 md:mb-4"></i>
                    <div class="text-xs md:text-sm text-gray-400 uppercase tracking-wider mb-1 md:mb-2">운동 횟수</div>
                    <div class="text-4xl md:text-5xl font-bold text-accent-orange mb-1"><span id="stats-count">0</span></div>
                    <div class="text-lg md:text-xl text-gray-300">회</div>
                </div>
            </div>

            <!-- Weekly Activity Chart -->
            <div class="bg-dark-card rounded-xl md:rounded-2xl shadow-2xl p-5 md:p-8 border border-dark-border mb-4 md:mb-8">
                <h3 class="text-lg md:text-2xl font-bold text-gray-200 mb-4 md:mb-6 flex items-center">
                    <i class="fas fa-chart-line text-accent-green mr-2 md:mr-3 text-lg md:text-xl"></i>
                    주간 활동 추세
                </h3>
                <div class="h-64 md:h-80">
                    <canvas id="activity-chart"></canvas>
                </div>
            </div>

            <!-- Activity By Type -->
            <div class="bg-dark-card rounded-xl md:rounded-2xl shadow-2xl p-5 md:p-8 border border-dark-border mb-4 md:mb-8">
                <h3 class="text-lg md:text-2xl font-bold text-gray-200 mb-4 md:mb-6 flex items-center">
                    <i class="fas fa-chart-bar text-accent-blue mr-2 md:mr-3 text-lg md:text-xl"></i>
                    운동 종류별 통계
                </h3>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div class="h-64">
                        <canvas id="workout-type-chart"></canvas>
                    </div>
                    <div id="stats-by-type" class="space-y-3">
                        <!-- Will be populated by JS -->
                    </div>
                </div>
            </div>

            <!-- Highlights -->
            <div class="bg-dark-card rounded-xl md:rounded-2xl shadow-2xl p-5 md:p-8 border border-dark-border">
                <h3 class="text-lg md:text-2xl font-bold text-gray-200 mb-4 md:mb-6 flex items-center">
                    <i class="fas fa-trophy text-accent-green mr-2 md:mr-3 text-lg md:text-xl"></i>
                    개인 기록
                </h3>
                <div id="stats-highlights" class="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-6">
                    <!-- Will be populated by JS -->
                </div>
            </div>
        </div>

        <!-- Weight View -->
        <div id="weight-view" class="hidden">
            <div class="flex justify-between items-center mb-4 md:mb-8">
                <h2 class="text-2xl md:text-3xl font-bold gradient-text">체중 관리</h2>
                <button id="btn-add-weight" class="btn-primary text-white px-4 md:px-6 py-2 md:py-3 rounded-lg font-semibold flex items-center space-x-2 text-sm md:text-base">
                    <i class="fas fa-plus text-sm md:text-base"></i>
                    <span class="hidden md:inline">체중 추가</span>
                    <span class="md:hidden">추가</span>
                </button>
            </div>
            <div class="bg-dark-card rounded-xl md:rounded-2xl shadow-2xl p-5 md:p-8 border border-dark-border mb-4 md:mb-8">
                <h3 class="text-lg md:text-2xl font-bold text-gray-200 mb-4 md:mb-6 flex items-center">
                    <i class="fas fa-chart-line text-accent-blue mr-2 md:mr-3 text-lg md:text-xl"></i>
                    체중 변화 추이
                </h3>
                <div class="h-64 md:h-80">
                    <canvas id="weight-chart"></canvas>
                </div>
                <div id="weight-chart-empty" class="hidden h-48 md:h-64 flex items-center justify-center text-gray-400 text-sm md:text-base">
                    체중 기록이 없습니다
                </div>
            </div>
            <div id="weight-list" class="space-y-3 md:space-y-4">
                <!-- Will be populated by JS -->
            </div>
        </div>
    </div>

    <!-- Add Weight Modal -->
    <div id="add-weight-modal" class="hidden fixed inset-0 bg-black bg-opacity-70 backdrop-blur-sm flex items-center justify-center z-50">
        <div class="bg-dark-card rounded-xl shadow-2xl p-8 max-w-md w-full mx-4 border border-dark-border">
            <div class="flex justify-between items-center mb-6">
                <h3 class="text-2xl font-bold gradient-text">체중 추가</h3>
                <button id="close-weight-modal" class="text-gray-400 hover:text-accent-blue text-3xl transition">&times;</button>
            </div>
            <form id="add-weight-form" class="space-y-5">
                <div>
                    <label class="block text-sm font-medium text-gray-300 mb-2">체중 (kg)</label>
                    <input type="number" step="0.1" id="weight-kg" class="w-full px-4 py-3 bg-dark-bg border border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-blue" required>
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-300 mb-2">날짜</label>
                    <input type="date" id="weight-date" class="w-full px-4 py-3 bg-dark-bg border border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-blue" required>
                </div>
                <div class="flex space-x-4 pt-4">
                    <button type="submit" class="flex-1 btn-primary text-white py-3 rounded-lg font-semibold">저장</button>
                    <button type="button" id="cancel-weight-modal" class="flex-1 bg-gray-700 text-gray-200 py-3 rounded-lg hover:bg-gray-600 transition font-semibold">취소</button>
                </div>
            </form>
        </div>
    </div>

    <!-- Edit Profile Modal -->
    <div id="edit-profile-modal" class="hidden fixed inset-0 bg-black bg-opacity-70 backdrop-blur-sm flex items-center justify-center z-50">
        <div class="bg-dark-card rounded-xl shadow-2xl p-8 max-w-md w-full mx-4 border border-dark-border">
            <div class="flex justify-between items-center mb-6">
                <h3 class="text-2xl font-bold gradient-text">프로필 수정</h3>
                <button id="close-profile-modal" class="text-gray-400 hover:text-accent-blue text-3xl transition">&times;</button>
            </div>
            <form id="edit-profile-form" class="space-y-5">
                <div>
                    <label class="block text-sm font-medium text-gray-300 mb-2">이름</label>
                    <input type="text" id="profile-name" class="w-full px-4 py-3 bg-dark-bg border border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-blue" required>
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-300 mb-2">키 (cm, 선택)</label>
                    <input type="number" id="profile-height" class="w-full px-4 py-3 bg-dark-bg border border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-blue">
                </div>
                <div class="flex space-x-4 pt-4">
                    <button type="submit" class="flex-1 btn-primary text-white py-3 rounded-lg font-semibold">저장</button>
                    <button type="button" id="cancel-profile-modal" class="flex-1 bg-gray-700 text-gray-200 py-3 rounded-lg hover:bg-gray-600 transition font-semibold">취소</button>
                </div>
            </form>
        </div>
    </div>

    <!-- Toast Container -->
    <div id="toast-container" class="fixed top-4 right-4 z-50 space-y-2"></div>

    <!-- Global Loading Overlay -->
    <div id="loading-overlay" class="hidden fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm z-50 flex items-center justify-center">
        <div class="bg-dark-card rounded-xl p-6 flex flex-col items-center space-y-4 border border-dark-border">
            <div class="animate-spin rounded-full h-12 w-12 border-4 border-accent-blue border-t-transparent"></div>
            <p class="text-gray-200 font-medium">로딩 중...</p>
        </div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
    <script src="/static/app.js"></script>
</body>
</html>
  `);
});

export default app;

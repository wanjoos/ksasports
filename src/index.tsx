import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serveStatic } from 'hono/cloudflare-workers';
import type { Bindings } from './types';

// Import routes
import auth from './routes/auth';
import workouts from './routes/workouts';
import stats from './routes/stats';
import weight from './routes/weight';

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

// Home page
app.get('/', (c) => {
  return c.html(`
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Workout Together - 함께하는 운동 기록</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
    <style>
        .workout-card { transition: transform 0.2s; }
        .workout-card:hover { transform: translateY(-2px); }
        .nav-link { transition: color 0.2s; }
        .nav-link:hover { color: #3b82f6; }
    </style>
</head>
<body class="bg-gray-50">
    <!-- Navigation -->
    <nav class="bg-white shadow-sm sticky top-0 z-50">
        <div class="max-w-6xl mx-auto px-4 py-4">
            <div class="flex justify-between items-center">
                <div class="flex items-center space-x-2">
                    <i class="fas fa-dumbbell text-blue-600 text-2xl"></i>
                    <h1 class="text-2xl font-bold text-gray-800">Workout Together</h1>
                </div>
                <div id="nav-menu" class="flex items-center space-x-6">
                    <!-- Will be populated by JS -->
                </div>
            </div>
        </div>
    </nav>

    <!-- Main Content -->
    <div class="max-w-6xl mx-auto px-4 py-8">
        <!-- Auth View (Login/Signup) -->
        <div id="auth-view" class="hidden">
            <div class="max-w-md mx-auto">
                <div class="bg-white rounded-lg shadow-md p-8">
                    <div class="flex space-x-4 mb-6 border-b">
                        <button id="tab-login" class="tab-btn pb-2 px-4 font-semibold text-blue-600 border-b-2 border-blue-600">로그인</button>
                        <button id="tab-signup" class="tab-btn pb-2 px-4 font-semibold text-gray-600">회원가입</button>
                    </div>
                    
                    <!-- Login Form -->
                    <form id="login-form" class="space-y-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">이메일</label>
                            <input type="email" id="login-email" class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" required>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">비밀번호</label>
                            <input type="password" id="login-password" class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" required>
                        </div>
                        <button type="submit" class="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition">로그인</button>
                    </form>
                    
                    <!-- Signup Form -->
                    <form id="signup-form" class="space-y-4 hidden">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">이름</label>
                            <input type="text" id="signup-name" class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" required>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">이메일</label>
                            <input type="email" id="signup-email" class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" required>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">비밀번호</label>
                            <input type="password" id="signup-password" class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" required>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">키 (cm, 선택)</label>
                            <input type="number" id="signup-height" class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                        </div>
                        <button type="submit" class="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition">회원가입</button>
                    </form>
                    
                    <div id="auth-error" class="mt-4 text-red-600 text-sm hidden"></div>
                </div>
            </div>
        </div>

        <!-- Feed View -->
        <div id="feed-view" class="hidden">
            <div class="flex justify-between items-center mb-6">
                <h2 class="text-2xl font-bold text-gray-800">운동 피드</h2>
                <button id="btn-add-workout" class="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition">
                    <i class="fas fa-plus mr-2"></i>운동 기록 추가
                </button>
            </div>
            <div id="feed-container" class="space-y-4">
                <!-- Feed items will be populated here -->
            </div>
        </div>

        <!-- Add Workout View -->
        <div id="add-workout-view" class="hidden">
            <div class="max-w-2xl mx-auto">
                <div class="bg-white rounded-lg shadow-md p-8">
                    <h2 class="text-2xl font-bold text-gray-800 mb-6">운동 기록 추가</h2>
                    <form id="add-workout-form" class="space-y-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">운동 종류</label>
                            <select id="workout-type" class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" required>
                                <option value="RUN">러닝 🏃</option>
                                <option value="WALK">걷기 🚶</option>
                                <option value="BIKE">사이클 🚴</option>
                                <option value="BADMINTON">배드민턴 🏸</option>
                                <option value="WEIGHT">웨이트 🏋️</option>
                                <option value="OTHER">기타</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">시작 시간</label>
                            <input type="datetime-local" id="workout-started" class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" required>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">운동 시간 (분)</label>
                            <input type="number" id="workout-duration" class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" required>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">거리 (km, 선택)</label>
                            <input type="number" step="0.01" id="workout-distance" class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">칼로리 (선택)</label>
                            <input type="number" id="workout-calories" class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">메모</label>
                            <textarea id="workout-memo" rows="3" class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"></textarea>
                        </div>
                        <div class="flex space-x-4">
                            <button type="submit" class="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition">저장</button>
                            <button type="button" id="btn-cancel-workout" class="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400 transition">취소</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>

        <!-- Stats View -->
        <div id="stats-view" class="hidden">
            <h2 class="text-2xl font-bold text-gray-800 mb-6">나의 통계</h2>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div class="bg-white rounded-lg shadow-md p-6">
                    <div class="text-sm text-gray-600 mb-2">총 거리</div>
                    <div class="text-3xl font-bold text-blue-600"><span id="stats-distance">0</span> km</div>
                </div>
                <div class="bg-white rounded-lg shadow-md p-6">
                    <div class="text-sm text-gray-600 mb-2">총 시간</div>
                    <div class="text-3xl font-bold text-green-600"><span id="stats-duration">0</span> 분</div>
                </div>
                <div class="bg-white rounded-lg shadow-md p-6">
                    <div class="text-sm text-gray-600 mb-2">운동 횟수</div>
                    <div class="text-3xl font-bold text-purple-600"><span id="stats-count">0</span> 회</div>
                </div>
            </div>
            <div class="bg-white rounded-lg shadow-md p-6 mb-6">
                <h3 class="text-lg font-bold text-gray-800 mb-4">운동 종류별 통계</h3>
                <div id="stats-by-type" class="space-y-2">
                    <!-- Will be populated by JS -->
                </div>
            </div>
            <div class="bg-white rounded-lg shadow-md p-6">
                <h3 class="text-lg font-bold text-gray-800 mb-4">하이라이트</h3>
                <div id="stats-highlights" class="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <!-- Will be populated by JS -->
                </div>
            </div>
        </div>

        <!-- Weight View -->
        <div id="weight-view" class="hidden">
            <div class="flex justify-between items-center mb-6">
                <h2 class="text-2xl font-bold text-gray-800">체중 기록</h2>
                <button id="btn-add-weight" class="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition">
                    <i class="fas fa-plus mr-2"></i>체중 추가
                </button>
            </div>
            <div class="bg-white rounded-lg shadow-md p-6 mb-6">
                <h3 class="text-lg font-bold text-gray-800 mb-4">최근 체중 변화</h3>
                <div id="weight-chart" class="h-64 flex items-center justify-center text-gray-400">
                    체중 기록이 없습니다
                </div>
            </div>
            <div id="weight-list" class="space-y-2">
                <!-- Will be populated by JS -->
            </div>
        </div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
    <script src="/static/app.js"></script>
</body>
</html>
  `);
});

export default app;

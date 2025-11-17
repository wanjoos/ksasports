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
import goals from './routes/goals';
import social from './routes/social';
import challenges from './routes/challenges';
import notifications from './routes/notifications';
import users from './routes/users';

const app = new Hono<{ Bindings: Bindings }>();

// Enable CORS for API routes
app.use('/api/*', cors());

// Serve static files
app.use('/static/*', serveStatic({ root: './' }));

// API routes
app.route('/api/auth', auth);
app.route('/api/users', users);
app.route('/api/workouts', workouts);
app.route('/api/me/stats', stats);
app.route('/api/me/weights', weight);
app.route('/api/me/profile', profile);
app.route('/api/me/goals', goals);
app.route('/api/social', social);
app.route('/api/challenges', challenges);
app.route('/api/notifications', notifications);
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
            darkMode: 'class',
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
        :root {
            --bg-primary: #0a0e27;
            --bg-secondary: #1a1f3a;
            --card-bg: #141b2d;
            --border-color: #1f2937;
            --text-primary: #e5e7eb;
            --text-secondary: #9ca3af;
            --text-tertiary: #6b7280;
        }
        
        [data-theme="light"] {
            --bg-primary: #f3f4f6;
            --bg-secondary: #e5e7eb;
            --card-bg: #ffffff;
            --border-color: #d1d5db;
            --text-primary: #111827;
            --text-secondary: #4b5563;
            --text-tertiary: #6b7280;
        }
        
        * {
            -webkit-tap-highlight-color: transparent;
        }
        body {
            background: linear-gradient(135deg, var(--bg-primary) 0%, var(--bg-secondary) 100%);
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            overflow-x: hidden;
            transition: background 0.3s ease;
        }
        
        /* Light mode overrides */
        [data-theme="light"] body {
            color: var(--text-primary);
        }
        [data-theme="light"] .bg-dark-card {
            background: var(--card-bg) !important;
        }
        [data-theme="light"] .bg-dark-bg {
            background: var(--bg-secondary) !important;
        }
        [data-theme="light"] .border-dark-border {
            border-color: var(--border-color) !important;
        }
        [data-theme="light"] .text-gray-100,
        [data-theme="light"] .text-gray-200,
        [data-theme="light"] .text-gray-300 {
            color: var(--text-primary) !important;
        }
        [data-theme="light"] .text-gray-400,
        [data-theme="light"] .text-gray-500 {
            color: var(--text-secondary) !important;
        }
        [data-theme="light"] .text-gray-600 {
            color: var(--text-tertiary) !important;
        }
        [data-theme="light"] .workout-card {
            background: linear-gradient(135deg, #ffffff 0%, #f9fafb 100%);
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        [data-theme="light"] .stat-card {
            background: linear-gradient(135deg, #ffffff 0%, #f9fafb 100%);
            border: 1px solid #e5e7eb;
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
            -webkit-text-fill-color: #e5e7eb !important; /* Fix iOS Safari */
        }
        [data-theme="light"] input,
        [data-theme="light"] select,
        [data-theme="light"] textarea {
            background: #ffffff !important;
            border-color: #d1d5db !important;
            color: #111827 !important;
            -webkit-text-fill-color: #111827 !important;
        }
        input:focus, select:focus, textarea:focus {
            border-color: #00d4ff !important;
            box-shadow: 0 0 0 3px rgba(0, 212, 255, 0.1) !important;
        }
        /* Mobile touch optimization */
        @media (max-width: 767px) {
            input, select, textarea, button {
                min-height: 44px !important; /* iOS recommended touch target */
            }
            .btn-primary, button[type="submit"] {
                min-height: 48px !important;
                font-size: 17px !important;
            }
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
        /* Filter and Sort Buttons */
        .sort-btn, .type-filter-btn {
            background: var(--card-bg);
            border-color: var(--border-color);
            color: var(--text-secondary);
        }
        .sort-btn:hover, .type-filter-btn:hover {
            border-color: rgba(0, 212, 255, 0.5);
            color: #00d4ff;
        }
        .sort-btn.active, .type-filter-btn.active {
            background: linear-gradient(135deg, rgba(0, 212, 255, 0.2), rgba(52, 211, 153, 0.2));
            border-color: #00d4ff;
            color: #00d4ff;
        }
        .filter-tag {
            background: linear-gradient(135deg, rgba(0, 212, 255, 0.2), rgba(52, 211, 153, 0.2));
            border: 1px solid rgba(0, 212, 255, 0.3);
            color: #00d4ff;
            padding: 4px 12px;
            border-radius: 6px;
            font-size: 0.875rem;
            display: inline-flex;
            align-items: center;
            gap: 6px;
        }
        .filter-tag button {
            color: #00d4ff;
            opacity: 0.7;
            transition: opacity 0.2s;
        }
        .filter-tag button:hover {
            opacity: 1;
        }
        /* Progress Bar Styles */
        .progress-bar {
            width: 100%;
            height: 12px;
            background: rgba(31, 41, 55, 0.8);
            border-radius: 999px;
            overflow: hidden;
            position: relative;
        }
        .progress-bar-fill {
            height: 100%;
            transition: width 0.6s ease-out;
            border-radius: 999px;
            position: relative;
            overflow: hidden;
        }
        .progress-bar-fill::after {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: linear-gradient(
                90deg,
                transparent,
                rgba(255, 255, 255, 0.2),
                transparent
            );
            animation: shimmer 2s infinite;
        }
        @keyframes shimmer {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(100%); }
        }
        .goal-card {
            background: linear-gradient(135deg, rgba(20, 27, 45, 0.8) 0%, rgba(31, 41, 55, 0.6) 100%);
            border: 1px solid rgba(0, 212, 255, 0.2);
            transition: all 0.3s;
        }
        .goal-card:hover {
            border-color: rgba(0, 212, 255, 0.4);
            transform: translateY(-2px);
        }
        .goal-card.achieved {
            background: linear-gradient(135deg, rgba(52, 211, 153, 0.1) 0%, rgba(16, 185, 129, 0.05) 100%);
            border-color: rgba(52, 211, 153, 0.3);
        }
        /* Lightbox Styles */
        #lightbox-modal {
            animation: fadeIn 0.3s ease-out;
        }
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        #lightbox-image {
            transition: transform 0.3s ease;
        }
        #lightbox-image.zoomed {
            cursor: zoom-out;
        }
        #lightbox-thumbnails {
            scrollbar-width: thin;
            scrollbar-color: rgba(0, 212, 255, 0.5) rgba(0, 0, 0, 0.3);
        }
        #lightbox-thumbnails::-webkit-scrollbar {
            height: 6px;
        }
        #lightbox-thumbnails::-webkit-scrollbar-track {
            background: rgba(0, 0, 0, 0.3);
            border-radius: 3px;
        }
        #lightbox-thumbnails::-webkit-scrollbar-thumb {
            background: rgba(0, 212, 255, 0.5);
            border-radius: 3px;
        }
        .lightbox-thumbnail {
            width: 60px;
            height: 60px;
            object-fit: cover;
            border-radius: 6px;
            cursor: pointer;
            opacity: 0.5;
            transition: all 0.2s;
            border: 2px solid transparent;
        }
        .lightbox-thumbnail:hover {
            opacity: 0.8;
            transform: scale(1.05);
        }
        .lightbox-thumbnail.active {
            opacity: 1;
            border-color: #00d4ff;
        }
        /* Feed Filter Styles */
        .feed-filter-btn {
            background: var(--card-bg);
            border-color: var(--border-color);
            color: var(--text-secondary);
        }
        .feed-filter-btn:hover {
            border-color: rgba(0, 212, 255, 0.5);
            color: #00d4ff;
        }
        .feed-filter-btn.active {
            background: linear-gradient(135deg, rgba(0, 212, 255, 0.2), rgba(52, 211, 153, 0.2));
            border-color: #00d4ff;
            color: #00d4ff;
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
                <div class="flex items-center space-x-4">
                    <button id="theme-toggle" class="p-2 rounded-lg hover:bg-dark-border transition">
                        <i id="theme-icon" class="fas fa-sun text-xl text-gray-300"></i>
                    </button>
                    <!-- Notifications -->
                    <div class="relative hidden" id="notifications-container">
                        <button onclick="toggleNotificationsDropdown()" class="p-2 rounded-lg hover:bg-dark-border transition relative">
                            <i class="fas fa-bell text-xl text-gray-300"></i>
                            <span id="notification-badge" class="hidden absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">0</span>
                        </button>
                        <!-- Notifications Dropdown -->
                        <div id="notifications-dropdown" class="hidden absolute right-0 mt-2 w-80 md:w-96 bg-dark-card rounded-xl shadow-2xl border border-dark-border z-50 max-h-[500px] overflow-y-auto">
                            <div class="sticky top-0 bg-dark-card border-b border-dark-border px-4 py-3 flex justify-between items-center">
                                <h3 class="font-bold text-gray-200">알림</h3>
                                <button onclick="markAllNotificationsAsRead()" class="text-sm text-accent-blue hover:text-accent-green transition">
                                    모두 읽음
                                </button>
                            </div>
                            <div id="notifications-dropdown-list">
                                <!-- Will be populated by JS -->
                            </div>
                        </div>
                    </div>
                    <div id="nav-menu" class="desktop-nav flex items-center space-x-4 md:space-x-6">
                        <!-- Will be populated by JS for desktop -->
                    </div>
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
            <div class="flex justify-between items-center mb-4 md:mb-6">
                <h2 class="text-2xl md:text-3xl font-bold gradient-text">활동 피드</h2>
                <div class="flex items-center space-x-2">
                    <button id="btn-search-users" class="p-2 md:px-4 md:py-2 rounded-lg bg-dark-card border border-dark-border hover:border-accent-blue transition text-gray-300 hover:text-accent-blue">
                        <i class="fas fa-user-plus text-lg md:text-base"></i>
                        <span class="hidden md:inline ml-2">친구 찾기</span>
                    </button>
                    <button id="btn-add-workout" class="hidden md:flex btn-primary text-white px-6 py-3 rounded-lg font-semibold items-center space-x-2">
                        <i class="fas fa-plus"></i>
                        <span>운동 기록</span>
                    </button>
                </div>
            </div>
            
            <!-- Feed Filter Tabs -->
            <div class="flex space-x-2 mb-4 overflow-x-auto pb-2">
                <button data-feed-filter="all" class="feed-filter-btn active px-4 py-2 rounded-lg border transition whitespace-nowrap text-sm">
                    <i class="fas fa-globe mr-1"></i>모든 활동
                </button>
                <button data-feed-filter="following" class="feed-filter-btn px-4 py-2 rounded-lg border transition whitespace-nowrap text-sm">
                    <i class="fas fa-users mr-1"></i>팔로잉
                </button>
            </div>
            
            <!-- Search & Filter Section -->
            <div class="bg-dark-card rounded-xl md:rounded-2xl shadow-2xl p-4 md:p-6 border border-dark-border mb-4 md:mb-6">
                <!-- Search Bar -->
                <div class="mb-4">
                    <div class="relative">
                        <i class="fas fa-search absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
                        <input type="text" id="search-input" placeholder="운동 제목, 메모 검색..." 
                            class="w-full pl-12 pr-4 py-3 bg-dark-bg border border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-blue text-gray-200 placeholder-gray-500">
                    </div>
                </div>
                
                <!-- Filter Controls -->
                <div class="space-y-4">
                    <!-- Date Range -->
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                            <label class="block text-xs text-gray-400 mb-2">기간 선택</label>
                            <select id="date-range-select" class="w-full px-3 py-2 bg-dark-bg border border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-blue text-gray-200 text-sm">
                                <option value="all">전체</option>
                                <option value="today">오늘</option>
                                <option value="week">이번 주</option>
                                <option value="month">이번 달</option>
                                <option value="custom">직접 선택</option>
                            </select>
                        </div>
                        <div id="custom-date-start" class="hidden">
                            <label class="block text-xs text-gray-400 mb-2">시작일</label>
                            <input type="date" id="date-start" class="w-full px-3 py-2 bg-dark-bg border border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-blue text-gray-200 text-sm">
                        </div>
                        <div id="custom-date-end" class="hidden">
                            <label class="block text-xs text-gray-400 mb-2">종료일</label>
                            <input type="date" id="date-end" class="w-full px-3 py-2 bg-dark-bg border border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-blue text-gray-200 text-sm">
                        </div>
                    </div>
                    
                    <!-- Sort Options -->
                    <div>
                        <label class="block text-xs text-gray-400 mb-2">정렬</label>
                        <div class="flex flex-wrap gap-2">
                            <button data-sort="date" class="sort-btn active px-3 py-2 rounded-lg border transition text-sm">
                                <i class="fas fa-calendar mr-1"></i>최신순
                            </button>
                            <button data-sort="distance" class="sort-btn px-3 py-2 rounded-lg border transition text-sm">
                                <i class="fas fa-route mr-1"></i>거리순
                            </button>
                            <button data-sort="duration" class="sort-btn px-3 py-2 rounded-lg border transition text-sm">
                                <i class="fas fa-clock mr-1"></i>시간순
                            </button>
                        </div>
                    </div>
                    
                    <!-- Workout Type Filter -->
                    <div>
                        <label class="block text-xs text-gray-400 mb-2">운동 종류</label>
                        <div id="workout-type-filters" class="flex flex-wrap gap-2">
                            <button data-type="all" class="type-filter-btn active px-3 py-2 rounded-lg border transition text-sm">
                                <i class="fas fa-th mr-1"></i>전체
                            </button>
                            <!-- Will be populated by JS -->
                        </div>
                    </div>
                    
                    <!-- Active Filters Display -->
                    <div id="active-filters" class="hidden pt-3 border-t border-dark-border">
                        <div class="flex items-center justify-between">
                            <div class="flex items-center space-x-2 text-sm">
                                <i class="fas fa-filter text-accent-blue"></i>
                                <span class="text-gray-400">활성 필터:</span>
                                <div id="filter-tags" class="flex flex-wrap gap-2">
                                    <!-- Filter tags will be populated here -->
                                </div>
                            </div>
                            <button id="clear-filters" class="text-accent-blue hover:text-accent-blue-light text-sm">
                                <i class="fas fa-times-circle mr-1"></i>초기화
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Results Count -->
            <div id="results-count" class="mb-4 text-sm text-gray-400">
                <!-- Will show filtered results count -->
            </div>
            
            <div id="feed-container" class="space-y-4 md:space-y-6">
                <!-- Feed items will be populated here -->
            </div>
            
            <!-- Infinite Scroll Loading Indicator -->
            <div id="scroll-loading" class="hidden py-8 flex justify-center items-center">
                <div class="flex flex-col items-center space-y-3">
                    <div class="animate-spin rounded-full h-10 w-10 border-4 border-accent-blue border-t-transparent"></div>
                    <p class="text-gray-400 text-sm">운동 기록 불러오는 중...</p>
                </div>
            </div>
            
            <!-- End of Results -->
            <div id="scroll-end" class="hidden py-8 text-center">
                <div class="text-gray-400 text-sm">
                    <i class="fas fa-check-circle text-accent-green text-xl mb-2"></i>
                    <p>모든 운동 기록을 불러왔습니다</p>
                </div>
            </div>
            
            <!-- Sentinel element for Intersection Observer -->
            <div id="scroll-sentinel" class="h-4"></div>
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
            
            <!-- AI Coach Section -->
            <div class="bg-dark-card rounded-xl md:rounded-2xl shadow-2xl p-5 md:p-8 border border-dark-border mb-4 md:mb-8">
                <div class="flex justify-between items-center mb-4 md:mb-6">
                    <h3 class="text-lg md:text-2xl font-bold text-gray-200 flex items-center">
                        <i class="fas fa-brain text-accent-purple mr-2 md:mr-3 text-lg md:text-xl"></i>
                        AI 코치의 조언
                    </h3>
                    <button id="btn-refresh-advice" class="p-2 rounded-lg hover:bg-dark-border transition text-gray-400 hover:text-accent-blue">
                        <i class="fas fa-sync-alt"></i>
                    </button>
                </div>
                
                <div id="ai-coach-advice" class="space-y-4">
                    <div class="flex items-start space-x-3 bg-gradient-to-r from-purple-900/20 to-blue-900/20 p-4 rounded-lg border border-accent-purple/30">
                        <div class="text-2xl">💪</div>
                        <div class="flex-1">
                            <p class="text-gray-300 leading-relaxed" id="coach-advice-text">
                                통계 데이터를 분석 중입니다...
                            </p>
                        </div>
                    </div>
                    <div class="text-xs text-gray-500 text-center">
                        <i class="fas fa-info-circle mr-1"></i>
                        AI 코치는 최근 활동 데이터를 기반으로 개인화된 조언을 제공합니다
                    </div>
                </div>
            </div>
            
            <!-- Goals Section -->
            <div class="bg-dark-card rounded-xl md:rounded-2xl shadow-2xl p-5 md:p-8 border border-dark-border mb-4 md:mb-8">
                <div class="flex justify-between items-center mb-4 md:mb-6">
                    <h3 class="text-lg md:text-2xl font-bold text-gray-200 flex items-center">
                        <i class="fas fa-bullseye text-accent-green mr-2 md:mr-3 text-lg md:text-xl"></i>
                        운동 목표
                    </h3>
                    <button id="btn-set-goals" class="btn-primary text-white px-4 py-2 rounded-lg text-sm font-semibold flex items-center space-x-2">
                        <i class="fas fa-edit"></i>
                        <span>목표 설정</span>
                    </button>
                </div>
                
                <!-- Goals Progress -->
                <div id="goals-progress" class="space-y-4">
                    <!-- Will be populated by JS -->
                </div>
                
                <div id="goals-empty" class="text-center py-8 text-gray-400">
                    <i class="fas fa-target text-4xl mb-3"></i>
                    <p>아직 설정된 목표가 없습니다.</p>
                    <p class="text-sm mt-2">목표를 설정하고 달성해보세요! 🎯</p>
                </div>
            </div>
            
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
            <div class="bg-dark-card rounded-xl md:rounded-2xl shadow-2xl p-5 md:p-8 border border-dark-border mb-4 md:mb-8">
                <h3 class="text-lg md:text-2xl font-bold text-gray-200 mb-4 md:mb-6 flex items-center">
                    <i class="fas fa-trophy text-accent-green mr-2 md:mr-3 text-lg md:text-xl"></i>
                    개인 기록
                </h3>
                <div id="stats-highlights" class="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-6">
                    <!-- Will be populated by JS -->
                </div>
            </div>

            <!-- Badges Collection -->
            <div class="bg-dark-card rounded-xl md:rounded-2xl shadow-2xl p-5 md:p-8 border border-dark-border mb-4 md:mb-8">
                <div class="flex justify-between items-center mb-4 md:mb-6">
                    <h3 class="text-lg md:text-2xl font-bold text-gray-200 flex items-center">
                        <i class="fas fa-medal text-accent-purple mr-2 md:mr-3 text-lg md:text-xl"></i>
                        배지 컬렉션
                    </h3>
                    <div class="text-sm text-gray-400">
                        <span id="earned-badges-count" class="text-accent-green font-bold">0</span>
                        <span> / </span>
                        <span id="total-badges-count">0</span>
                    </div>
                </div>
                <div id="badges-collection" class="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4">
                    <!-- Will be populated by JS -->
                </div>
            </div>

            <!-- Challenges -->
            <div class="bg-dark-card rounded-xl md:rounded-2xl shadow-2xl p-5 md:p-8 border border-dark-border">
                <div class="flex justify-between items-center mb-4 md:mb-6">
                    <h3 class="text-lg md:text-2xl font-bold text-gray-200 flex items-center">
                        <i class="fas fa-trophy text-accent-orange mr-2 md:mr-3 text-lg md:text-xl"></i>
                        운동 챌린지
                    </h3>
                    <button onclick="showCreateChallengeModal()" class="btn-primary text-white px-4 py-2 rounded-lg text-sm font-semibold flex items-center space-x-2">
                        <i class="fas fa-plus"></i>
                        <span class="hidden md:inline">챌린지 만들기</span>
                        <span class="md:hidden">만들기</span>
                    </button>
                </div>
                <div id="challenges-list" class="space-y-4">
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

    <!-- Set Goals Modal -->
    <div id="set-goals-modal" class="hidden fixed inset-0 bg-black bg-opacity-70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div class="bg-dark-card rounded-xl shadow-2xl p-6 md:p-8 max-w-2xl w-full border border-dark-border max-h-[90vh] overflow-y-auto">
            <div class="flex justify-between items-center mb-6">
                <h3 class="text-xl md:text-2xl font-bold gradient-text">목표 설정</h3>
                <button id="close-goals-modal" class="text-gray-400 hover:text-accent-blue text-3xl transition">&times;</button>
            </div>
            
            <div class="space-y-6">
                <!-- Weekly Goals -->
                <div class="border border-dark-border rounded-lg p-4 md:p-6">
                    <h4 class="text-lg font-bold text-accent-blue mb-4 flex items-center">
                        <i class="fas fa-calendar-week mr-2"></i>
                        주간 목표
                    </h4>
                    <div class="space-y-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-300 mb-2">운동 횟수 (회)</label>
                            <input type="number" id="weekly-count" min="0" step="1" placeholder="예: 5회" 
                                class="w-full px-4 py-3 bg-dark-bg border border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-blue">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-300 mb-2">총 거리 (km)</label>
                            <input type="number" id="weekly-distance" min="0" step="0.1" placeholder="예: 20km" 
                                class="w-full px-4 py-3 bg-dark-bg border border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-blue">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-300 mb-2">총 시간 (분)</label>
                            <input type="number" id="weekly-duration" min="0" step="1" placeholder="예: 300분" 
                                class="w-full px-4 py-3 bg-dark-bg border border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-blue">
                        </div>
                    </div>
                </div>
                
                <!-- Monthly Goals -->
                <div class="border border-dark-border rounded-lg p-4 md:p-6">
                    <h4 class="text-lg font-bold text-accent-green mb-4 flex items-center">
                        <i class="fas fa-calendar-alt mr-2"></i>
                        월간 목표
                    </h4>
                    <div class="space-y-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-300 mb-2">운동 횟수 (회)</label>
                            <input type="number" id="monthly-count" min="0" step="1" placeholder="예: 20회" 
                                class="w-full px-4 py-3 bg-dark-bg border border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-blue">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-300 mb-2">총 거리 (km)</label>
                            <input type="number" id="monthly-distance" min="0" step="0.1" placeholder="예: 100km" 
                                class="w-full px-4 py-3 bg-dark-bg border border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-blue">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-300 mb-2">총 시간 (분)</label>
                            <input type="number" id="monthly-duration" min="0" step="1" placeholder="예: 1200분" 
                                class="w-full px-4 py-3 bg-dark-bg border border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-blue">
                        </div>
                    </div>
                </div>
                
                <div class="flex space-x-4 pt-4">
                    <button id="save-goals-btn" class="flex-1 btn-primary text-white py-3 rounded-lg font-semibold">
                        <i class="fas fa-save mr-2"></i>저장
                    </button>
                    <button id="cancel-goals-modal" class="flex-1 bg-gray-700 text-gray-200 py-3 rounded-lg hover:bg-gray-600 transition font-semibold">
                        취소
                    </button>
                </div>
            </div>
        </div>
    </div>

    <!-- User Search Modal -->
    <div id="user-search-modal" class="hidden fixed inset-0 bg-black bg-opacity-70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div class="bg-dark-card rounded-xl shadow-2xl p-6 md:p-8 max-w-2xl w-full border border-dark-border max-h-[90vh] overflow-y-auto">
            <div class="flex justify-between items-center mb-6">
                <h3 class="text-xl md:text-2xl font-bold gradient-text">친구 찾기</h3>
                <button id="close-user-search-modal" class="text-gray-400 hover:text-accent-blue text-3xl transition">&times;</button>
            </div>
            
            <div class="mb-6">
                <div class="relative">
                    <i class="fas fa-search absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
                    <input type="text" id="user-search-input" placeholder="이름 또는 이메일로 검색..." 
                        class="w-full pl-12 pr-4 py-3 bg-dark-bg border border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-blue text-gray-200 placeholder-gray-500">
                </div>
            </div>
            
            <div id="user-search-results" class="space-y-3">
                <div class="text-center text-gray-400 py-8">
                    <i class="fas fa-users text-4xl mb-3"></i>
                    <p>이름이나 이메일로 친구를 검색해보세요</p>
                </div>
            </div>
        </div>
    </div>

    <!-- User Profile Modal -->
    <div id="user-profile-modal" class="hidden fixed inset-0 bg-black bg-opacity-70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div class="bg-dark-card rounded-xl shadow-2xl p-6 md:p-8 max-w-2xl w-full border border-dark-border max-h-[90vh] overflow-y-auto">
            <div class="flex justify-between items-center mb-6">
                <h3 class="text-xl md:text-2xl font-bold gradient-text">프로필</h3>
                <button id="close-user-profile-modal" class="text-gray-400 hover:text-accent-blue text-3xl transition">&times;</button>
            </div>
            
            <div id="user-profile-content">
                <!-- Profile content will be populated here -->
            </div>
        </div>
    </div>

    <!-- Edit Workout Modal -->
    <div id="edit-workout-modal" class="hidden fixed inset-0 bg-black bg-opacity-70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div class="bg-dark-card rounded-xl shadow-2xl p-6 md:p-8 max-w-2xl w-full border border-dark-border max-h-[90vh] overflow-y-auto">
            <div class="flex justify-between items-center mb-6">
                <h3 class="text-xl md:text-2xl font-bold gradient-text">운동 수정</h3>
                <button id="close-edit-workout-modal" class="text-gray-400 hover:text-accent-blue text-3xl transition">&times;</button>
            </div>
            
            <form id="edit-workout-form" class="space-y-5">
                <input type="hidden" id="edit-workout-id">
                
                <div>
                    <label class="block text-sm font-medium text-gray-300 mb-2">운동 종류</label>
                    <select id="edit-workout-type" class="w-full px-4 py-3 bg-dark-bg border border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-blue" required>
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
                        <optgroup label="🏐 구기 종목">
                            <option value="BADMINTON">🏸 배드민턴</option>
                            <option value="TENNIS">🎾 테니스</option>
                            <option value="TABLE_TENNIS">🏓 탁구</option>
                            <option value="BASKETBALL">🏀 농구</option>
                            <option value="SOCCER">⚽ 축구</option>
                            <option value="VOLLEYBALL">🏐 배구</option>
                            <option value="GOLF">⛳ 골프</option>
                        </optgroup>
                        <optgroup label="🥋 격투기">
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
                        <optgroup label="⚡ 기타">
                            <option value="OTHER">⚡ 기타</option>
                        </optgroup>
                    </select>
                </div>
                
                <div>
                    <label class="block text-sm font-medium text-gray-300 mb-2">시작 시간</label>
                    <input type="datetime-local" id="edit-workout-started" class="w-full px-4 py-3 bg-dark-bg border border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-blue" required>
                </div>
                
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-300 mb-2">거리 (km, 선택)</label>
                        <input type="number" step="0.1" id="edit-workout-distance" placeholder="예: 5.2" class="w-full px-4 py-3 bg-dark-bg border border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-blue">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-300 mb-2">시간 (분)</label>
                        <input type="number" id="edit-workout-duration" placeholder="예: 30" class="w-full px-4 py-3 bg-dark-bg border border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-blue" required>
                    </div>
                </div>
                
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-300 mb-2">페이스 (초/km, 선택)</label>
                        <input type="number" id="edit-workout-pace" placeholder="예: 330 (5분30초/km)" class="w-full px-4 py-3 bg-dark-bg border border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-blue">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-300 mb-2">칼로리 (kcal, 선택)</label>
                        <input type="number" id="edit-workout-calories" placeholder="예: 300" class="w-full px-4 py-3 bg-dark-bg border border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-blue">
                    </div>
                </div>
                
                <div>
                    <label class="block text-sm font-medium text-gray-300 mb-2">메모 (선택)</label>
                    <textarea id="edit-workout-memo" rows="3" placeholder="오늘 운동은 어땠나요?" class="w-full px-4 py-3 bg-dark-bg border border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-blue resize-none"></textarea>
                </div>
                
                <div class="flex space-x-4 pt-4">
                    <button type="submit" class="flex-1 btn-primary text-white py-3 rounded-lg font-semibold">
                        <i class="fas fa-save mr-2"></i>저장
                    </button>
                    <button type="button" id="cancel-edit-workout-modal" class="flex-1 bg-gray-700 text-gray-200 py-3 rounded-lg hover:bg-gray-600 transition font-semibold">
                        취소
                    </button>
                </div>
            </form>
        </div>
    </div>

    <!-- Image Lightbox Modal -->
    <div id="lightbox-modal" class="hidden fixed inset-0 bg-black bg-opacity-95 z-[60] flex items-center justify-center">
        <!-- Close Button -->
        <button id="lightbox-close" class="absolute top-4 right-4 text-white text-4xl hover:text-accent-blue transition z-10 w-12 h-12 flex items-center justify-center">
            <i class="fas fa-times"></i>
        </button>
        
        <!-- Download Button -->
        <button id="lightbox-download" class="absolute top-4 right-20 text-white text-2xl hover:text-accent-blue transition z-10 w-12 h-12 flex items-center justify-center">
            <i class="fas fa-download"></i>
        </button>
        
        <!-- Previous Button -->
        <button id="lightbox-prev" class="absolute left-4 top-1/2 transform -translate-y-1/2 text-white text-4xl hover:text-accent-blue transition z-10 w-12 h-12 flex items-center justify-center">
            <i class="fas fa-chevron-left"></i>
        </button>
        
        <!-- Next Button -->
        <button id="lightbox-next" class="absolute right-4 top-1/2 transform -translate-y-1/2 text-white text-4xl hover:text-accent-blue transition z-10 w-12 h-12 flex items-center justify-center">
            <i class="fas fa-chevron-right"></i>
        </button>
        
        <!-- Main Image Container -->
        <div id="lightbox-image-container" class="relative w-full h-full flex items-center justify-center p-4 md:p-20">
            <img id="lightbox-image" src="" alt="" class="max-w-full max-h-full object-contain rounded-lg shadow-2xl cursor-zoom-in">
        </div>
        
        <!-- Image Counter -->
        <div id="lightbox-counter" class="absolute top-4 left-1/2 transform -translate-x-1/2 text-white bg-black bg-opacity-50 px-4 py-2 rounded-full text-sm">
            <span id="lightbox-current">1</span> / <span id="lightbox-total">1</span>
        </div>
        
        <!-- Thumbnails Bar -->
        <div id="lightbox-thumbnails" class="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2 bg-black bg-opacity-50 p-3 rounded-lg max-w-[90vw] overflow-x-auto">
            <!-- Thumbnails will be populated here -->
        </div>
        
        <!-- Zoom Controls (for desktop) -->
        <div class="hidden md:flex absolute bottom-4 right-4 space-x-2">
            <button id="lightbox-zoom-in" class="bg-black bg-opacity-50 text-white w-10 h-10 rounded-full hover:bg-opacity-70 transition">
                <i class="fas fa-search-plus"></i>
            </button>
            <button id="lightbox-zoom-out" class="bg-black bg-opacity-50 text-white w-10 h-10 rounded-full hover:bg-opacity-70 transition">
                <i class="fas fa-search-minus"></i>
            </button>
            <button id="lightbox-zoom-reset" class="bg-black bg-opacity-50 text-white w-10 h-10 rounded-full hover:bg-opacity-70 transition">
                <i class="fas fa-compress"></i>
            </button>
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

// prayer-calculator.js - Калькулятор времени молитв с поддержкой аутентификации

// Глобальные переменные для аутентификации
window.currentUser = null;
window.authToken = localStorage.getItem('authToken');
window.apiBaseUrl = window.location.origin; // Базовый URL API

class PrayerTimesCalculator {
    constructor() {
        this.latitude = 55.7558; // Москва по умолчанию
        this.longitude = 37.6173;
        this.city = "Москва";
        this.calculationMethod = 3; // Makkah по умолчанию
        this.madhhab = 0; // Shafi'i по умолчанию
        this.prayerTimes = {};
        this.selectedDate = new Date();
        
        // Инициализация аутентификации
        this.authToken = window.authToken;
        this.isAuthenticated = !!this.authToken;
        
        // Загружаем сохраненные настройки
        this.loadSettings();
        
        // Регистрируем глобальный экземпляр для доступа из других модулей
        if (typeof window !== 'undefined') {
            window.prayerCalculator = this;
        }
    }
    
    loadSettings() {
        const saved = localStorage.getItem('prayerSettings');
        if (saved) {
            try {
                const settings = JSON.parse(saved);
                this.latitude = settings.latitude || this.latitude;
                this.longitude = settings.longitude || this.longitude;
                this.city = settings.city || this.city;
                this.calculationMethod = settings.calculationMethod || this.calculationMethod;
                this.madhhab = settings.madhhab || this.madhhab;
            } catch (e) {
                console.error('Ошибка загрузки настроек:', e);
            }
        }
    }
    
    saveSettings() {
        try {
            localStorage.setItem('prayerSettings', JSON.stringify({
                latitude: this.latitude,
                longitude: this.longitude,
                city: this.city,
                calculationMethod: this.calculationMethod,
                madhhab: this.madhhab
            }));
        } catch (e) {
            console.error('Ошибка сохранения настроек:', e);
        }
    }
    
    setLocation(lat, lon, cityName = '') {
        this.latitude = lat;
        this.longitude = lon;
        if (cityName) {
            this.city = cityName;
        }
        this.saveSettings();
    }
    
    setCalculationMethod(method) {
        this.calculationMethod = parseInt(method);
        this.saveSettings();
    }
    
    setMadhhab(madhhab) {
        this.madhhab = parseInt(madhhab);
        this.saveSettings();
    }
    
    // Установка токена авторизации
    setAuthToken(token) {
        this.authToken = token;
        this.isAuthenticated = !!token;
        if (token) {
            localStorage.setItem('authToken', token);
        } else {
            localStorage.removeItem('authToken');
        }
    }
    
    // Получение кода метода для API
    getMethodCode() {
        const methodCodes = {
            0: "3",  // MWL
            1: "2",  // ISNA
            2: "5",  // Egypt
            3: "4",  // Makkah
            4: "1",  // Karachi
            5: "7"   // Tehran
        };
        return methodCodes[this.calculationMethod] || "4";
    }
    
    // Форматирование даты для API
    formatDate(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
    
    // Запрос времени молитв из API с поддержкой авторизации
    async fetchPrayerTimes(date = null) {
        const targetDate = date || this.selectedDate;
        const year = targetDate.getFullYear();
        const month = targetDate.getMonth() + 1;
        const day = targetDate.getDate();
        
        const url = `${window.apiBaseUrl}/api/prayer-times?lat=${this.latitude}&lon=${this.longitude}&city=${encodeURIComponent(this.city)}&method=${this.calculationMethod}&madhhab=${this.madhhab}&year=${year}&month=${month}&day=${day}`;
        
        try {
            const headers = {
                'Accept': 'application/json',
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache'
            };
            
            // Добавляем токен авторизации, если есть
            if (this.authToken) {
                headers['Authorization'] = `Bearer ${this.authToken}`;
            }
            
            const response = await fetch(url, {
                method: 'GET',
                headers: headers,
                cache: 'no-store'
            });
            
            // Обработка ошибок авторизации
            if (response.status === 401) {
                console.warn('Требуется авторизация для доступа к API');
                // Можно вызвать событие для обновления интерфейса
                if (typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent('authRequired'));
                }
            }
            
            const data = await response.json();
            
            if (data.success && data.data) {
                this.prayerTimes = {
                    fajr: data.data.fajr,
                    sunrise: data.data.sunrise,
                    dhuhr: data.data.dhuhr,
                    asr: data.data.asr,
                    maghrib: data.data.maghrib,
                    isha: data.data.isha,
                    date: data.data.date,
                    currentPrayer: data.data.currentPrayer,
                    nextPrayer: data.data.nextPrayer
                };
                
                // Обновляем город, если он изменился
                if (data.data.city) {
                    this.city = data.data.city;
                }
                
                // Обновляем статистику, если пользователь авторизован
                if (this.isAuthenticated && typeof this.updateUserStats === 'function') {
                    await this.updateUserStats();
                }
                
                return this.prayerTimes;
            } else {
                throw new Error(data.message || 'Invalid API response');
            }
        } catch (error) {
            console.error('Ошибка при получении времени молитв:', error);
            // Fallback на локальный расчет
            return this.calculatePrayerTimesLocal(targetDate);
        }
    }
    
    // Обновление статистики пользователя
    async updateUserStats() {
        if (!this.isAuthenticated || !this.authToken) {
            return;
        }
        
        try {
            const statsUrl = `${window.apiBaseUrl}/api/user/stats`;
            const response = await fetch(statsUrl, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.authToken}`,
                    'Accept': 'application/json'
                }
            });
            
            if (response.ok) {
                const stats = await response.json();
                // Обновляем интерфейс статистики
                this.updateStatsUI(stats);
            }
        } catch (error) {
            console.error('Ошибка получения статистики:', error);
        }
    }
    
    // Обновление UI статистики
    updateStatsUI(stats) {
        const userCountElement = document.getElementById('user-count');
        const requestCountElement = document.getElementById('request-count');
        
        if (userCountElement && stats.totalUsers !== undefined) {
            userCountElement.textContent = stats.totalUsers.toLocaleString();
        }
        
        if (requestCountElement && stats.totalRequests !== undefined) {
            requestCountElement.textContent = stats.totalRequests.toLocaleString();
        }
        
        // Обновление в настройках профиля
        const profileInfoElement = document.getElementById('profile-info');
        if (profileInfoElement && stats.userStats) {
            this.updateProfileUI(stats.userStats);
        }
    }
    
    // Обновление UI профиля
    updateProfileUI(userStats) {
        const profileInfoElement = document.getElementById('profile-info');
        if (!profileInfoElement) return;
        
        profileInfoElement.innerHTML = `
            <div class="profile-header">
                <div class="profile-avatar">
                    <i class="fas fa-user-circle"></i>
                </div>
                <div class="profile-details">
                    <h3>${window.currentUser?.name || 'Пользователь'}</h3>
                    <p>${window.currentUser?.email || ''}</p>
                    <p class="profile-stats">Запросов времени: ${userStats.prayerRequests || 0}</p>
                    <p class="profile-stats">Последний вход: ${userStats.lastLogin || 'Недавно'}</p>
                </div>
            </div>
        `;
    }
    
    // Форматирование времени из API (HH:mm -> HH:mm)
    formatTime(timeStr) {
        return timeStr?.substring(0, 5) || '--:--';
    }
    
    // Форматирование даты для отображения
    formatDateDisplay(date) {
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}.${month}.${year}`;
    }
    
    // Локальный расчет времени молитв (fallback)
    calculatePrayerTimesLocal(date) {
        // Упрощенный расчет на основе координат
        // В реальном приложении здесь был бы сложный алгоритм
        const now = date || new Date();
        const month = now.getMonth();
        const isSummer = month >= 4 && month <= 9; // Апрель-сентябрь
        
        // Базовые времена для Москвы
        const baseTimes = {
            fajr: "03:30",
            sunrise: "05:30",
            dhuhr: "12:30",
            asr: "16:30",
            maghrib: "20:00",
            isha: "21:30"
        };
        
        // Корректировка для сезона
        if (isSummer) {
            baseTimes.fajr = "02:30";
            baseTimes.sunrise = "04:30";
            baseTimes.maghrib = "21:00";
            baseTimes.isha = "22:30";
        }
        
        return {
            ...baseTimes,
            date: this.formatDateDisplay(date)
        };
    }
    
    // Получение текущей молитвы
    getCurrentPrayer() {
        if (this.prayerTimes && this.prayerTimes.currentPrayer) {
            return this.prayerTimes.currentPrayer;
        }
        
        if (!this.prayerTimes || Object.keys(this.prayerTimes).length === 0) {
            return "Isha";
        }
        
        const now = new Date();
        const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        
        const prayers = [
            { name: "Isha", time: this.prayerTimes.isha },
            { name: "Maghrib", time: this.prayerTimes.maghrib },
            { name: "Asr", time: this.prayerTimes.asr },
            { name: "Dhuhr", time: this.prayerTimes.dhuhr },
            { name: "Sunrise", time: this.prayerTimes.sunrise },
            { name: "Fajr", time: this.prayerTimes.fajr }
        ];
        
        for (let i = prayers.length - 1; i >= 0; i--) {
            if (currentTime >= prayers[i].time) {
                return prayers[i].name;
            }
        }
        
        return "Isha";
    }
    
    // Получение следующей молитвы
    getNextPrayer() {
        if (this.prayerTimes && this.prayerTimes.nextPrayer) {
            return this.prayerTimes.nextPrayer;
        }
        
        if (!this.prayerTimes || Object.keys(this.prayerTimes).length === 0) {
            return "Fajr";
        }
        
        const now = new Date();
        const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        
        const prayers = [
            { name: "Fajr", time: this.prayerTimes.fajr },
            { name: "Sunrise", time: this.prayerTimes.sunrise },
            { name: "Dhuhr", time: this.prayerTimes.dhuhr },
            { name: "Asr", time: this.prayerTimes.asr },
            { name: "Maghrib", time: this.prayerTimes.maghrib },
            { name: "Isha", time: this.prayerTimes.isha }
        ];
        
        for (let prayer of prayers) {
            if (currentTime < prayer.time) {
                return prayer.name;
            }
        }
        
        return "Fajr";
    }
    
    // Получение времени следующей молитвы
    getNextPrayerTime() {
        const nextPrayer = this.getNextPrayer();
        if (!this.prayerTimes || !this.prayerTimes[nextPrayer.toLowerCase()]) {
            return null;
        }
        return this.prayerTimes[nextPrayer.toLowerCase()];
    }
    
    // Расчет времени до следующей молитвы (в секундах)
    getTimeUntilNextPrayer() {
        const nextTime = this.getNextPrayerTime();
        if (!nextTime) return 0;
        
        const now = new Date();
        const [hours, minutes] = nextTime.split(':').map(Number);
        const nextPrayerDate = new Date(now);
        nextPrayerDate.setHours(hours, minutes, 0, 0);
        
        // Если время уже прошло сегодня, берем на завтра
        if (nextPrayerDate < now) {
            nextPrayerDate.setDate(nextPrayerDate.getDate() + 1);
        }
        
        return Math.floor((nextPrayerDate - now) / 1000);
    }
}

// Глобальная функция для обертки fetch с авторизацией
async function fetchWithAuth(url, options = {}) {
    const headers = {
        'Accept': 'application/json',
        ...options.headers
    };
    
    // Добавляем токен авторизации, если есть
    if (window.authToken) {
        headers['Authorization'] = `Bearer ${window.authToken}`;
    }
    
    try {
        const response = await fetch(url, {
            ...options,
            headers: headers
        });
        
        // Обработка ошибок авторизации
        if (response.status === 401) {
            console.warn('Требуется авторизация');
            // Сбрасываем аутентификацию
            window.authToken = null;
            localStorage.removeItem('authToken');
            window.currentUser = null;
            
            // Обновляем UI
            if (typeof window.updateAuthUI === 'function') {
                window.updateAuthUI();
            }
            
            throw new Error('Требуется авторизация');
        }
        
        return response;
    } catch (error) {
        console.error('Ошибка запроса:', error);
        throw error;
    }
}

// Функция для получения времени молитв с авторизацией
async function fetchPrayerTimesWithAuth(url) {
    return fetchWithAuth(url, {
        headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache'
        },
        cache: 'no-store'
    });
}

// Экспорт для использования в других файлах
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        PrayerTimesCalculator,
        fetchWithAuth,
        fetchPrayerTimesWithAuth
    };
}
// Главный файл приложения - инициализация

// Глобальные функции и переменные для приложения
window.prayerCalculator = null;
window.authManager = null;

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', async function() {
    await initServiceWorker();
    await initAuthManager();
    await initPrayerCalculator();
    initTheme();
    initNavigation();
    initSettings();
    initDhikr();
    initCalendar();
    initCitySearch();
    initGeolocation();
    initNotifications();
    initQiblaInfo();
    initEvents();
    initArticles();
    
    // Инициализация UI улучшений (должна быть после всех остальных)
    if (window.initUIEnhancements) {
        initUIEnhancements();
    }
    
    // Обновление обратного отсчета каждую секунду
    setInterval(updateCountdown, 1000);
    
    // Обновление времени молитв каждую минуту
    setInterval(async () => {
        await updatePrayerInfo();
    }, 60000);
    
    // Инициализация даты Хиджры
    updateHijriDate();
    setInterval(updateHijriDate, 86400000); // Обновляем раз в день
    
    // Запуск обновления интерфейса
    startUIUpdates();
});

async function initServiceWorker() {
    if ('serviceWorker' in navigator) {
        try {
            const registration = await navigator.serviceWorker.register('/js/service-worker.js');
            console.log('ServiceWorker зарегистрирован:', registration.scope);
        } catch (error) {
            console.error('Ошибка регистрации ServiceWorker:', error);
        }
    }
}

async function initAuthManager() {
    // Проверяем, существует ли уже менеджер аутентификации
    if (typeof AuthManager !== 'undefined') {
        window.authManager = new AuthManager();
        console.log('Менеджер аутентификации инициализирован');
    } else {
        console.warn('Менеджер аутентификации не найден, проверьте загрузку auth.js');
    }
}

async function initPrayerCalculator() {
    if (typeof PrayerTimesCalculator !== 'undefined') {
        window.prayerCalculator = new PrayerTimesCalculator();
        
        // Загружаем время молитв
        await updatePrayerTimes();
        
        // Обновляем интерфейс времени
        updatePrayerTimesUI();
        
        console.log('Калькулятор времени молитв инициализирован');
    } else {
        console.error('Калькулятор времени молитв не найден, проверьте загрузку prayer-calculator.js');
    }
}

async function updatePrayerTimes() {
    if (window.prayerCalculator) {
        try {
            const times = await window.prayerCalculator.fetchPrayerTimes();
            
            // Обновление статистики, если пользователь авторизован
            if (window.authManager?.currentUser && typeof window.updateUserStats === 'function') {
                await window.updateUserStats();
            }
            
            return times;
        } catch (error) {
            console.error('Ошибка обновления времени молитв:', error);
            return null;
        }
    }
    return null;
}

function updatePrayerTimesUI() {
    if (!window.prayerCalculator?.prayerTimes) return;
    
    const times = window.prayerCalculator.prayerTimes;
    
    // Обновление карточек текущей и следующей молитвы
    const currentPrayerElement = document.getElementById('current-prayer-name');
    const nextPrayerElement = document.getElementById('next-prayer-name');
    
    if (currentPrayerElement && times.currentPrayer) {
        currentPrayerElement.textContent = times.currentPrayer;
    }
    
    if (nextPrayerElement && times.nextPrayer) {
        nextPrayerElement.textContent = times.nextPrayer;
    }
    
    // Обновление списка времен намазов
    updatePrayerListUI();
    
    // Обновление текущей даты
    const currentDateElement = document.getElementById('current-date');
    if (currentDateElement) {
        currentDateElement.textContent = window.prayerCalculator.formatDateDisplay(new Date());
    }
    
    // Обновление текущего города
    const currentCityElement = document.getElementById('current-city');
    if (currentCityElement && window.prayerCalculator.city) {
        currentCityElement.textContent = window.prayerCalculator.city;
    }
    
    // Обновление города в настройках
    const settingsCityElement = document.getElementById('settings-city');
    const settingsCoordsElement = document.getElementById('settings-coords');
    if (settingsCityElement) {
        settingsCityElement.textContent = window.prayerCalculator.city;
    }
    if (settingsCoordsElement) {
        settingsCoordsElement.textContent = 
            `${window.prayerCalculator.latitude.toFixed(2)}°N, ${window.prayerCalculator.longitude.toFixed(2)}°E`;
    }
}

function updatePrayerListUI() {
    if (!window.prayerCalculator?.prayerTimes) return;
    
    const listElement = document.getElementById('prayer-times-list');
    if (!listElement) return;
    
    const times = window.prayerCalculator.prayerTimes;
    const prayerNames = {
        fajr: 'Фаджр',
        sunrise: 'Восход',
        dhuhr: 'Зухр',
        asr: 'Аср',
        maghrib: 'Магриб',
        isha: 'Иша'
    };
    
    listElement.innerHTML = '';
    
    for (const [key, value] of Object.entries(prayerNames)) {
        if (times[key]) {
            const item = document.createElement('div');
            item.className = 'prayer-time-item';
            
            // Проверяем, является ли эта молитва текущей или следующей
            const currentPrayer = times.currentPrayer?.toLowerCase();
            const nextPrayer = times.nextPrayer?.toLowerCase();
            
            if (currentPrayer === key) {
                item.classList.add('current');
            } else if (nextPrayer === key) {
                item.classList.add('next');
            }
            
            item.innerHTML = `
                <div class="prayer-time-name">${value}</div>
                <div class="prayer-time-value">${window.prayerCalculator.formatTime(times[key])}</div>
            `;
            
            listElement.appendChild(item);
        }
    }
}

function updateCountdown() {
    if (window.prayerCalculator) {
        try {
            const seconds = window.prayerCalculator.getTimeUntilNextPrayer();
            const hours = Math.floor(seconds / 3600);
            const minutes = Math.floor((seconds % 3600) / 60);
            const secs = seconds % 60;
            
            const countdownElement = document.getElementById('countdown-time');
            if (countdownElement) {
                countdownElement.textContent = 
                    `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
            }
        } catch (error) {
            console.error('Ошибка обновления таймера:', error);
        }
    }
}

async function updatePrayerInfo() {
    await updatePrayerTimes();
    updatePrayerTimesUI();
}

function updateHijriDate() {
    // Упрощенная функция для получения даты Хиджры
    // В реальном приложении здесь был бы сложный алгоритм
    
    const gregorianDate = new Date();
    const gregorianYear = gregorianDate.getFullYear();
    const gregorianMonth = gregorianDate.getMonth() + 1;
    const gregorianDay = gregorianDate.getDate();
    
    // Примерные коэффициенты для конвертации (упрощенно)
    const hijriYear = Math.floor((gregorianYear - 622) * (33/32));
    const hijriMonth = ((gregorianMonth + 9) % 12) + 1;
    const hijriDay = gregorianDay;
    
    const hijriDateElement = document.getElementById('hijri-date');
    if (hijriDateElement) {
        hijriDateElement.textContent = `${hijriDay}.${hijriMonth}.${hijriYear} г.х.`;
    }
}

function startUIUpdates() {
    // Обновление статистики каждые 10 минут
    setInterval(async () => {
        if (window.authManager?.currentUser && typeof window.updateUserStats === 'function') {
            await window.updateUserStats();
        }
    }, 10 * 60 * 1000);
}

// Глобальная функция для обновления данных приложения
window.updateAppData = async function() {
    await updatePrayerTimes();
    updatePrayerTimesUI();
    
    // Обновление других данных
    if (typeof updateEvents === 'function') updateEvents();
    if (typeof updateArticles === 'function') updateArticles();
};

// Глобальная функция для обновления статистики
window.updateUserStats = async function() {
    if (window.prayerCalculator?.isAuthenticated) {
        try {
            await window.prayerCalculator.updateUserStats();
        } catch (error) {
            console.error('Ошибка обновления статистики:', error);
        }
    }
};

// Функция для обновления интерфейса при смене местоположения
window.updateLocationUI = async function(lat, lon, city) {
    if (window.prayerCalculator) {
        window.prayerCalculator.setLocation(lat, lon, city);
        await updatePrayerTimes();
        updatePrayerTimesUI();
    }
};

// Функция для обновления интерфейса при изменении настроек расчета
window.updateCalculationSettings = async function(method, madhhab) {
    if (window.prayerCalculator) {
        window.prayerCalculator.setCalculationMethod(method);
        window.prayerCalculator.setMadhhab(madhhab);
        await updatePrayerTimes();
        updatePrayerTimesUI();
    }
};

// Экспорт для Node.js (если нужно)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        updatePrayerTimes,
        updatePrayerTimesUI,
        updateCountdown,
        updateHijriDate
    };
}

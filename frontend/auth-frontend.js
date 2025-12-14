// auth-frontend.js
// Фронтенд для аутентификации и регистрации

let currentUser = null;
let authToken = localStorage.getItem('authToken');

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    initAuth();
    updateUI();
    
    // Проверяем авторизацию при загрузке
    if (authToken) {
        checkAuth();
    }
});

// Инициализация обработчиков событий
function initAuth() {
    // Форма входа
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            login();
        });
    }
    
    // Форма регистрации
    const registerForm = document.getElementById('register-form');
    if (registerForm) {
        registerForm.addEventListener('submit', function(e) {
            e.preventDefault();
            register();
        });
    }
    
    // Форма смены пароля
    const changePasswordForm = document.getElementById('change-password-form');
    if (changePasswordForm) {
        changePasswordForm.addEventListener('submit', function(e) {
            e.preventDefault();
            changePassword();
        });
    }
    
    // Обработка нажатия Enter в полях пароля
    document.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            const activeModal = getActiveModal();
            if (activeModal === 'login-modal' && e.target.matches('#login-email, #login-password')) {
                login();
            } else if (activeModal === 'register-modal' && e.target.matches('#register-name, #register-email, #register-password, #register-confirm-password')) {
                register();
            }
        }
    });
}

// Обновление интерфейса в зависимости от авторизации
function updateUI() {
    const navAuth = document.getElementById('nav-auth');
    const navUser = document.getElementById('nav-user');
    const userNameSpan = document.getElementById('user-name');
    
    if (currentUser) {
        // Пользователь авторизован
        if (navAuth) navAuth.style.display = 'none';
        if (navUser) navUser.style.display = 'flex';
        if (userNameSpan) userNameSpan.textContent = currentUser.name;
        
        // Обновляем статистику
        updateStats();
    } else {
        // Пользователь не авторизован
        if (navAuth) navAuth.style.display = 'flex';
        if (navUser) navUser.style.display = 'none';
        if (userNameSpan) userNameSpan.textContent = 'Пользователь';
    }
}

// Проверка авторизации
async function checkAuth() {
    if (!authToken) {
        currentUser = null;
        updateUI();
        return;
    }
    
    try {
        const response = await fetch('/api/auth/me', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.success) {
                currentUser = data.data;
                updateUI();
                showNotification('success', 'Вы успешно авторизованы');
            } else {
                localStorage.removeItem('authToken');
                authToken = null;
                currentUser = null;
                updateUI();
            }
        } else {
            localStorage.removeItem('authToken');
            authToken = null;
            currentUser = null;
            updateUI();
        }
    } catch (error) {
        console.error('Ошибка при проверке авторизации:', error);
        showNotification('error', 'Ошибка при проверке авторизации');
    }
}

// Вход в систему
async function login() {
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    
    // Валидация
    if (!email || !password) {
        showNotification('error', 'Пожалуйста, заполните все поля');
        return;
    }
    
    if (!isValidEmail(email)) {
        showNotification('error', 'Пожалуйста, введите корректный email');
        return;
    }
    
    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: email,
                password: password
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Сохраняем токен
            authToken = data.data.token;
            localStorage.setItem('authToken', authToken);
            currentUser = {
                id: data.data.userId,
                name: data.data.name,
                email: data.data.email
            };
            
            // Обновляем интерфейс
            updateUI();
            hideLoginForm();
            
            // Показываем уведомление
            showNotification('success', 'Вы успешно вошли в систему');
            
            // Очищаем форму
            document.getElementById('login-form').reset();
        } else {
            showNotification('error', data.message || 'Ошибка при входе в систему');
        }
    } catch (error) {
        console.error('Ошибка при входе:', error);
        showNotification('error', 'Ошибка сети. Пожалуйста, попробуйте позже');
    }
}

// Регистрация
async function register() {
    const name = document.getElementById('register-name').value.trim();
    const email = document.getElementById('register-email').value.trim();
    const password = document.getElementById('register-password').value;
    const confirmPassword = document.getElementById('register-confirm-password').value;
    
    // Валидация
    if (!name || !email || !password || !confirmPassword) {
        showNotification('error', 'Пожалуйста, заполните все поля');
        return;
    }
    
    if (!isValidEmail(email)) {
        showNotification('error', 'Пожалуйста, введите корректный email');
        return;
    }
    
    if (password.length < 8) {
        showNotification('error', 'Пароль должен содержать минимум 8 символов');
        return;
    }
    
    if (!isPasswordStrong(password)) {
        showNotification('error', 'Пароль должен содержать цифры, заглавные и строчные буквы');
        return;
    }
    
    if (password !== confirmPassword) {
        showNotification('error', 'Пароли не совпадают');
        return;
    }
    
    try {
        const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: name,
                email: email,
                password: password
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Сохраняем токен
            authToken = data.data.token;
            localStorage.setItem('authToken', authToken);
            currentUser = {
                id: data.data.userId,
                name: data.data.name,
                email: data.data.email
            };
            
            // Обновляем интерфейс
            updateUI();
            hideRegisterForm();
            
            // Показываем уведомление
            showNotification('success', 'Регистрация успешно завершена!');
            
            // Очищаем форму
            document.getElementById('register-form').reset();
        } else {
            showNotification('error', data.message || 'Ошибка при регистрации');
        }
    } catch (error) {
        console.error('Ошибка при регистрации:', error);
        showNotification('error', 'Ошибка сети. Пожалуйста, попробуйте позже');
    }
}

// Выход из системы
async function logout() {
    if (!authToken) {
        currentUser = null;
        updateUI();
        return;
    }
    
    try {
        const response = await fetch('/api/auth/logout', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.success) {
                showNotification('success', 'Вы успешно вышли из системы');
            }
        }
    } catch (error) {
        console.error('Ошибка при выходе:', error);
    } finally {
        // В любом случае очищаем данные
        localStorage.removeItem('authToken');
        authToken = null;
        currentUser = null;
        updateUI();
    }
}

// Смена пароля
async function changePassword() {
    const oldPassword = document.getElementById('old-password').value;
    const newPassword = document.getElementById('new-password').value;
    const confirmNewPassword = document.getElementById('confirm-new-password').value;
    
    // Валидация
    if (!oldPassword || !newPassword || !confirmNewPassword) {
        showNotification('error', 'Пожалуйста, заполните все поля');
        return;
    }
    
    if (newPassword.length < 8) {
        showNotification('error', 'Пароль должен содержать минимум 8 символов');
        return;
    }
    
    if (!isPasswordStrong(newPassword)) {
        showNotification('error', 'Пароль должен содержать цифры, заглавные и строчные буквы');
        return;
    }
    
    if (newPassword !== confirmNewPassword) {
        showNotification('error', 'Пароли не совпадают');
        return;
    }
    
    if (!authToken) {
        showNotification('error', 'Вы не авторизованы');
        return;
    }
    
    try {
        const response = await fetch('/api/auth/change-password', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                oldPassword: oldPassword,
                newPassword: newPassword
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            hideChangePasswordForm();
            showNotification('success', 'Пароль успешно изменен');
            
            // Очищаем форму
            document.getElementById('change-password-form').reset();
        } else {
            showNotification('error', data.message || 'Ошибка при смене пароля');
        }
    } catch (error) {
        console.error('Ошибка при смене пароля:', error);
        showNotification('error', 'Ошибка сети. Пожалуйста, попробуйте позже');
    }
}

// Получение информации о текущем пользователе
async function getCurrentUserInfo() {
    if (!authToken) {
        return null;
    }
    
    try {
        const response = await fetch('/api/auth/current', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.success) {
                return data.data;
            }
        }
    } catch (error) {
        console.error('Ошибка при получении информации о пользователе:', error);
    }
    
    return null;
}

// Обновление статистики
async function updateStats() {
    if (!authToken) {
        return;
    }
    
    try {
        const response = await fetch('/api/auth/stats', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.success) {
                const userCount = document.getElementById('user-count');
                if (userCount && data.data.totalUsers) {
                    userCount.textContent = data.data.totalUsers;
                }
            }
        }
    } catch (error) {
        console.error('Ошибка при получении статистики:', error);
    }
}

// Валидация email
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Проверка сложности пароля
function isPasswordStrong(password) {
    // Минимум 8 символов, хотя бы одна цифра, одна заглавная и одна строчная буква
    const passwordRegex = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{8,}$/;
    return passwordRegex.test(password);
}

// Переключение видимости пароля
function togglePassword(inputId, icon) {
    const input = document.getElementById(inputId);
    if (input.type === 'password') {
        input.type = 'text';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
    } else {
        input.type = 'password';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
    }
}

// Показать форму входа
function showLoginForm() {
    hideAllModals();
    document.getElementById('login-modal').style.display = 'block';
    document.getElementById('login-email').focus();
}

// Скрыть форму входа
function hideLoginForm() {
    document.getElementById('login-modal').style.display = 'none';
    document.getElementById('login-form').reset();
}

// Показать форму регистрации
function showRegisterForm() {
    hideAllModals();
    document.getElementById('register-modal').style.display = 'block';
    document.getElementById('register-name').focus();
}

// Скрыть форму регистрации
function hideRegisterForm() {
    document.getElementById('register-modal').style.display = 'none';
    document.getElementById('register-form').reset();
}

// Показать профиль пользователя
async function showProfileModal() {
    if (!currentUser) {
        showNotification('error', 'Вы не авторизованы');
        return;
    }
    
    hideAllModals();
    const modal = document.getElementById('profile-modal');
    const profileInfo = document.getElementById('profile-info');
    
    // Показываем загрузку
    profileInfo.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Загрузка данных...</div>';
    modal.style.display = 'block';
    
    // Загружаем информацию о пользователе
    const userInfo = await getCurrentUserInfo();
    if (userInfo) {
        profileInfo.innerHTML = `
            <div class="profile-details">
                <div class="profile-field">
                    <i class="fas fa-user"></i>
                    <div>
                        <div class="field-label">Имя</div>
                        <div class="field-value">${userInfo.name || 'Не указано'}</div>
                    </div>
                </div>
                <div class="profile-field">
                    <i class="fas fa-envelope"></i>
                    <div>
                        <div class="field-label">Email</div>
                        <div class="field-value">${userInfo.email || 'Не указан'}</div>
                    </div>
                </div>
                <div class="profile-field">
                    <i class="fas fa-calendar-alt"></i>
                    <div>
                        <div class="field-label">Дата регистрации</div>
                        <div class="field-value">${userInfo.createdAt || 'Неизвестно'}</div>
                    </div>
                </div>
                <div class="profile-field">
                    <i class="fas fa-sign-in-alt"></i>
                    <div>
                        <div class="field-label">Последний вход</div>
                        <div class="field-value">${userInfo.lastLogin || 'Неизвестно'}</div>
                    </div>
                </div>
                <div class="profile-field">
                    <i class="fas fa-shield-alt"></i>
                    <div>
                        <div class="field-label">Статус</div>
                        <div class="field-value">${userInfo.isActive === '1' ? 'Активен' : 'Неактивен'}</div>
                    </div>
                </div>
            </div>
        `;
    } else {
        profileInfo.innerHTML = '<div class="error">Не удалось загрузить информацию о профиле</div>';
    }
}

// Скрыть профиль пользователя
function hideProfileModal() {
    document.getElementById('profile-modal').style.display = 'none';
}

// Показать форму смены пароля
function showChangePasswordForm() {
    hideAllModals();
    document.getElementById('change-password-modal').style.display = 'block';
    document.getElementById('old-password').focus();
}

// Скрыть форму смены пароля
function hideChangePasswordForm() {
    document.getElementById('change-password-modal').style.display = 'none';
    document.getElementById('change-password-form').reset();
}

// Скрыть все модальные окна
function hideAllModals() {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        modal.style.display = 'none';
    });
}

// Получить активное модальное окно
function getActiveModal() {
    const modals = document.querySelectorAll('.modal');
    for (const modal of modals) {
        if (modal.style.display === 'block') {
            return modal.id;
        }
    }
    return null;
}

// Показать уведомление
function showNotification(type, message) {
    const container = document.getElementById('notification-container');
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    
    let icon = 'fa-info-circle';
    if (type === 'success') icon = 'fa-check-circle';
    if (type === 'error') icon = 'fa-exclamation-circle';
    if (type === 'warning') icon = 'fa-exclamation-triangle';
    
    notification.innerHTML = `
        <i class="fas ${icon}"></i>
        <span>${message}</span>
        <button onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    container.appendChild(notification);
    
    // Автоматическое удаление через 5 секунд
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 5000);
}

// API для получения авторизационного заголовка
function getAuthHeader() {
    if (authToken) {
        return {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
        };
    }
    return {
        'Content-Type': 'application/json'
    };
}

// Проверка авторизации перед выполнением защищенного действия
function requireAuth(callback) {
    if (!currentUser) {
        showNotification('warning', 'Пожалуйста, войдите в систему для выполнения этого действия');
        showLoginForm();
        return false;
    }
    return callback();
}
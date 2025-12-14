// js/auth.js
class AuthManager {
    constructor() {
        this.currentUser = null;
        this.authToken = localStorage.getItem('authToken');
        this.apiBaseUrl = window.location.origin;
        
        this.init();
    }
    
    init() {
        // Проверяем текущую сессию при загрузке
        this.checkSession();
        
        // Назначаем обработчики событий
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        // Обработчик формы входа
        const loginForm = document.getElementById('login-form');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }
        
        // Обработчик формы регистрации
        const registerForm = document.getElementById('register-form');
        if (registerForm) {
            registerForm.addEventListener('submit', (e) => this.handleRegister(e));
        }
        
        // Обработчик смены пароля
        const changePasswordForm = document.getElementById('change-password-form');
        if (changePasswordForm) {
            changePasswordForm.addEventListener('submit', (e) => this.handleChangePassword(e));
        }
    }
    
    async checkSession() {
        if (this.authToken) {
            try {
                const response = await fetch(`${this.apiBaseUrl}/api/auth/verify`, {
                    headers: {
                        'Authorization': `Bearer ${this.authToken}`
                    }
                });
                
                if (response.ok) {
                    const userData = await response.json();
                    this.currentUser = userData;
                    this.updateAuthUI();
                } else {
                    this.logout();
                }
            } catch (error) {
                console.error('Ошибка проверки сессии:', error);
                this.logout();
            }
        }
        
        this.updateAuthUI();
    }
    
    async handleLogin(e) {
        e.preventDefault();
        
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        
        try {
            const response = await fetch(`${this.apiBaseUrl}/api/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });
            
            const data = await response.json();
            
            if (response.ok && data.success) {
                this.authToken = data.token;
                this.currentUser = data.user;
                
                localStorage.setItem('authToken', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));
                
                // Обновляем калькулятор, если он существует
                if (window.prayerCalculator) {
                    window.prayerCalculator.setAuthToken(data.token);
                }
                
                this.updateAuthUI();
                this.hideLoginForm();
                
                // Показываем уведомление об успешном входе
                this.showNotification('Вход выполнен успешно!', 'success');
                
                // Обновляем данные приложения
                if (typeof window.updateAppData === 'function') {
                    window.updateAppData();
                }
            } else {
                this.showNotification(data.message || 'Ошибка входа', 'error');
            }
        } catch (error) {
            console.error('Ошибка входа:', error);
            this.showNotification('Ошибка соединения с сервером', 'error');
        }
    }
    
    async handleRegister(e) {
        e.preventDefault();
        
        const name = document.getElementById('register-name').value;
        const email = document.getElementById('register-email').value;
        const password = document.getElementById('register-password').value;
        const confirmPassword = document.getElementById('register-confirm-password').value;
        
        // Проверка паролей
        if (password !== confirmPassword) {
            this.showNotification('Пароли не совпадают', 'error');
            return;
        }
        
        // Проверка сложности пароля
        if (password.length < 8) {
            this.showNotification('Пароль должен содержать минимум 8 символов', 'error');
            return;
        }
        
        try {
            const response = await fetch(`${this.apiBaseUrl}/api/auth/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ name, email, password })
            });
            
            const data = await response.json();
            
            if (response.ok && data.success) {
                this.showNotification('Регистрация успешна! Теперь войдите в систему.', 'success');
                this.hideRegisterForm();
                this.showLoginForm();
            } else {
                this.showNotification(data.message || 'Ошибка регистрации', 'error');
            }
        } catch (error) {
            console.error('Ошибка регистрации:', error);
            this.showNotification('Ошибка соединения с сервером', 'error');
        }
    }
    
    async handleChangePassword(e) {
        e.preventDefault();
        
        const oldPassword = document.getElementById('old-password').value;
        const newPassword = document.getElementById('new-password').value;
        const confirmNewPassword = document.getElementById('confirm-new-password').value;
        
        if (newPassword !== confirmNewPassword) {
            this.showNotification('Новые пароли не совпадают', 'error');
            return;
        }
        
        if (!this.authToken) {
            this.showNotification('Требуется авторизация', 'error');
            return;
        }
        
        try {
            const response = await fetch(`${this.apiBaseUrl}/api/auth/change-password`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.authToken}`
                },
                body: JSON.stringify({ oldPassword, newPassword })
            });
            
            const data = await response.json();
            
            if (response.ok && data.success) {
                this.showNotification('Пароль успешно изменен', 'success');
                this.hideChangePasswordForm();
            } else {
                this.showNotification(data.message || 'Ошибка смены пароля', 'error');
            }
        } catch (error) {
            console.error('Ошибка смены пароля:', error);
            this.showNotification('Ошибка соединения с сервером', 'error');
        }
    }
    
    logout() {
        this.authToken = null;
        this.currentUser = null;
        
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
        
        // Обновляем калькулятор
        if (window.prayerCalculator) {
            window.prayerCalculator.setAuthToken(null);
        }
        
        this.updateAuthUI();
        this.showNotification('Вы вышли из системы', 'info');
    }
    
    updateAuthUI() {
        const navAuth = document.getElementById('nav-auth');
        const navUser = document.getElementById('nav-user');
        const userName = document.getElementById('user-name');
        
        if (this.currentUser && this.authToken) {
            // Показываем информацию о пользователе
            if (navAuth) navAuth.style.display = 'none';
            if (navUser) {
                navUser.style.display = 'flex';
                if (userName) {
                    userName.textContent = this.currentUser.name;
                }
            }
        } else {
            // Показываем кнопки входа/регистрации
            if (navAuth) navAuth.style.display = 'flex';
            if (navUser) navUser.style.display = 'none';
        }
    }
    
    // Вспомогательные функции для управления UI
    showLoginForm() {
        this.hideRegisterForm();
        document.getElementById('login-modal').style.display = 'block';
    }
    
    hideLoginForm() {
        document.getElementById('login-modal').style.display = 'none';
        document.getElementById('login-form').reset();
    }
    
    showRegisterForm() {
        this.hideLoginForm();
        document.getElementById('register-modal').style.display = 'block';
    }
    
    hideRegisterForm() {
        document.getElementById('register-modal').style.display = 'none';
        document.getElementById('register-form').reset();
    }
    
    showProfileModal() {
        this.loadProfileData();
        document.getElementById('profile-modal').style.display = 'block';
    }
    
    hideProfileModal() {
        document.getElementById('profile-modal').style.display = 'none';
    }
    
    showChangePasswordForm() {
        document.getElementById('profile-modal').style.display = 'none';
        document.getElementById('change-password-modal').style.display = 'block';
    }
    
    hideChangePasswordForm() {
        document.getElementById('change-password-modal').style.display = 'none';
        document.getElementById('change-password-form').reset();
    }
    
    async loadProfileData() {
        const profileInfo = document.getElementById('profile-info');
        if (!profileInfo) return;
        
        profileInfo.innerHTML = `
            <div class="loading">
                <i class="fas fa-spinner fa-spin"></i> Загрузка данных...
            </div>
        `;
        
        if (!this.authToken) {
            profileInfo.innerHTML = '<p>Требуется авторизация</p>';
            return;
        }
        
        try {
            const response = await fetch(`${this.apiBaseUrl}/api/user/profile`, {
                headers: {
                    'Authorization': `Bearer ${this.authToken}`
                }
            });
            
            if (response.ok) {
                const userData = await response.json();
                this.currentUser = userData;
                
                profileInfo.innerHTML = `
                    <div class="profile-header">
                        <div class="profile-avatar">
                            <i class="fas fa-user-circle"></i>
                        </div>
                        <div class="profile-details">
                            <h3>${userData.name}</h3>
                            <p>${userData.email}</p>
                            <p class="profile-stats">Зарегистрирован: ${new Date(userData.createdAt).toLocaleDateString()}</p>
                            <p class="profile-stats">Последний вход: ${new Date(userData.lastLogin).toLocaleDateString()}</p>
                        </div>
                    </div>
                `;
            } else {
                profileInfo.innerHTML = '<p>Ошибка загрузки профиля</p>';
            }
        } catch (error) {
            console.error('Ошибка загрузки профиля:', error);
            profileInfo.innerHTML = '<p>Ошибка соединения</p>';
        }
    }
    
    showNotification(message, type = 'info') {
        const container = document.getElementById('notification-container');
        if (!container) return;
        
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <span>${message}</span>
            <button class="notification-close">&times;</button>
        `;
        
        container.appendChild(notification);
        
        // Автоматическое скрытие
        setTimeout(() => {
            notification.remove();
        }, 5000);
        
        // Закрытие по клику
        notification.querySelector('.notification-close').addEventListener('click', () => {
            notification.remove();
        });
    }
}

// Создаем глобальный экземпляр
window.authManager = new AuthManager();

// Экспортируем функции для глобального использования
window.showLoginForm = () => window.authManager.showLoginForm();
window.hideLoginForm = () => window.authManager.hideLoginForm();
window.showRegisterForm = () => window.authManager.showRegisterForm();
window.hideRegisterForm = () => window.authManager.hideRegisterForm();
window.showProfileModal = () => window.authManager.showProfileModal();
window.hideProfileModal = () => window.authManager.hideProfileModal();
window.showChangePasswordForm = () => window.authManager.showChangePasswordForm();
window.hideChangePasswordForm = () => window.authManager.hideChangePasswordForm();
window.logout = () => window.authManager.logout();
window.togglePassword = (inputId, icon) => {
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
};
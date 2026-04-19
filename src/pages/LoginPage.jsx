import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { signInWithGoogle } from '../firebase/config';

export function LoginPage() {
    const navigate = useNavigate();
    const { login } = useAuth();
    const [isLogin, setIsLogin] = useState(true);
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        phone: '',
        password: '',
        confirmPassword: ''
    });
    const [errors, setErrors] = useState({});
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        // Clear error when user starts typing
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: '' }));
        }
    };

    // Phone input handler with formatting
    const handlePhoneChange = (e) => {
        let value = e.target.value.replace(/\D/g, ''); // Faqat raqamlar
        // Maksimum 9 ta raqam (99 123 45 67)
        if (value.length > 9) {
            value = value.slice(0, 9);
        }
        // Format: 99 123 45 67
        let formatted = '';
        if (value.length > 0) {
            formatted = value.slice(0, 2);
        }
        if (value.length > 2) {
            formatted += ' ' + value.slice(2, 5);
        }
        if (value.length > 5) {
            formatted += ' ' + value.slice(5, 7);
        }
        if (value.length > 7) {
            formatted += ' ' + value.slice(7, 9);
        }
        setFormData(prev => ({ ...prev, phone: formatted }));
        if (errors.phone) {
            setErrors(prev => ({ ...prev, phone: '' }));
        }
    };

    const validateForm = () => {
        const newErrors = {};

        if (!formData.username.trim()) {
            newErrors.username = 'Foydalanuvchi nomi kiritilishi shart';
        }

        if (!isLogin && !formData.email.trim()) {
            newErrors.email = 'Email kiritilishi shart';
        } else if (!isLogin && !/\S+@\S+\.\S+/.test(formData.email)) {
            newErrors.email = 'Email formati noto\'g\'ri';
        }

        if (!isLogin && !formData.phone.trim()) {
            newErrors.phone = 'Telefon raqami kiritilishi shart';
        } else if (!isLogin && formData.phone.replace(/\s/g, '').length !== 9) {
            newErrors.phone = 'Telefon raqami 9 ta raqamdan iborat bo\'lishi kerak';
        }

        if (!formData.password) {
            newErrors.password = 'Parol kiritilishi shart';
        } else if (formData.password.length < 6) {
            newErrors.password = 'Parol kamida 6 ta belgidan iborat bo\'lishi kerak';
        }

        if (!isLogin && formData.password !== formData.confirmPassword) {
            newErrors.confirmPassword = 'Parollar mos kelmadi';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateForm()) return;

        setIsLoading(true);

        // Simulate API call
        setTimeout(() => {
            setIsLoading(false);
            // Use AuthContext login function
            login(formData.username);
            navigate('/');
        }, 1500);
    };

    const toggleForm = () => {
        setIsLogin(!isLogin);
        setErrors({});
        setFormData({
            username: '',
            email: '',
            phone: '',
            password: '',
            confirmPassword: ''
        });
    };

    return (
        <div className="login-page">
            {/* Animated Background */}
            <div className="login-bg-animation">
                <div className="floating-shape shape-1"></div>
                <div className="floating-shape shape-2"></div>
                <div className="floating-shape shape-3"></div>
                <div className="floating-shape shape-4"></div>
                <div className="floating-shape shape-5"></div>
                <div className="grid-overlay"></div>
            </div>

            {/* Back Button */}
            <Link to="/" className="login-back-btn">
                <span className="back-arrow">←</span>
                <span>Orqaga</span>
            </Link>

            <div className="login-container">
                {/* Logo Section */}
                <div className="login-logo">
                    <div className="logo-icon">
                        <svg viewBox="0 0 100 100" className="logo-svg">
                            <defs>
                                <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                    <stop offset="0%" stopColor="#6366f1" />
                                    <stop offset="100%" stopColor="#8b5cf6" />
                                </linearGradient>
                            </defs>
                            {/* 3D Cube representation */}
                            <polygon points="50,10 90,30 90,70 50,90 10,70 10,30"
                                fill="none" stroke="url(#logoGradient)" strokeWidth="3" />
                            <line x1="50" y1="10" x2="50" y2="50" stroke="url(#logoGradient)" strokeWidth="2" />
                            <line x1="10" y1="30" x2="50" y2="50" stroke="url(#logoGradient)" strokeWidth="2" />
                            <line x1="90" y1="30" x2="50" y2="50" stroke="url(#logoGradient)" strokeWidth="2" />
                            <polygon points="50,50 90,70 50,90 10,70"
                                fill="rgba(99, 102, 241, 0.2)" stroke="url(#logoGradient)" strokeWidth="2" />
                        </svg>
                    </div>
                    <h1 className="logo-title">
                        <span className="gradient-text">Math 3D</span>
                    </h1>
                    <p className="logo-subtitle">Geometrik shakllarni interaktiv o'rganish platformasi</p>
                </div>

                {/* Login Card */}
                <div className="login-card">
                    {/* Welcome Message for Registration */}
                    {!isLogin && (
                        <div className="welcome-banner">
                            <h1 className="welcome-title">🎉 Xush kelibsiz!</h1>
                            <p className="welcome-subtitle">Math 3D platformasiga qo'shilganingizdan xursandmiz</p>
                        </div>
                    )}
                    <div className="card-header">
                        <h2>{isLogin ? 'Tizimga Kirish' : 'Ro\'yxatdan O\'tish'}</h2>
                        <p>{isLogin ? 'Hisobingizga kiring' : 'Yangi hisob yarating'}</p>
                    </div>

                    <form onSubmit={handleSubmit} className="login-form">
                        {/* Username Field */}
                        <div className="form-group">
                            <label htmlFor="username">
                                <span className="label-icon">👤</span>
                                Foydalanuvchi nomi
                            </label>
                            <div className="input-wrapper">
                                <input
                                    type="text"
                                    id="username"
                                    name="username"
                                    value={formData.username}
                                    onChange={handleInputChange}
                                    placeholder="Foydalanuvchi nomini kiriting"
                                    className={errors.username ? 'error' : ''}
                                    autoComplete="username"
                                />
                                {formData.username && !errors.username && (
                                    <span className="input-check">✓</span>
                                )}
                            </div>
                            {errors.username && <span className="error-message">{errors.username}</span>}
                        </div>

                        {/* Email Field (only for registration) */}
                        {!isLogin && (
                            <div className="form-group">
                                <label htmlFor="email">
                                    <span className="label-icon">📧</span>
                                    Email
                                </label>
                                <div className="input-wrapper">
                                    <input
                                        type="email"
                                        id="email"
                                        name="email"
                                        value={formData.email}
                                        onChange={handleInputChange}
                                        placeholder="Email manzilingizni kiriting"
                                        className={errors.email ? 'error' : ''}
                                        autoComplete="email"
                                    />
                                    {formData.email && !errors.email && /\S+@\S+\.\S+/.test(formData.email) && (
                                        <span className="input-check">✓</span>
                                    )}
                                </div>
                                {errors.email && <span className="error-message">{errors.email}</span>}
                            </div>
                        )}

                        {/* Phone Field (only for registration) */}
                        {!isLogin && (
                            <div className="form-group">
                                <label htmlFor="phone">
                                    <span className="label-icon">📱</span>
                                    Telefon raqami
                                </label>
                                <div className="phone-input-wrapper">
                                    <span className="phone-prefix">+998</span>
                                    <span className="phone-divider">|</span>
                                    <input
                                        type="tel"
                                        id="phone"
                                        name="phone"
                                        value={formData.phone}
                                        onChange={handlePhoneChange}
                                        placeholder="99 123 45 67"
                                        className={errors.phone ? 'error' : ''}
                                        autoComplete="tel"
                                        maxLength={12}
                                    />
                                    {formData.phone && !errors.phone && formData.phone.replace(/\s/g, '').length === 9 && (
                                        <span className="input-check">✓</span>
                                    )}
                                </div>
                                {errors.phone && <span className="error-message">{errors.phone}</span>}
                            </div>
                        )}

                        {/* Password Field */}
                        <div className="form-group">
                            <label htmlFor="password">
                                <span className="label-icon">🔒</span>
                                Parol
                            </label>
                            <div className="input-wrapper">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    id="password"
                                    name="password"
                                    value={formData.password}
                                    onChange={handleInputChange}
                                    placeholder="Parolni kiriting"
                                    className={errors.password ? 'error' : ''}
                                    autoComplete={isLogin ? 'current-password' : 'new-password'}
                                />
                                <button
                                    type="button"
                                    className="toggle-password"
                                    onClick={() => setShowPassword(!showPassword)}
                                    tabIndex={-1}
                                >
                                    {showPassword ? '🙈' : '👁️'}
                                </button>
                            </div>
                            {errors.password && <span className="error-message">{errors.password}</span>}
                        </div>

                        {/* Confirm Password Field (only for registration) */}
                        {!isLogin && (
                            <div className="form-group">
                                <label htmlFor="confirmPassword">
                                    <span className="label-icon">🔐</span>
                                    Parolni tasdiqlash
                                </label>
                                <div className="input-wrapper">
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        id="confirmPassword"
                                        name="confirmPassword"
                                        value={formData.confirmPassword}
                                        onChange={handleInputChange}
                                        placeholder="Parolni qayta kiriting"
                                        className={errors.confirmPassword ? 'error' : ''}
                                        autoComplete="new-password"
                                    />
                                    {formData.confirmPassword && formData.password === formData.confirmPassword && (
                                        <span className="input-check">✓</span>
                                    )}
                                </div>
                                {errors.confirmPassword && <span className="error-message">{errors.confirmPassword}</span>}
                            </div>
                        )}

                        {/* Remember Me & Forgot Password */}
                        {isLogin && (
                            <div className="form-options">
                                <label className="remember-me">
                                    <input type="checkbox" />
                                    <span className="checkmark"></span>
                                    Eslab qolish
                                </label>
                                <a href="#" className="forgot-password">Parolni unutdingizmi?</a>
                            </div>
                        )}

                        {/* Submit Button */}
                        <button type="submit" className="submit-btn" disabled={isLoading}>
                            {isLoading ? (
                                <span className="loading-spinner">
                                    <span className="spinner"></span>
                                    Yuklanmoqda...
                                </span>
                            ) : (
                                <>
                                    {isLogin ? 'Kirish' : 'Ro\'yxatdan o\'tish'}
                                    <span className="btn-arrow">→</span>
                                </>
                            )}
                        </button>
                    </form>

                    {/* Social Login */}
                    <div className="social-login">
                        <div className="divider">
                            <span>yoki</span>
                        </div>
                        <div className="social-buttons">
                            <button
                                type="button"
                                className="social-btn google"
                                onClick={async () => {
                                    setIsLoading(true);
                                    const result = await signInWithGoogle();
                                    setIsLoading(false);
                                    if (result.success) {
                                        login(result.user.displayName || result.user.email);
                                        navigate('/');
                                    } else {
                                        alert('Google bilan kirishda xatolik: ' + result.error);
                                    }
                                }}
                                disabled={isLoading}
                            >
                                <svg viewBox="0 0 24 24" className="social-icon">
                                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                </svg>
                                Google bilan kirish
                            </button>

                        </div>
                    </div>

                    {/* Toggle Form */}
                    <div className="form-toggle">
                        <span>{isLogin ? 'Hisobingiz yo\'qmi?' : 'Allaqachon hisobingiz bormi?'}</span>
                        <button type="button" onClick={toggleForm}>
                            {isLogin ? 'Ro\'yxatdan o\'ting' : 'Kirish'}
                        </button>
                    </div>
                </div>

                {/* Features Preview */}
                <div className="features-preview">
                    <div className="feature-item">
                        <span className="feature-icon">🧊</span>
                        <span>3D Modellar</span>
                    </div>
                    <div className="feature-item">
                        <span className="feature-icon">📐</span>
                        <span>2D Shakllar</span>
                    </div>
                    <div className="feature-item">
                        <span className="feature-icon">📊</span>
                        <span>Formulalar</span>
                    </div>
                    <div className="feature-item">
                        <span className="feature-icon">🎯</span>
                        <span>Testlar</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

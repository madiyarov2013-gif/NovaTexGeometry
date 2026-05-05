import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function UserMenu() {
    const { user, isLoggedIn, logout } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef(null);
    const navigate = useNavigate();

    const [isPricingOpen, setIsPricingOpen] = useState(false);

    // Close menu when clicking outside
    useEffect(() => {
        function handleClickOutside(event) {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleLogout = () => {
        logout();
        setIsOpen(false);
        navigate('/');
    };

    if (!isLoggedIn) {
        return (
            <Link to="/login" className="login-btn">
                <span className="btn-icon">👤</span>
                Kirish
            </Link>
        );
    }

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <button className="pro-badge upgrade-btn" onClick={() => setIsPricingOpen(true)} title="Tariflarni ko'rish" style={{ padding: '6px 12px', fontSize: '0.8rem', cursor: 'pointer' }}>
                PRO <span style={{ textTransform: 'none', marginLeft: '4px', letterSpacing: 'normal', fontWeight: '500' }}>olish</span>
            </button>

            <div className="user-menu" ref={menuRef}>
                <button
                    className="user-menu-trigger"
                    onClick={() => setIsOpen(!isOpen)}
                >
                    <div className="user-avatar">
                        {user.username.charAt(0).toUpperCase()}
                    </div>
                    <span className="user-name">{user.username}</span>
                    <span className={`dropdown-arrow ${isOpen ? 'open' : ''}`}>▼</span>
                </button>

                {isOpen && (
                    <div className="user-dropdown">
                        <div className="dropdown-header">
                            <div className="dropdown-avatar">
                                {user.username.charAt(0).toUpperCase()}
                            </div>
                            <div className="dropdown-info">
                                <span className="dropdown-name">{user.username}</span>
                                <span className="dropdown-role">Foydalanuvchi</span>
                            </div>
                        </div>
                        <div className="dropdown-divider"></div>
                        <Link to="/" className="dropdown-item" onClick={() => setIsOpen(false)}>
                            <span>🏠</span> Bosh sahifa
                        </Link>
                        <Link to="/2d-models" className="dropdown-item" onClick={() => setIsOpen(false)}>
                            <span>📐</span> 2D Modellar
                        </Link>
                        <Link to="/3d-models" className="dropdown-item" onClick={() => setIsOpen(false)}>
                            <span>🧊</span> 3D Modellar
                        </Link>
                        <div className="dropdown-divider"></div>
                        <button className="dropdown-item logout" onClick={handleLogout}>
                            <span>🚪</span> Chiqish
                        </button>
                    </div>
                )}
            </div>

            {/* Pricing Modal */}
            {isPricingOpen && (
                <div className="pricing-modal-overlay" onClick={() => setIsPricingOpen(false)}>
                    <div className="pricing-modal" onClick={e => e.stopPropagation()}>
                        <button className="pricing-close" onClick={() => setIsPricingOpen(false)}>✕</button>
                        <h2>Tariflar</h2>
                        <p className="pricing-subtitle">O'zingizga mos tarifni tanlang va platformadan to'liq foydalaning</p>
                        
                        <div className="pricing-cards">
                            <div className="pricing-card">
                                <h3>Bepul</h3>
                                <div className="price">0 <span>so'm / oy</span></div>
                                <ul className="pricing-features">
                                    <li>✓ Asosiy 2D shakllar</li>
                                    <li>✓ Oddiy 3D modellar</li>
                                    <li className="disabled">✕ Erkin Shakl Yaratish (Whiteboard)</li>
                                    <li className="disabled">✕ Cheksiz hisob-kitoblar</li>
                                </ul>
                                <button className="plan-btn" onClick={() => setIsPricingOpen(false)}>Joriy tarif</button>
                            </div>
                            
                            <div className="pricing-card pro-card">
                                <div className="pro-label">Tavsiya etiladi</div>
                                <h3>PRO</h3>
                                <div className="price">49,000 <span>so'm / oy</span></div>
                                <ul className="pricing-features">
                                    <li>✓ Barcha 2D va 3D modellar</li>
                                    <li>✓ Erkin Shakl Yaratish (Whiteboard)</li>
                                    <li>✓ Barcha murakkab hisob-kitoblar</li>
                                    <li>✓ Reklamasiz ishlash</li>
                                </ul>
                                <button className="plan-btn pro" onClick={() => {
                                    alert('To\'lov tizimi tez orada ishga tushadi!');
                                    setIsPricingOpen(false);
                                }}>Sotib olish</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function UserMenu() {
    const { user, isLoggedIn, logout } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef(null);
    const navigate = useNavigate();

    const [isPricingOpen, setIsPricingOpen] = useState(false);
    const [paymentPlan, setPaymentPlan] = useState(null); // { name, price }
    const [cardNumber, setCardNumber] = useState('');
    const [cardExpiry, setCardExpiry] = useState('');
    const [cardCvv, setCardCvv] = useState('');
    const [cardHolder, setCardHolder] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [paymentSuccess, setPaymentSuccess] = useState(false);

    const closePricing = () => {
        setIsPricingOpen(false);
        setPaymentPlan(null);
        setPaymentSuccess(false);
        setIsProcessing(false);
        setCardNumber('');
        setCardExpiry('');
        setCardCvv('');
        setCardHolder('');
    };

    const formatCardNumber = (v) => v.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim();
    const formatExpiry = (v) => {
        const d = v.replace(/\D/g, '').slice(0, 4);
        if (d.length < 3) return d;
        return `${d.slice(0, 2)}/${d.slice(2)}`;
    };

    const cardBrand = (() => {
        const n = cardNumber.replace(/\s/g, '');
        if (/^4/.test(n)) return 'VISA';
        if (/^5[1-5]/.test(n)) return 'MASTERCARD';
        if (/^8600/.test(n) || /^9860/.test(n)) return 'UZCARD';
        if (/^9826/.test(n) || /^5614/.test(n)) return 'HUMO';
        return 'CARD';
    })();

    const cardValid =
        cardNumber.replace(/\s/g, '').length === 16 &&
        /^\d{2}\/\d{2}$/.test(cardExpiry) &&
        cardCvv.length === 3 &&
        cardHolder.trim().length > 2;

    const handlePay = (e) => {
        e.preventDefault();
        if (!cardValid || isProcessing) return;
        setIsProcessing(true);
        setTimeout(() => {
            setIsProcessing(false);
            setPaymentSuccess(true);
        }, 1500);
    };

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
            <button
                className="get-pro-btn"
                onClick={() => setIsPricingOpen(true)}
                title="Pro tarifga o'tish"
            >
                <span className="get-pro-icon">👑</span>
                <span className="get-pro-text">Pro olish</span>
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

            {isPricingOpen && (
                <div className="pricing-modal-overlay" onClick={closePricing}>
                    <div className="pricing-modal" onClick={(e) => e.stopPropagation()}>
                        <button className="pricing-modal-close" onClick={closePricing} aria-label="Yopish">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M18 6L6 18M6 6l12 12" />
                            </svg>
                        </button>

                        {!paymentPlan && (
                            <>
                                <div className="pricing-modal-header">
                                    <div className="pricing-modal-icon">👑</div>
                                    <h2>Pro tarifni tanlang</h2>
                                    <p>Barcha 3D modellar va kengaytirilgan imkoniyatlar</p>
                                </div>
                                <div className="pricing-plans">
                                    <div className="pricing-plan">
                                        <div className="plan-name">Free</div>
                                        <div className="plan-price"><span className="price-value">0</span><span className="price-unit">so'm</span></div>
                                        <ul className="plan-features">
                                            <li>Asosiy 2D modellar</li>
                                            <li>Cheklangan formulalar</li>
                                            <li>Reklama bilan</li>
                                        </ul>
                                        <button className="plan-btn current" disabled>Joriy reja</button>
                                    </div>
                                    <div className="pricing-plan featured">
                                        <div className="plan-badge">Tavsiya</div>
                                        <div className="plan-name">Pro</div>
                                        <div className="plan-price"><span className="price-value">29 000</span><span className="price-unit">so'm/oy</span></div>
                                        <ul className="plan-features">
                                            <li>Barcha 3D modellar</li>
                                            <li>To'liq formulalar va hisob-kitoblar</li>
                                            <li>Whiteboard rejimi</li>
                                            <li>Reklamasiz</li>
                                        </ul>
                                        <button className="plan-btn primary" onClick={() => setPaymentPlan({ name: 'Pro', price: '29 000' })}>Pro olish</button>
                                    </div>
                                    <div className="pricing-plan">
                                        <div className="plan-name">Premium</div>
                                        <div className="plan-price"><span className="price-value">79 000</span><span className="price-unit">so'm/oy</span></div>
                                        <ul className="plan-features">
                                            <li>Barcha Pro imkoniyatlar</li>
                                            <li>AI yordamchi</li>
                                            <li>Maxsus testlar</li>
                                            <li>Birinchi navbatda yordam</li>
                                        </ul>
                                        <button className="plan-btn" onClick={() => setPaymentPlan({ name: 'Premium', price: '79 000' })}>Premium olish</button>
                                    </div>
                                </div>
                            </>
                        )}

                        {paymentPlan && !paymentSuccess && (
                            <div className="payment-view">
                                <button className="payment-back" onClick={() => setPaymentPlan(null)}>
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                                        <polyline points="15 18 9 12 15 6" />
                                    </svg>
                                    Orqaga
                                </button>

                                <div className="payment-header">
                                    <h2>To'lov ma'lumotlari</h2>
                                    <p><strong>{paymentPlan.name}</strong> tarifi · {paymentPlan.price} so'm/oy</p>
                                </div>

                                <div className={`payment-card-preview brand-${cardBrand.toLowerCase()}`}>
                                    <div className="card-top">
                                        <span className="card-chip">▦</span>
                                        <span className="card-brand">{cardBrand}</span>
                                    </div>
                                    <div className="card-number">{cardNumber || '#### #### #### ####'}</div>
                                    <div className="card-bottom">
                                        <div className="card-holder">
                                            <span className="card-label">EGAsi</span>
                                            <span className="card-value">{cardHolder.toUpperCase() || 'ISM FAMILIYA'}</span>
                                        </div>
                                        <div className="card-expiry">
                                            <span className="card-label">AMAL QILISH</span>
                                            <span className="card-value">{cardExpiry || 'MM/YY'}</span>
                                        </div>
                                    </div>
                                </div>

                                <form className="payment-form" onSubmit={handlePay}>
                                    <label className="payment-field">
                                        <span>Karta raqami</span>
                                        <input
                                            type="text"
                                            inputMode="numeric"
                                            placeholder="0000 0000 0000 0000"
                                            value={cardNumber}
                                            onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                                            maxLength={19}
                                            autoComplete="cc-number"
                                        />
                                    </label>

                                    <label className="payment-field">
                                        <span>Karta egasi</span>
                                        <input
                                            type="text"
                                            placeholder="Ism Familiya"
                                            value={cardHolder}
                                            onChange={(e) => setCardHolder(e.target.value.replace(/[^a-zA-Zа-яА-ЯёЁʼ' ]/g, ''))}
                                            autoComplete="cc-name"
                                        />
                                    </label>

                                    <div className="payment-row">
                                        <label className="payment-field">
                                            <span>Amal qilish</span>
                                            <input
                                                type="text"
                                                inputMode="numeric"
                                                placeholder="MM/YY"
                                                value={cardExpiry}
                                                onChange={(e) => setCardExpiry(formatExpiry(e.target.value))}
                                                maxLength={5}
                                                autoComplete="cc-exp"
                                            />
                                        </label>
                                        <label className="payment-field">
                                            <span>CVV</span>
                                            <input
                                                type="password"
                                                inputMode="numeric"
                                                placeholder="•••"
                                                value={cardCvv}
                                                onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, '').slice(0, 3))}
                                                maxLength={3}
                                                autoComplete="cc-csc"
                                            />
                                        </label>
                                    </div>

                                    <button
                                        type="submit"
                                        className={`payment-submit ${cardValid ? '' : 'disabled'}`}
                                        disabled={!cardValid || isProcessing}
                                    >
                                        {isProcessing ? (
                                            <><span className="payment-spinner" /> To'lanmoqda...</>
                                        ) : (
                                            <>🔒 {paymentPlan.price} so'm to'lash</>
                                        )}
                                    </button>

                                    <p className="payment-secure">
                                        🔐 Ma'lumotlaringiz xavfsiz shifrlangan kanal orqali uzatiladi
                                    </p>
                                </form>
                            </div>
                        )}

                        {paymentSuccess && (
                            <div className="payment-success">
                                <div className="success-icon">✓</div>
                                <h2>To'lov muvaffaqiyatli!</h2>
                                <p><strong>{paymentPlan.name}</strong> tarifi faollashtirildi. Barcha imkoniyatlar endi sizga ochiq.</p>
                                <button className="plan-btn primary" onClick={closePricing}>Davom etish</button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

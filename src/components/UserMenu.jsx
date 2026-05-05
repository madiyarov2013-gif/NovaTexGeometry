import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function UserMenu() {
    const { user, isLoggedIn, logout } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef(null);
    const navigate = useNavigate();

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
    );
}

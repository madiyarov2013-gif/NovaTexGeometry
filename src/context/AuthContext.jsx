import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Check localStorage for existing login
        const isLoggedIn = localStorage.getItem('isLoggedIn');
        const username = localStorage.getItem('username');

        if (isLoggedIn === 'true' && username) {
            setUser({ username });
        }
        setIsLoading(false);
    }, []);

    const login = (username) => {
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('username', username);
        setUser({ username });
    };

    const logout = () => {
        localStorage.removeItem('isLoggedIn');
        localStorage.removeItem('username');
        setUser(null);
    };

    const value = {
        user,
        isLoggedIn: !!user,
        isLoading,
        login,
        logout
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}

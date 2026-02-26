import React, { useState } from 'react';
import './LoginForm.css';

const LoginForm = ({ onLogin }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!username || !password) {
            alert('Будь ласка, заповніть всі поля');
            return;
        }

        setLoading(true);

        // Encode credentials in Base64 for Basic Auth
        const credentials = btoa(`${username}:${password}`);
        localStorage.setItem('credentials', credentials);
        localStorage.setItem('username', username);

        // Simulate login (можна додати реальну перевірку)
        setTimeout(() => {
            onLogin(username);
            setLoading(false);
        }, 300);
    };

    return (
        <div className="login-overlay">
            <div className="login-box">
                <div className="login-header">
                    <span className="login-logo">🍯</span>
                    <h2>VinBees ERP</h2>
                    <p>Введіть дані для входу</p>
                </div>
                <form onSubmit={handleSubmit} className="login-form">
                    <div className="form-field">
                        <label>Логін</label>
                        <input
                            type="text"
                            placeholder="Ваш логін"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            disabled={loading}
                            autoFocus
                        />
                    </div>
                    <div className="form-field">
                        <label>Пароль</label>
                        <input
                            type="password"
                            placeholder="Ваш пароль"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            disabled={loading}
                        />
                    </div>
                    <button type="submit" className="login-btn" disabled={loading}>
                        {loading ? 'Вхід...' : 'Увійти'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default LoginForm;

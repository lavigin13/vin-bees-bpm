import React, { useState } from 'react';
import { LogIn, User, Lock, ArrowRight } from 'lucide-react';
import { loginUser } from '../services/api';

const AuthPage = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      if (username && password) {
        await loginUser(username, password);
        onLoginSuccess();
        setIsLoading(false);
      } else {
        setError("Будь ласка, введіть логін та пароль");
        setIsLoading(false);
      }
    } catch (err) {
      console.error("Login Error:", err);
      // Improved error message for 'Failed to fetch' (CORS or network issues)
      if (err.message === 'Failed to fetch') {
         setError("Помилка з'єднання з сервером 1С. Перевірте CORS та доступність мережі.");
      } else {
         setError(err.message || 'Помилка авторизації');
      }
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 min-h-screen w-full flex items-center justify-center p-4 bg-[var(--bg-color)] overflow-hidden">
       {/* Decorative Background Elements */}
       <div className="absolute inset-0 w-full h-full z-0 pointer-events-none overflow-hidden flex items-center justify-center">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[var(--accent-blue)] rounded-full mix-blend-screen filter blur-[150px] opacity-20 animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-[var(--accent-gold)] rounded-full mix-blend-screen filter blur-[150px] opacity-10"></div>
      </div>

      <div className="w-full max-w-sm sm:max-w-md relative z-10 mx-auto px-4 sm:px-0">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-tr from-[var(--accent-gold)] to-[var(--accent-blue)] rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-[var(--accent-gold)]/20 rotate-3 transition-transform hover:rotate-0 duration-300">
            <span className="text-4xl">🐝</span>
          </div>
          <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-2">VinBees BPM</h1>
          <p className="text-[var(--text-secondary)]">Увійдіть до системи управління</p>
        </div>

        <div className="rounded-2xl p-6 sm:p-8 shadow-2xl border border-[var(--card-border)] bg-[var(--card-bg)]">
          <form onSubmit={handleLogin} className="space-y-6">
            
            {error && (
              <div className="bg-red-500/10 border border-red-500/50 text-red-500 px-4 py-3 rounded-xl text-sm flex items-center animate-pulse">
                 <Lock className="w-4 h-4 mr-2 flex-shrink-0" />
                 {error}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium text-[var(--text-secondary)]">Логін</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-[var(--text-secondary)]" />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 border border-[var(--card-border)] rounded-xl bg-[var(--bg-color)] text-[var(--text-primary)] placeholder-[var(--text-secondary)] xl:text-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)] focus:border-transparent transition-all"
                  placeholder="Введіть свій логін"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-[var(--text-secondary)]">Пароль</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-[var(--text-secondary)]" />
               </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 border border-[var(--card-border)] rounded-xl bg-[var(--bg-color)] text-[var(--text-primary)] placeholder-[var(--text-secondary)] xl:text-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)] focus:border-transparent transition-all"
                  placeholder="Введіть пароль"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className={`group w-full flex items-center justify-center py-3 sm:py-4 px-4 border border-transparent rounded-xl shadow-lg text-sm sm:text-base font-medium text-[var(--bg-color)] bg-gradient-to-r from-[var(--accent-gold)] to-[#e6c200] hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[var(--card-bg)] focus:ring-[var(--accent-gold)] transition-all ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              {isLoading ? (
                <div className="w-6 h-6 border-2 border-[var(--bg-color)]/30 border-t-[var(--bg-color)] rounded-full animate-spin"></div>
              ) : (
                <>
                  <LogIn className="w-5 h-5 mr-2" />
                  Увійти
                  <ArrowRight className="w-4 h-4 ml-2 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                </>
              )}
            </button>
          </form>
        </div>
        
        <div className="mt-8 text-center">
            <p className="text-xs text-[var(--text-secondary)]">
                © {new Date().getFullYear()} VinBees BPM. Всі права захищені.
            </p>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;

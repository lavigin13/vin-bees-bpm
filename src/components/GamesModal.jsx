import React, { useState, lazy, Suspense } from 'react';
import { X, Gamepad2, ArrowLeft } from 'lucide-react';
import './GamesModal.css';

// The game (canvas loop, audio engine, sprites) is heavy — load it only when opened.
const BeeInvadersGame = lazy(() => import('./BeeInvadersGame'));

const GamesModal = ({ isOpen, onClose }) => {
    const [selectedGame, setSelectedGame] = useState(null);

    const handleClose = () => {
        setSelectedGame(null);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="games-modal-overlay" onClick={handleClose}>
            <div className="games-modal-content" onClick={e => e.stopPropagation()}>
                <div className="games-header">
                    <h2><Gamepad2 size={20} color="var(--accent-gold)" /> Ігри</h2>
                    <button className="close-btn" onClick={handleClose}>
                        <X size={24} />
                    </button>
                </div>
                
                <div className="games-body">
                    {selectedGame === 'beeInvaders' ? (
                        <>
                            <button className="back-to-games-btn" onClick={() => setSelectedGame(null)}>
                                <ArrowLeft size={16} /> Назад до списку
                            </button>
                            <Suspense fallback={<div className="games-list">Завантаження гри…</div>}>
                                <BeeInvadersGame />
                            </Suspense>
                        </>
                    ) : (
                        <div className="games-list">
                            <div className="game-card" onClick={() => setSelectedGame('beeInvaders')}>
                                <div className="game-card-icon">🐝</div>
                                <div className="game-card-info">
                                    <h3>Bee Invaders</h3>
                                    <p>Захистіть вулик від атаки ворожих БПЛА.</p>
                                </div>
                            </div>
                            
                            {/* You can add more games here in the future */}
                            {/* <div className="game-card">
                                ...
                            </div> */}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default GamesModal;

import React, { useState, lazy, Suspense } from 'react';
import { X, Gamepad2, ArrowLeft } from 'lucide-react';
import './GamesModal.css';

// Games are heavy (canvas loop, audio, sprites) — load each only when opened.
const BeeInvadersGame = lazy(() => import('./BeeInvadersGame'));
const DroneFlightGame = lazy(() => import('./DroneFlightGame'));

// Registry — add a new game here and it appears in the list automatically.
const GAMES = [
    {
        id: 'beeInvaders',
        title: 'Bee Invaders',
        description: 'Захистіть вулик від атаки ворожих БПЛА.',
        icon: '🐝',
        Component: BeeInvadersGame
    },
    {
        id: 'droneFlight',
        title: 'Політ БПЛА',
        description: 'Запустіть розвідника з катапульти й долетіть якнайдалі.',
        icon: '🚀',
        Component: DroneFlightGame
    }
];

const GamesModal = ({ isOpen, onClose }) => {
    const [selectedGameId, setSelectedGameId] = useState(null);

    const handleClose = () => {
        setSelectedGameId(null);
        onClose();
    };

    if (!isOpen) return null;

    const selectedGame = GAMES.find(g => g.id === selectedGameId);

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
                    {selectedGame ? (
                        <>
                            <button className="back-to-games-btn" onClick={() => setSelectedGameId(null)}>
                                <ArrowLeft size={16} /> Назад до списку
                            </button>
                            <Suspense fallback={<div className="games-list">Завантаження гри…</div>}>
                                <selectedGame.Component />
                            </Suspense>
                        </>
                    ) : (
                        <div className="games-list">
                            {GAMES.map(game => (
                                <div
                                    key={game.id}
                                    className="game-card"
                                    onClick={() => setSelectedGameId(game.id)}
                                >
                                    <div className="game-card-icon">{game.icon}</div>
                                    <div className="game-card-info">
                                        <h3>{game.title}</h3>
                                        <p>{game.description}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default GamesModal;

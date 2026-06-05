import React, { useState, useEffect } from 'react';
import { X, Gamepad2, ArrowLeft } from 'lucide-react';
import BeeInvadersGame from './BeeInvadersGame';
import './GamesModal.css';

const GamesModal = ({ isOpen, onClose }) => {
    const [selectedGame, setSelectedGame] = useState(null);

    // Reset view when modal closes or opens
    useEffect(() => {
        if (!isOpen) {
            setSelectedGame(null);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="games-modal-overlay" onClick={onClose}>
            <div className="games-modal-content" onClick={e => e.stopPropagation()}>
                <div className="games-header">
                    <h2><Gamepad2 size={20} color="var(--accent-gold)" /> Ігри</h2>
                    <button className="close-btn" onClick={onClose}>
                        <X size={24} />
                    </button>
                </div>
                
                <div className="games-body">
                    {selectedGame === 'beeInvaders' ? (
                        <>
                            <button className="back-to-games-btn" onClick={() => setSelectedGame(null)}>
                                <ArrowLeft size={16} /> Назад до списку
                            </button>
                            <BeeInvadersGame />
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

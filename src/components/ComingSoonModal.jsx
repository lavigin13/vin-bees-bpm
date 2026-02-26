import React from 'react';
import { X, Hammer } from 'lucide-react';
import './ComingSoonModal.css';

const ComingSoonModal = ({ isOpen, onClose, featureName = "This feature" }) => {
    if (!isOpen) return null;

    return (
        <div className="coming-soon-overlay" onClick={onClose}>
            <div className="coming-soon-content" onClick={e => e.stopPropagation()}>
                <button className="close-btn-abs" onClick={onClose}>
                    <X size={24} color="#9ca3af" />
                </button>
                
                <div className="icon-circle">
                    <Hammer size={48} color="var(--accent-gold)" />
                </div>
                
                <h2>Coming Soon!</h2>
                <p>
                    <strong>{featureName}</strong> is currently under development. 
                    <br/>
                    Our bees are working hard to bring it to you soon! 🐝
                </p>
                
                <button className="ok-btn" onClick={onClose}>
                    Got it!
                </button>
            </div>
        </div>
    );
};

export default ComingSoonModal;



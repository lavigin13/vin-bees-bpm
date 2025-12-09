import React, { useState } from 'react';
import { X, Send, User } from 'lucide-react';
import './CraftingModal.css'; // Reusing styles

const TransferModal = ({ isOpen, onClose, item, onSend, colleagues = [] }) => {
    const [selectedColleague, setSelectedColleague] = useState('');
    const [quantity, setQuantity] = useState(1);

    if (!isOpen || !item) return null;

    const handleSend = () => {
        if (!selectedColleague) return;
        
        const colleague = colleagues.find(c => c.id === parseInt(selectedColleague));
        onSend(item, parseInt(quantity), colleague);
        onClose();
        setSelectedColleague('');
        setQuantity(1);
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <button className="close-btn" onClick={onClose}><X size={24} /></button>
                
                <h2 className="modal-title">
                    <Send size={20} /> Transfer Asset
                </h2>

                <div className="recipe-details" style={{ marginTop: 20 }}>
                    <div className="output-preview">
                        <div className={`preview-icon rarity-${item.rarity.toLowerCase()}`}>
                            <div className="preview-rarity">{item.rarity}</div>
                            <div className="preview-name">{item.name}</div>
                        </div>
                    </div>

                    <div className="craft-settings">
                        <label className="label"><User size={14}/> Select Recipient</label>
                        <select 
                            className="rpg-select"
                            value={selectedColleague}
                            onChange={(e) => setSelectedColleague(e.target.value)}
                        >
                            <option value="">-- Select Colleague --</option>
                            {colleagues.map(c => (
                                <option key={c.id} value={c.id}>{c.avatar} {c.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="craft-settings">
                        <label className="label">Quantity</label>
                        <input
                            type="number"
                            min="1"
                            max={item.quantity}
                            className="rpg-input"
                            value={quantity}
                            onChange={(e) => setQuantity(Math.max(1, Math.min(item.quantity, parseInt(e.target.value) || 1)))}
                        />
                        <div style={{fontSize: 12, opacity: 0.6, marginTop: 4, textAlign: 'right'}}>
                            Available: {item.quantity}
                        </div>
                    </div>

                    <button 
                        className="craft-submit-btn"
                        disabled={!selectedColleague}
                        onClick={handleSend}
                    >
                        Send Request
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TransferModal;



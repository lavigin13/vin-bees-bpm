import React, { useState } from 'react';
import { X, Send, User, Coins } from 'lucide-react';
import { COLLEAGUES } from '../data/mockData';
import './CraftingModal.css'; // Reusing styles

const SendHoneyModal = ({ isOpen, onClose, userBalance, onSend }) => {
    const [selectedColleague, setSelectedColleague] = useState('');
    const [amount, setAmount] = useState('');

    if (!isOpen) return null;

    const handleSend = () => {
        const val = parseInt(amount);
        if (!selectedColleague || !val || val <= 0 || val > userBalance) return;
        
        const colleague = COLLEAGUES.find(c => c.id === parseInt(selectedColleague));
        onSend(colleague, val);
        
        // Reset
        onClose();
        setSelectedColleague('');
        setAmount('');
    };

    const handleMax = () => {
        setAmount(userBalance.toString());
    };

    return (
        <div className="modal-overlay" style={{ zIndex: 1200 }}>
            <div className="modal-content">
                <button className="close-btn" onClick={onClose}><X size={24} /></button>
                
                <h2 className="modal-title">
                    <Coins size={20} color="var(--accent-gold)" /> Send Honey
                </h2>

                <div className="craft-settings" style={{ marginTop: 24 }}>
                    <label className="label">Recipient</label>
                    <select 
                        className="rpg-select"
                        value={selectedColleague}
                        onChange={(e) => setSelectedColleague(e.target.value)}
                    >
                        <option value="">-- Choose Colleague --</option>
                        {COLLEAGUES.map(c => (
                            <option key={c.id} value={c.id}>{c.avatar} {c.name}</option>
                        ))}
                    </select>
                </div>

                <div className="craft-settings">
                    <label className="label">Amount</label>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <input
                            type="number"
                            min="1"
                            max={userBalance}
                            className="rpg-input"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder="0"
                            style={{ flex: 1 }}
                        />
                        <button 
                            className="tab-btn" 
                            onClick={handleMax}
                            style={{ background: 'rgba(255, 215, 0, 0.1)', color: 'var(--accent-gold)', border: '1px solid var(--accent-gold)' }}
                        >
                            MAX
                        </button>
                    </div>
                    <div style={{ fontSize: 10, opacity: 0.6, marginTop: 4, textAlign: 'right' }}>
                        Balance: {userBalance.toLocaleString()}
                    </div>
                </div>

                <button 
                    className="craft-submit-btn"
                    disabled={!selectedColleague || !amount || parseInt(amount) > userBalance || parseInt(amount) <= 0}
                    onClick={handleSend}
                >
                    Send {amount ? `${amount} Honey` : ''}
                </button>
            </div>
        </div>
    );
};

export default SendHoneyModal;


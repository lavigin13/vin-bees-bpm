import React, { useState, useEffect, useRef } from 'react';
import { X, Send, User, Coins, Search } from 'lucide-react';
import './CraftingModal.css'; // Reusing styles

const SendHoneyModal = ({ isOpen, onClose, userBalance, onSend, colleagues = [] }) => {
    const [selectedColleagueId, setSelectedColleagueId] = useState('');
    const [amount, setAmount] = useState('');

    // Search state
    const [searchTerm, setSearchTerm] = useState('');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);

    // Reset state on close so the form is fresh next time
    const handleClose = () => {
        setSearchTerm('');
        setIsDropdownOpen(false);
        setSelectedColleagueId('');
        setAmount('');
        onClose();
    };

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    if (!isOpen) return null;

    // Filter colleagues
    const filteredColleagues = colleagues.filter(c => 
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.role.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleSelectColleague = (colleague) => {
        setSelectedColleagueId(colleague.id);
        setSearchTerm(colleague.name);
        setIsDropdownOpen(false);
    };

    const handleSend = () => {
        const val = parseInt(amount);
        if (!selectedColleagueId || !val || val <= 0 || val > userBalance) return;
        
        const colleague = colleagues.find(c => String(c.id) === String(selectedColleagueId));
        if (!colleague) return;

        onSend(colleague, val);
        handleClose();
    };

    const handleMax = () => {
        setAmount(userBalance.toString());
    };

    return (
        <div className="modal-overlay" style={{ zIndex: 1200 }}>
            <div className="modal-content">
                <button className="close-btn" onClick={handleClose}><X size={24} /></button>
                
                <h2 className="modal-title">
                    <Coins size={20} color="var(--accent-gold)" /> Надіслати Мед
                </h2>

                <div className="craft-settings" style={{ marginTop: 24, position: 'relative' }} ref={dropdownRef}>
                    <label className="label">Отримувач</label>
                    
                    <div style={{ position: 'relative' }}>
                        <Search size={16} style={{ position: 'absolute', top: 12, right: 12, opacity: 0.5, pointerEvents: 'none' }} />
                        <input
                            className="rpg-input"
                            placeholder="Пошук за ім'ям або посадою..."
                            value={searchTerm}
                            onChange={(e) => {
                                setSearchTerm(e.target.value);
                                setIsDropdownOpen(true);
                                if (selectedColleagueId) setSelectedColleagueId(''); // Clear selection on type
                            }}
                            onFocus={() => setIsDropdownOpen(true)}
                            style={{ paddingRight: 36 }}
                        />
                    </div>

                    {isDropdownOpen && filteredColleagues.length > 0 && (
                        <div className="search-dropdown-list">
                            {filteredColleagues.map(c => (
                                <div 
                                    key={c.id} 
                                    onClick={() => handleSelectColleague(c)} 
                                    className="search-option"
                                >
                                    <span style={{ fontSize: 18 }}>{c.avatar}</span>
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <span style={{ fontWeight: 600 }}>{c.name}</span>
                                        <span style={{ fontSize: 10, opacity: 0.7 }}>{c.role}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                    
                    {isDropdownOpen && filteredColleagues.length === 0 && (
                        <div className="search-dropdown-list">
                            <div className="search-option" style={{ justifyContent: 'center', opacity: 0.5, cursor: 'default' }}>
                                Колег не знайдено
                            </div>
                        </div>
                    )}
                </div>

                <div className="craft-settings">
                    <label className="label">Кількість</label>
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
                            МАКС
                        </button>
                    </div>
                    <div style={{ fontSize: 10, opacity: 0.6, marginTop: 4, textAlign: 'right' }}>
                        Баланс: {userBalance.toLocaleString()}
                    </div>
                </div>

                <button 
                    className="craft-submit-btn"
                    disabled={!selectedColleagueId || !amount || parseInt(amount) > userBalance || parseInt(amount) <= 0}
                    onClick={handleSend}
                >
                    Надіслати {amount ? `${amount} Меду` : ''}
                </button>
            </div>
        </div>
    );
};

export default SendHoneyModal;

import React, { useState, useEffect, useRef } from 'react';
import { X, Send, User, Search } from 'lucide-react';
import './CraftingModal.css'; // Reusing styles

const TransferModal = ({ isOpen, onClose, item, onSend, colleagues = [] }) => {
    const [selectedColleagueId, setSelectedColleagueId] = useState('');
    const [quantity, setQuantity] = useState(1);
    
    // Search state
    const [searchTerm, setSearchTerm] = useState('');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);

    // Reset state on close so the form is fresh next time
    const handleClose = () => {
        setSearchTerm('');
        setIsDropdownOpen(false);
        setSelectedColleagueId('');
        setQuantity(1);
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

    if (!isOpen || !item) return null;

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
        if (!selectedColleagueId) return;
        
        // Ensure we compare strings if IDs are UUIDs (36 chars)
        const colleague = colleagues.find(c => String(c.id) === String(selectedColleagueId));
        
        if (!colleague) {
            console.error("Selected colleague not found in list", { selectedColleagueId, colleagues });
            alert("Помилка: отримувача не знайдено.");
            return;
        }

        onSend(item, parseInt(quantity), colleague);
        handleClose();
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <button className="close-btn" onClick={handleClose}><X size={24} /></button>
                
                <h2 className="modal-title">
                    <Send size={20} /> Передати актив
                </h2>

                <div className="recipe-details" style={{ marginTop: 20 }}>
                    <div className="output-preview">
                        <div className={`preview-icon rarity-${item.rarity.toLowerCase()}`}>
                            <div className="preview-rarity">{item.rarity}</div>
                            <div className="preview-name">{item.name}</div>
                        </div>
                    </div>

                    <div className="craft-settings" ref={dropdownRef} style={{ position: 'relative' }}>
                        <label className="label"><User size={14}/> Оберіть отримувача</label>
                        
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
                        <input
                            type="number"
                            min="1"
                            max={item.quantity}
                            className="rpg-input"
                            value={quantity}
                            onChange={(e) => setQuantity(Math.max(1, Math.min(item.quantity, parseInt(e.target.value) || 1)))}
                        />
                        <div style={{fontSize: 12, opacity: 0.6, marginTop: 4, textAlign: 'right'}}>
                            Доступно: {item.quantity}
                        </div>
                    </div>

                    <button 
                        className="craft-submit-btn"
                        disabled={!selectedColleagueId}
                        onClick={handleSend}
                    >
                        Надіслати запит
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TransferModal;

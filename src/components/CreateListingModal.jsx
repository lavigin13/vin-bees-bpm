import React, { useState } from 'react';
import { X, Plus, Coins } from 'lucide-react';
import './CraftingModal.css';

const CreateListingModal = ({ isOpen, onClose, onDetailSubmit }) => {
    const [name, setName] = useState('');
    const [price, setPrice] = useState('');
    const [description, setDescription] = useState('');

    if (!isOpen) return null;

    const handleSubmit = () => {
        if (!name || !price) return;
        
        onDetailSubmit({
            name,
            price: parseInt(price),
            description,
            rarity: "Common", // Default
            icon: "box", // Default
            type: "user_item"
        });
        
        // Reset
        setName('');
        setPrice('');
        setDescription('');
        onClose();
    };

    return (
        <div className="modal-overlay" style={{ zIndex: 1100 }}> {/* Higher z-index than Shop */}
            <div className="modal-content">
                <button className="close-btn" onClick={onClose}><X size={24} /></button>
                
                <h2 className="modal-title">
                    <Plus size={20} /> Sell Item
                </h2>

                <div className="craft-settings" style={{ marginTop: 20 }}>
                    <label className="label">Item Name</label>
                    <input 
                        className="rpg-input" 
                        value={name} 
                        onChange={(e) => setName(e.target.value)} 
                        placeholder="e.g. Old Laptop"
                    />
                </div>

                <div className="craft-settings">
                    <label className="label">Price (Honey)</label>
                    <div style={{ position: 'relative' }}>
                        <Coins size={16} style={{ position: 'absolute', top: 12, left: 12, color: 'var(--accent-gold)' }} />
                        <input 
                            className="rpg-input" 
                            type="number" 
                            value={price} 
                            onChange={(e) => setPrice(e.target.value)} 
                            placeholder="0"
                            style={{ paddingLeft: 36 }}
                        />
                    </div>
                </div>

                <div className="craft-settings">
                    <label className="label">Description</label>
                    <textarea 
                        className="rpg-input" 
                        value={description} 
                        onChange={(e) => setDescription(e.target.value)} 
                        placeholder="Describe item condition..."
                        rows={3}
                        style={{ resize: 'none' }}
                    />
                </div>

                <button 
                    className="craft-submit-btn"
                    disabled={!name || !price}
                    onClick={handleSubmit}
                >
                    Create Listing
                </button>
            </div>
        </div>
    );
};

export default CreateListingModal;


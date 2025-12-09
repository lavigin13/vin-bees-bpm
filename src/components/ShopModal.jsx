import React, { useState } from 'react';
import { X, ShoppingBag, Search, Plus, Tag, Coins, User } from 'lucide-react';
import './CraftingModal.css'; // Reuse styles
import './ShopModal.css';

const ShopModal = ({ isOpen, onClose, items, userHoney, onBuy, onSellClick }) => {
    const [activeTab, setActiveTab] = useState('company'); // 'company' | 'community'
    const [searchTerm, setSearchTerm] = useState('');

    if (!isOpen) return null;

    const filteredItems = items.filter(item => {
        const isCompany = item.seller === 'system';
        const matchesTab = activeTab === 'company' ? isCompany : !isCompany;
        const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesTab && matchesSearch;
    });

    return (
        <div className="modal-overlay">
            <div className="modal-content shop-modal-content">
                <button className="close-btn" onClick={onClose}><X size={24} /></button>
                
                <h2 className="modal-title">
                    <ShoppingBag size={20} /> Marketplace
                </h2>

                {/* Balance Header */}
                <div className="shop-balance-header">
                    <span>Your Balance:</span>
                    <div className="shop-balance-amount">
                        <Coins size={16} fill="var(--accent-gold)" color="var(--accent-gold)" />
                        {userHoney.toLocaleString()}
                    </div>
                </div>

                {/* Tabs */}
                <div className="inventory-tabs shop-tabs">
                    <button
                        className={`tab-btn ${activeTab === 'company' ? 'active' : ''}`}
                        onClick={() => setActiveTab('company')}
                    >
                        🏢 Company Store
                    </button>
                    <button
                        className={`tab-btn ${activeTab === 'community' ? 'active' : ''}`}
                        onClick={() => setActiveTab('community')}
                    >
                        👥 Community
                    </button>
                </div>

                {/* Search & Action */}
                <div className="shop-actions-bar">
                    <div className="search-wrapper">
                        <Search size={14} />
                        <input 
                            type="text" 
                            placeholder="Search items..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    {activeTab === 'community' && (
                        <button className="sell-btn" onClick={onSellClick}>
                            <Plus size={14} /> Sell Item
                        </button>
                    )}
                </div>

                {/* Items Grid */}
                <div className="shop-grid">
                    {filteredItems.length === 0 ? (
                        <div className="empty-shop">No items found in this section.</div>
                    ) : (
                        filteredItems.map(item => {
                            const canAfford = userHoney >= item.price;
                            return (
                                <div key={item.id} className={`shop-item rarity-${item.rarity.toLowerCase()}`}>
                                    <div className="shop-item-header">
                                        <span className="shop-rarity-tag">{item.rarity}</span>
                                        {item.seller !== 'system' && (
                                            <span className="seller-tag">
                                                <User size={10} /> {item.seller.split(' ')[0]}
                                            </span>
                                        )}
                                    </div>
                                    
                                    <div className="shop-icon-wrapper">
                                        {/* Placeholder icon logic - in real app use dynamic imports or images */}
                                        <Tag size={32} strokeWidth={1} />
                                    </div>

                                    <div className="shop-item-details">
                                        <div className="shop-item-name">{item.name}</div>
                                        <div className="shop-item-desc">{item.description}</div>
                                    </div>

                                    <button 
                                        className={`buy-btn ${!canAfford ? 'disabled' : ''}`}
                                        onClick={() => canAfford && onBuy(item)}
                                        disabled={!canAfford}
                                    >
                                        <div className="price-tag">
                                            <Coins size={12} fill={canAfford ? "#000" : "#fff"} />
                                            {item.price}
                                        </div>
                                        {canAfford ? 'Buy Now' : 'Not Enough'}
                                    </button>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
};

export default ShopModal;


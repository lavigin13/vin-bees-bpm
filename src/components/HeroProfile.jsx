import React from 'react';
import { Hexagon, Award, Bell, ShoppingBag, Send, Network } from 'lucide-react';
import './HeroProfile.css';

const HeroProfile = ({ user, onInboxClick, onShopClick, onSendHoneyClick, onOrgChartClick, incomingCount = 0 }) => {
    return (
        <div className="hero-container">
            <button className="inbox-btn" onClick={onInboxClick} style={{right: 64}}>
                <Bell size={20} color={incomingCount > 0 ? "#fff" : "rgba(255,255,255,0.5)"} />
                {incomingCount > 0 && <span className="inbox-badge">{incomingCount}</span>}
            </button>

            <button className="inbox-btn" onClick={onOrgChartClick} style={{right: 16}}>
                <Network size={20} color="rgba(255,255,255,0.8)" />
            </button>

            <div className="hero-header">
                <div className="avatar-wrapper">
                    <img src={user.avatar} alt={user.name} className="avatar-img" />
                    <div className="level-badge">
                        <span>LVL</span>
                        <strong>{user.level}</strong>
                    </div>
                </div>

                <div className="hero-info">
                    <h1 className="hero-name">{user.name}</h1>
                    <div className="hero-role">{user.role}</div>

                    <div className="xp-bar-container">
                        <div className="xp-info">
                            <span>XP</span>
                            <span>{user.xp} / {user.nextLevelXp}</span>
                        </div>
                        <div className="xp-track">
                            <div
                                className="xp-fill"
                                style={{ width: `${(user.xp / user.nextLevelXp) * 100}%` }}
                            />
                        </div>
                    </div>
                </div>
            </div>

            <div className="stats-row">
                <div className="stat-card honey-card">
                    <div className="stat-icon">
                        <Hexagon size={24} fill="var(--accent-gold)" color="var(--accent-gold)" />
                    </div>
                    <div className="stat-value">{user.honey.toLocaleString()}</div>
                    <div className="stat-label">Honey</div>
                    
                    <button className="honey-send-btn" onClick={onSendHoneyClick}>
                        <Send size={12} />
                    </button>
                </div>

                <div className="stat-card reputation-card">
                    <div className="stat-icon">
                        <Award size={24} color="var(--rarity-epic)" />
                    </div>
                    <div className="stat-value">{user.reputation}</div>
                    <div className="stat-label">Reputation</div>
                </div>

                <div className="stat-card shop-btn-card" onClick={onShopClick}>
                    <div className="stat-icon">
                        <ShoppingBag size={24} color="#10b981" />
                    </div>
                    <div className="stat-label" style={{ color: '#10b981', fontWeight: 'bold', marginTop: 4 }}>SHOP</div>
                </div>
            </div>
        </div>
    );
};

export default HeroProfile;

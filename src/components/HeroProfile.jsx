import React from 'react';
import { Hexagon, Award, Bell, ShoppingBag, Send, Network, Rocket, Calendar, PackageCheck } from 'lucide-react';
import ActionPanel from './ActionPanel';
import './HeroProfile.css';

const HeroProfile = ({ user, onInboxClick, onShopClick, onSendHoneyClick, onOrgChartClick, onRewardReportClick, onRequestsClick, onTimesheetClick, onInventoryClick, incomingCount = 0 }) => {
    return (
        <div className="hero-container">
            {/* Top buttons removed as they are moved to ActionPanel */}
            
            <div className="hero-header">
                <div className="avatar-wrapper">
                    <img src={user.avatar} alt={user.name} className="avatar-img" />
                    <div className="level-badge">
                        <span>LVL</span>
                        <strong>{user.level}</strong>
                    </div>
                </div>

                <div className="hero-info">
                    <div className="hero-top-row">
                        <div className="hero-name-role">
                            <h1 className="hero-name">{user.name}</h1>
                            <div className="hero-role">{user.role}</div>
                        </div>
                        
                        <div className="xp-compact-container">
                            <div className="xp-info-compact">
                                {user.xp} / {user.nextLevelXp} XP
                            </div>
                            <div className="xp-track-compact">
                                <div
                                    className="xp-fill-compact"
                                    style={{ width: `${(user.xp / user.nextLevelXp) * 100}%` }}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <ActionPanel 
                onOrgChartClick={onOrgChartClick}
                onRewardReportClick={onRewardReportClick}
                onRequestsClick={onRequestsClick}
                onInventoryClick={onInventoryClick}
                onInboxClick={onInboxClick}
                onShopClick={onShopClick}
                onSendHoneyClick={onSendHoneyClick}
                onTimesheetClick={onTimesheetClick}
                incomingCount={incomingCount}
                userHoney={user.honey}
                timesheetStats="15 / 22"
            />
        </div>
    );
};

export default HeroProfile;

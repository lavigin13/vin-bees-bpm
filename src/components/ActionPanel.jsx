import React from 'react';
import { Network, Plane, FileText, PackageCheck, Bell, Briefcase, Hexagon, ShoppingBag, Calendar, HandCoins } from 'lucide-react';
import './ActionPanel.css';

const ActionPanel = ({ 
    onOrgChartClick, 
    onRewardReportClick, 
    onRequestsClick, 
    onInventoryClick,
    onInboxClick,
    onShopClick,
    onSendHoneyClick,
    onTimesheetClick,
    incomingCount = 0,
    userHoney = 0,
    timesheetStats = "0 / 0"
}) => {
    return (
        <div className="action-grid">
            {/* Row 1 */}
            <button className="action-btn" onClick={onSendHoneyClick}>
                <div className="action-icon">
                    <Hexagon size={12} color="var(--accent-gold)" fill="var(--accent-gold)" fillOpacity={0.3} />
                </div>
                <span className="action-label" style={{ color: 'var(--accent-gold)', fontWeight: 600 }}>
                    {userHoney.toLocaleString()}
                </span>
            </button>

            <button className="action-btn" onClick={onShopClick}>
                <div className="action-icon">
                    <ShoppingBag size={12} color="#10b981" />
                </div>
                <span className="action-label" style={{ color: '#10b981' }}>Shop</span>
            </button>

            <button className="action-btn" onClick={onInventoryClick}>
                <div className="action-icon">
                    <PackageCheck size={12} />
                </div>
                <span className="action-label">Inventory</span>
            </button>

            <button className="action-btn" onClick={onInboxClick}>
                <div className="action-icon">
                    <Bell size={12} />
                </div>
                <span className="action-label">Inbox</span>
                {incomingCount > 0 && <span className="action-badge">{incomingCount}</span>}
            </button>

            {/* Row 2 */}
            <button className="action-btn" onClick={onTimesheetClick}>
                <div className="action-icon">
                    <Calendar size={12} color="#60a5fa" />
                </div>
                <span className="action-label" style={{ color: '#60a5fa' }}>{timesheetStats}</span>
            </button>

            <button className="action-btn" onClick={onRewardReportClick}>
                <div className="action-icon">
                    <HandCoins size={12} />
                </div>
                <span className="action-label">Rewards</span>
            </button>

            <button className="action-btn" onClick={onRequestsClick}>
                <div className="action-icon">
                    <FileText size={12} />
                </div>
                <span className="action-label">Requests</span>
            </button>

            <button className="action-btn" onClick={onOrgChartClick}>
                <div className="action-icon">
                    <Network size={12} />
                </div>
                <span className="action-label">Org Chart</span>
            </button>
        </div>
    );
};

export default ActionPanel;

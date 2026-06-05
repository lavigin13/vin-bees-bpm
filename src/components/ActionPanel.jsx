import React from 'react';
import { Network, Plane, FileText, PackageCheck, Bell, Briefcase, Hexagon, ShoppingBag, Calendar, HandCoins, User, Forklift, ClipboardCheck, BarChart3, Gamepad2 } from 'lucide-react';
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
    onApprovalClick,
    onProfileClick,
    onWarehouseOpsClick,
    onStockReportClick,
    onGamesClick,
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

            <button className="action-btn" onClick={onProfileClick}>
                <div className="action-icon">
                    <User size={12} color="#8b5cf6" />
                </div>
                <span className="action-label" style={{ color: '#8b5cf6' }}>Профіль</span>
            </button>

            <button className="action-btn" onClick={onShopClick}>
                <div className="action-icon">
                    <ShoppingBag size={12} color="#10b981" />
                </div>
                <span className="action-label" style={{ color: '#10b981' }}>Магазин</span>
            </button>

            <button className="action-btn" onClick={onInventoryClick}>
                <div className="action-icon">
                    <PackageCheck size={12} />
                </div>
                <span className="action-label">Інвентар</span>
            </button>

            <button className="action-btn" onClick={onInboxClick}>
                <div className="action-icon">
                    <Bell size={12} />
                </div>
                <span className="action-label">Вхідні</span>
                {incomingCount > 0 && <span className="action-badge">{incomingCount}</span>}
            </button>

            {/* Row 2 */}
            <button className="action-btn" onClick={onTimesheetClick}>
                <div className="action-icon">
                    <Calendar size={12} color="#60a5fa" />
                </div>
                <span className="action-label" style={{ color: '#60a5fa' }}>{timesheetStats}</span>
            </button>

            <button className="action-btn" onClick={onApprovalClick}>
                <div className="action-icon">
                    <ClipboardCheck size={12} color="#22d3ee" />
                </div>
                <span className="action-label" style={{ color: '#22d3ee' }}>Погодження</span>
            </button>

            <button className="action-btn" onClick={onRewardReportClick}>
                <div className="action-icon">
                    <HandCoins size={12} />
                </div>
                <span className="action-label">Винагороди</span>
            </button>

            <button className="action-btn" onClick={onRequestsClick}>
                <div className="action-icon">
                    <FileText size={12} />
                </div>
                <span className="action-label">Запити</span>
            </button>

            <button className="action-btn" onClick={onOrgChartClick}>
                <div className="action-icon">
                    <Network size={12} />
                </div>
                <span className="action-label">Структура</span>
            </button>

            <button className="action-btn" onClick={onWarehouseOpsClick}>
                <div className="action-icon">
                    <Forklift size={12} color="#f97316" />
                </div>
                <span className="action-label" style={{ color: '#f97316' }}>Склад</span>
            </button>

            <button className="action-btn" onClick={onStockReportClick}>
                <div className="action-icon">
                    <BarChart3 size={12} color="#a78bfa" />
                </div>
                <span className="action-label" style={{ color: '#a78bfa' }}>Залишки</span>
            </button>

            <button className="action-btn" onClick={onGamesClick}>
                <div className="action-icon">
                    <Gamepad2 size={12} color="#ec4899" />
                </div>
                <span className="action-label" style={{ color: '#ec4899' }}>Ігри</span>
            </button>
        </div>
    );
};

export default ActionPanel;

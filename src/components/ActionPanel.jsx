import React from 'react';
import { Network, FileText, PackageCheck, Bell, Hexagon, ShoppingBag, Calendar, HandCoins, User, Forklift, ClipboardCheck, BarChart3, Gamepad2, Backpack, Receipt, Car } from 'lucide-react';
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
    onExpenseReportsClick,
    onCarUsageClick,
    isSectionAvailable = () => true,
    onProfileClick,
    onWarehouseOpsClick,
    onStockReportClick,
    onGamesClick,
    onEquipmentClick,
    incomingCount = 0,
    auditCount = 0,
    userHoney = 0
}) => {
    const groups = [
        {
            title: 'Робота',
            actions: [
                { label: 'Табель', icon: <Calendar size={14} />, color: '#60a5fa', onClick: onTimesheetClick },
                { label: 'Погодження', icon: <ClipboardCheck size={14} />, color: '#22d3ee', onClick: onApprovalClick },
                { label: 'Запити', icon: <FileText size={14} />, onClick: onRequestsClick },
                { label: 'Витрати', icon: <Receipt size={14} />, color: '#fbbf24', onClick: onExpenseReportsClick },
                { label: 'Авто', icon: <Car size={14} />, color: '#38bdf8', section: 'CarUsage', onClick: onCarUsageClick },
                { label: 'Винагороди', icon: <HandCoins size={14} />, onClick: onRewardReportClick },
                { label: 'Структура', icon: <Network size={14} />, onClick: onOrgChartClick }
            ]
        },
        {
            title: 'Склад',
            actions: [
                { label: 'Операції', icon: <Forklift size={14} />, color: '#f97316', onClick: onWarehouseOpsClick },
                { label: 'Залишки', icon: <BarChart3 size={14} />, color: '#a78bfa', onClick: onStockReportClick },
                { label: 'Інвентаризація', icon: <PackageCheck size={14} />, onClick: onInventoryClick }
            ]
        },
        {
            title: 'Вулик',
            actions: [
                {
                    label: userHoney.toLocaleString(),
                    icon: <Hexagon size={14} color="var(--accent-gold)" fill="var(--accent-gold)" fillOpacity={0.3} />,
                    color: 'var(--accent-gold)',
                    bold: true,
                    onClick: onSendHoneyClick
                },
                { label: 'Магазин', icon: <ShoppingBag size={14} />, color: '#10b981', onClick: onShopClick },
                { label: 'Спорядження', icon: <Backpack size={14} />, badge: auditCount, onClick: onEquipmentClick },
                { label: 'Вхідні', icon: <Bell size={14} />, badge: incomingCount, onClick: onInboxClick },
                { label: 'Профіль', icon: <User size={14} />, color: '#8b5cf6', onClick: onProfileClick },
                { label: 'Ігри', icon: <Gamepad2 size={14} />, color: '#ec4899', onClick: onGamesClick }
            ]
        }
    ];

    // An action with a `section` key is shown only when the profile marks that
    // section as available; actions without the key are always visible.
    const visibleGroups = groups
        .map(group => ({
            ...group,
            actions: group.actions.filter(a => !a.section || isSectionAvailable(a.section)),
        }))
        .filter(group => group.actions.length > 0);

    return (
        <div className="action-panel">
            {visibleGroups.map(group => (
                <div className="action-section" key={group.title}>
                    <div className="action-section-label">{group.title}</div>
                    <div className="action-grid">
                        {group.actions.map(action => (
                            <button className="action-btn" key={action.label} onClick={action.onClick}>
                                <div className="action-icon" style={action.color ? { color: action.color } : undefined}>
                                    {action.icon}
                                </div>
                                <span
                                    className="action-label"
                                    style={action.color ? { color: action.color, fontWeight: action.bold ? 600 : undefined } : undefined}
                                >
                                    {action.label}
                                </span>
                                {action.badge > 0 && <span className="action-badge">{action.badge}</span>}
                            </button>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
};

export default ActionPanel;

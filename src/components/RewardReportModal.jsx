import React, { useState, useEffect } from 'react';
import { X, Calendar, Download, ChevronRight, ChevronDown, User, Users, MessageCircleQuestion } from 'lucide-react';
import { fetchSalaryReport, sendSalaryQuestion } from '../services/api';
import AskQuestionModal from './AskQuestionModal';
import './RewardReportModal.css';

const RewardReportModal = ({ isOpen, onClose }) => {
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
    const [viewMode, setViewMode] = useState('personal'); // 'personal' or 'team'
    const [reportData, setReportData] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [expandedGroups, setExpandedGroups] = useState({});
    
    // Question Modal State
    const [isAskQuestionOpen, setIsAskQuestionOpen] = useState(false);

    useEffect(() => {
        if (isOpen) {
            loadReport();
        }
    }, [isOpen, viewMode]);

    const loadReport = async () => {
        setIsLoading(true);
        try {
            const [year, month] = selectedDate.split('-');
            const data = await fetchSalaryReport(month, year, viewMode);
            setReportData(data);
            // Default expand all groups
            if (data && data.groups) {
                const initialExpanded = {};
                data.groups.forEach(g => initialExpanded[g.id] = true);
                setExpandedGroups(initialExpanded);
            }
        } catch (error) {
            console.error("Failed to load salary report", error);
        } finally {
            setIsLoading(false);
        }
    };

    const toggleGroup = (groupId) => {
        setExpandedGroups(prev => ({
            ...prev,
            [groupId]: !prev[groupId]
        }));
    };

    const handleSendQuestion = async (questionText) => {
        const [year, month] = selectedDate.split('-');
        try {
            await sendSalaryQuestion({
                question: questionText,
                month,
                year
            });
            
            alert('Питання успішно надіслано!');
        } catch (error) {
            console.error("Failed to send question", error);
            alert("Не вдалося надіслати питання.");
        }
    };

    if (!isOpen) return null;

    return (
        <div className="report-modal-overlay" onClick={onClose}>
            <div className="report-modal-content" onClick={e => e.stopPropagation()}>
                <div className="report-header">
                    <h2>Звіт по винагороді</h2>
                    <button className="close-btn" onClick={onClose}>
                        <X size={24} />
                    </button>
                </div>

                <div className="report-controls">
                    <div className="view-toggle">
                        <button 
                            className={`toggle-btn ${viewMode === 'personal' ? 'active' : ''}`}
                            onClick={() => setViewMode('personal')}
                        >
                            <User size={16} />
                            <span>Мій звіт</span>
                        </button>
                        <button 
                            className={`toggle-btn ${viewMode === 'team' ? 'active' : ''}`}
                            onClick={() => setViewMode('team')}
                        >
                            <Users size={16} />
                            <span>Звіт команди</span>
                        </button>
                    </div>

                    <div className="controls-row">
                        <div className="date-selector">
                            <Calendar size={16} color="#9ca3af" />
                            <input 
                                type="month" 
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                className="month-input"
                            />
                        </div>
                        <button className="refresh-btn" onClick={loadReport} disabled={isLoading}>
                            {isLoading ? 'Завантаження...' : 'Згенерувати'}
                        </button>
                        <button 
                            className="refresh-btn" 
                            style={{ backgroundColor: '#374151', color: 'white', display: 'flex', alignItems: 'center', gap: 6, padding: '0 12px' }}
                            onClick={() => setIsAskQuestionOpen(true)}
                        >
                            <MessageCircleQuestion size={18} />
                        </button>
                    </div>
                </div>

                <div className="report-body">
                    {!reportData ? (
                        <div className="empty-state">Оберіть місяць та згенеруйте звіт</div>
                    ) : (
                        <div className="report-table-container">
                            <div className="report-summary">
                                <div className="summary-item">
                                    <span className="label">Загальна виплата</span>
                                    <span className="value">{reportData.totalAmount?.toLocaleString()} 🍯</span>
                                </div>
                                {viewMode === 'team' && (
                                    <div className="summary-item">
                                        <span className="label">Співробітники</span>
                                        <span className="value">{reportData.totalEmployees}</span>
                                    </div>
                                )}
                            </div>

                            <div className="report-table">
                                <div className="report-header-row">
                                    {reportData.columns.map(col => (
                                        <div key={col.key}>{col.title}</div>
                                    ))}
                                </div>
                                <div className="report-body-list" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                    {reportData.groups.map(group => (
                                        <div key={group.id} className="report-group">
                                            <div className="group-header" onClick={() => toggleGroup(group.id)}>
                                                {expandedGroups[group.id] ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                                                <span>{group.title} ({group.items.length})</span>
                                            </div>
                                            {expandedGroups[group.id] && (
                                                <div className="group-items">
                                                    {group.items.map((item, idx) => (
                                                        <div key={item.id || idx} className="report-row">
                                                            {reportData.columns.map(col => (
                                                                <div 
                                                                    key={col.key} 
                                                                    className={col.type === 'number' || col.type === 'currency' ? 'col-number' : ''}
                                                                    data-label={col.title}
                                                                >
                                                                    {col.type === 'currency' 
                                                                        ? `${item[col.key] !== undefined && item[col.key] !== null ? item[col.key].toLocaleString() : 0} 🍯` 
                                                                        : item[col.key]}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <AskQuestionModal 
                isOpen={isAskQuestionOpen}
                onClose={() => setIsAskQuestionOpen(false)}
                onSend={handleSendQuestion}
                month={selectedDate.split('-')[1]}
                year={selectedDate.split('-')[0]}
            />
        </div>
    );
};

export default RewardReportModal;

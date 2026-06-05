import React, { useState, useEffect } from 'react';
import { X, Calendar as CalendarIcon, ChevronLeft, ChevronRight, ArrowLeft, Save, Users, CheckCircle, XCircle, ChevronDown, Plus, Minus, Trash2 } from 'lucide-react';
import './CraftingModal.css'; // Reusing modal base
import './TimesheetModal.css';
import { DAY_TYPES, INITIAL_USER } from '../data/mockData';
import { fetchTimesheet, saveDailyReport, fetchSubordinateTimesheets, approveTimesheetReports, rejectTimesheetReports, deleteTimesheetReport } from '../services/api';
import { BlockedError } from '../services/api';

const TimesheetModal = ({ isOpen, onClose }) => {
    const [viewMode, setViewMode] = useState('my-hours'); // 'my-hours' or 'approve-hours'
    const [view, setView] = useState('calendar'); // 'calendar' or 'day'
    const [currentDate, setCurrentDate] = useState(new Date()); // For calendar navigation
    const [selectedDate, setSelectedDate] = useState(null); // For day editing

    // Day Form State - simplified to just hours
    const [dayType, setDayType] = useState('Робочий');
    const [regularHours, setRegularHours] = useState(0);
    const [overtimeHours, setOvertimeHours] = useState(0);

    const [currentMonthData, setCurrentMonthData] = useState({});
    const [monthlyNorm, setMonthlyNorm] = useState(null); // Monthly norm from backend
    const [calendar, setCalendar] = useState({}); // Calendar metadata: working/weekend/holiday
    const [isLoadingMonth, setIsLoadingMonth] = useState(false);
    const [error, setError] = useState(null);
    const [blockedMessage, setBlockedMessage] = useState(null); // Modal message when API returns blocked=true

    // Approval mode state
    const [subordinateData, setSubordinateData] = useState({});
    const [selectedReports, setSelectedReports] = useState([]); // [{employeeId, date}, ...]
    const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'approved' | 'pending'
    const [groupByTopLevel, setGroupByTopLevel] = useState('employee'); // 'employee' | 'week'
    const [isProcessing, setIsProcessing] = useState(false);
    const [expandedGroups, setExpandedGroups] = useState({}); // { employeeId: boolean }
    const [expandedWeeks, setExpandedWeeks] = useState({}); // { `${employeeId}_week_${n}`: boolean }
    const [expandedTopWeeks, setExpandedTopWeeks] = useState({}); // { `week_${n}`: boolean }

    const cloneSubordinateData = (data) => {
        if (!data || typeof data !== 'object') return {};

        const cloned = {};
        Object.entries(data).forEach(([employeeId, employee]) => {
            cloned[employeeId] = {
                ...employee,
                reports: { ...(employee?.reports || {}) }
            };
        });
        return cloned;
    };

    const applyStatusToSelectedReports = (nextStatus) => {
        setSubordinateData(prev => {
            const updated = cloneSubordinateData(prev);

            selectedReports.forEach(({ employeeId, date }) => {
                if (updated[employeeId]?.reports?.[date]) {
                    updated[employeeId].reports[date] = {
                        ...updated[employeeId].reports[date],
                        status: nextStatus
                    };
                }
            });

            return updated;
        });
    };

    // Reset on open
    useEffect(() => {
        if (!isOpen) {
            setView('calendar');
            setSelectedDate(null);
            setViewMode('my-hours');
            setSelectedReports([]);
            setGroupByTopLevel('employee');
            setExpandedWeeks({});
            setExpandedTopWeeks({});
        }
    }, [isOpen]);

    // Load month data when date changes or modal opens
    useEffect(() => {
        if (isOpen) {
            if (viewMode === 'my-hours') {
                loadMonthData();
            } else {
                loadSubordinateData();
            }
        }
    }, [currentDate, isOpen, viewMode]);

    const loadMonthData = async () => {
        setIsLoadingMonth(true);
        setError(null);
        const monthStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;

        try {
            const response = await fetchTimesheet(monthStr);

            // Handle new API format: { monthlyNorm, workingDays, calendar: {...}, reports: {...} }
            if (response && typeof response === 'object') {
                // Check if response has new format with monthlyNorm and reports
                if (response.reports) {
                    setCurrentMonthData(response.reports || {});
                    setMonthlyNorm(response.monthlyNorm || null);
                    setCalendar(response.calendar || {});
                } else {
                    // Old format: response is directly the reports object
                    setCurrentMonthData(response);
                    setMonthlyNorm(null); // Will calculate locally
                    setCalendar({});
                }
            } else {
                setCurrentMonthData({});
                setMonthlyNorm(null);
                setCalendar({});
            }
        } catch (e) {
            console.error('Failed to load timesheet', e);
            setError('Не вдалося завантажити дані');
            setCurrentMonthData({});
            setMonthlyNorm(null);
            setCalendar({});
        } finally {
            setIsLoadingMonth(false);
        }
    };

    const loadSubordinateData = async () => {
        setIsLoadingMonth(true);
        setError(null);
        const monthStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;

        try {
            const data = await fetchSubordinateTimesheets(monthStr);
            if (data) {
                // Always set a fresh reference so UI updates even if API returns cached object.
                setSubordinateData(cloneSubordinateData(data));
            } else {
                setSubordinateData({});
            }
        } catch (e) {
            console.warn('Failed to load subordinate data', e);
            setError('Не вдалося завантажити дані підлеглих');
            setSubordinateData({});
        } finally {
            setIsLoadingMonth(false);
        }
    };

    if (!isOpen) return null;

    // --- Calendar Logic ---

    const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
    const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay(); // 0 = Sun
    // Adjust for Monday start (1=Mon, ..., 7=Sun)
    const startDay = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;

    const monthLabel = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });

    const handlePrevMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    };

    const handleNextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    };


    const handleDayClick = (day) => {
        const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        setSelectedDate(dateStr);

        // Load existing data if any
        const report = currentMonthData[dateStr];
        if (report) {
            setDayType(report.type || 'Робочий');
            setRegularHours(report.regularHours || 0);
            setOvertimeHours(report.overtimeHours || 0);
        } else {
            setDayType('Робочий');
            setRegularHours(8);
            setOvertimeHours(0);
        }

        // view stays 'calendar', sheet opens via selectedDate check
    };

    const handleCloseSheet = () => {
        setSelectedDate(null);
    };

    // --- Validation ---

    const validateHours = () => {
        const total = regularHours + overtimeHours;
        if (total > 24) {
            return { valid: false, message: 'Загальна кількість годин не може перевищувати 24' };
        }
        if (regularHours < 0 || overtimeHours < 0) {
            return { valid: false, message: 'Години не можуть бути від\'ємними' };
        }
        if (dayType === 'Робочий' && total === 0) {
            return { valid: false, message: 'Для робочого дня потрібно вказати години' };
        }
        return { valid: true };
    };

    // --- Save Logic ---

    const handleSaveDay = async () => {
        if (!selectedDate) return;

        const validation = validateHours();
        if (!validation.valid) {
            alert(validation.message);
            return;
        }

        const reportData = {
            type: dayType,
            regularHours: dayType === 'Робочий' ? regularHours : 8,
            overtimeHours: dayType === 'Робочий' ? overtimeHours : 0
        };

            try {
            await saveDailyReport(selectedDate, reportData);
            // Update local state
            setCurrentMonthData(prev => ({
                ...prev,
                [selectedDate]: reportData
            }));
            handleCloseSheet();

            console.log('Report saved successfully');
        } catch (e) {
            if (e instanceof BlockedError) {
                setBlockedMessage(e.message);
                return;
            }
            console.error('Failed to save report', e);
            const errorMsg = 'Не вдалося зберегти звіт. Спробуйте ще раз.';
            alert(errorMsg);
        }
    };

    const handleDeleteDay = async () => {
        if (!selectedDate) return;
        
        const confirmDelete = window.confirm('Ви дійсно хочете видалити цей запис?');
        if (!confirmDelete) return;
        
        try {
            const result = await deleteTimesheetReport(selectedDate);
            
            if (result && result.success === false) {
                alert(result.message || 'Не вдалося видалити звіт.');
                return;
            }

            // Update local state by removing the key
            setCurrentMonthData(prev => {
                const nextState = { ...prev };
                delete nextState[selectedDate];
                return nextState;
            });
            handleCloseSheet();
            console.log('Report deleted successfully');
        } catch (e) {
            if (e instanceof BlockedError) {
                setBlockedMessage(e.message);
                return;
            }
            console.error('Failed to delete report', e);
            alert(e.message !== 'Failed to fetch' ? (e.message.startsWith('API Error') ? 'Не вдалося видалити звіт. Спробуйте ще раз.' : e.message) : 'Не вдалося видалити звіт. Спробуйте ще раз.');
        }
    };

    // --- Approval Mode Handlers ---

    const toggleReportSelection = (employeeId, date) => {
        const exists = selectedReports.find(r => r.employeeId === employeeId && r.date === date);

        if (exists) {
            setSelectedReports(selectedReports.filter(r => !(r.employeeId === employeeId && r.date === date)));
        } else {
            setSelectedReports([...selectedReports, { employeeId, date }]);
        }
    };

    const toggleSelectAllForEmployee = (employeeId) => {
        const employee = subordinateData[employeeId];
        if (!employee) return;

        const employeeReports = Object.entries(employee.reports)
            .filter(([_, r]) => r.status === 'pending') // Only select pending
            .map(([date]) => ({ employeeId, date }));

        const allSelected = employeeReports.every(r =>
            selectedReports.find(sr => sr.employeeId === r.employeeId && sr.date === r.date)
        );

        if (allSelected) {
            setSelectedReports(selectedReports.filter(r => r.employeeId !== employeeId));
        } else {
            const newSelections = employeeReports.filter(r =>
                !selectedReports.find(sr => sr.employeeId === r.employeeId && sr.date === r.date)
            );
            setSelectedReports([...selectedReports, ...newSelections]);
        }
    };

    const handleApproveSelected = async () => {
        if (selectedReports.length === 0) return;

        setIsProcessing(true);
        try {
            const result = await approveTimesheetReports(selectedReports);
            if (result.success) {
                applyStatusToSelectedReports('approved');
                setSelectedReports([]);
                alert(`✅ Погоджено ${result.approved} записів`);
                // Reload data from backend to get fresh state
                await loadSubordinateData();
            }
        } catch (e) {
            console.error('Failed to approve', e);
            alert('❌ Помилка при погодженні');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleRejectSelected = async () => {
        if (selectedReports.length === 0) return;

        const reason = prompt('Причина відхилення (опційно):');

        setIsProcessing(true);
        try {
            const result = await rejectTimesheetReports(selectedReports, reason);
            if (result.success) {
                applyStatusToSelectedReports('rejected');
                setSelectedReports([]);
                alert(`❌ Відхилено ${result.rejected} записів`);
                // Reload data from backend to get fresh state
                await loadSubordinateData();
            }
        } catch (e) {
            console.error('Failed to reject', e);
            alert('❌ Помилка при відхиленні');
        } finally {
            setIsProcessing(false);
        }
    };

    const toggleGroupExpansion = (employeeId) => {
        setExpandedGroups(prev => ({
            ...prev,
            [employeeId]: !prev[employeeId]
        }));
    };

    const toggleWeekExpansion = (employeeId, weekNumber) => {
        const key = `${employeeId}_week_${weekNumber}`;
        setExpandedWeeks(prev => ({
            ...prev,
            [key]: !(prev[key] ?? true)
        }));
    };

    const toggleTopWeekExpansion = (weekNumber) => {
        const key = `week_${weekNumber}`;
        setExpandedTopWeeks(prev => ({
            ...prev,
            [key]: !(prev[key] ?? true)
        }));
    };

    const toggleSelectReportBatch = (employeeId, dates) => {
        const pendingDates = dates.filter((date) => {
            const report = subordinateData?.[employeeId]?.reports?.[date];
            return report?.status === 'pending';
        });
        if (pendingDates.length === 0) return;

        setSelectedReports(prev => {
            const allAlreadySelected = pendingDates.every(date =>
                prev.some(item => item.employeeId === employeeId && item.date === date)
            );

            if (allAlreadySelected) {
                return prev.filter(item => !(item.employeeId === employeeId && pendingDates.includes(item.date)));
            }

            const additions = pendingDates
                .filter(date => !prev.some(item => item.employeeId === employeeId && item.date === date))
                .map(date => ({ employeeId, date }));

            return [...prev, ...additions];
        });
    };

    const getWeekOfMonth = (dateStr) => {
        const dateObj = new Date(dateStr);
        const firstDayOfMonth = new Date(dateObj.getFullYear(), dateObj.getMonth(), 1);
        // Monday-based week index (Mon=0 ... Sun=6)
        const firstDayOffset = (firstDayOfMonth.getDay() + 6) % 7;
        return Math.floor((dateObj.getDate() + firstDayOffset - 1) / 7) + 1;
    };

    const totalHours = regularHours + overtimeHours;

    return (
        <div className="modal-overlay" style={{ zIndex: 1200 }}>
            <div className="modal-container">
                <button className="close-btn" onClick={onClose}><X size={24} /></button>

                <h2 className="modal-title">
                    <CalendarIcon size={20} /> Табель
                </h2>

                {view === 'calendar' ? (
                    <div className="timesheet-container">
                        {error && (
                            <div className="timesheet-error">
                                ⚠️ {error}
                            </div>
                        )}

                        <div className="calendar-header">
                            <button className="nav-btn" onClick={handlePrevMonth}><ChevronLeft size={20} /></button>
                            <div className="month-label">{monthLabel}</div>
                            <button className="nav-btn" onClick={handleNextMonth}><ChevronRight size={20} /></button>
                        </div>

                        {isLoadingMonth ? (
                            <div className="timesheet-loading">Завантаження...</div>
                        ) : (
                            <>
                                <div className="calendar-grid">
                                    {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд'].map(d => (
                                        <div key={d} className="weekday-label">{d}</div>
                                    ))}

                                    {/* Empty cells for offset */}
                                    {Array.from({ length: startDay }).map((_, i) => (
                                        <div key={`empty-${i}`} className="day-cell empty" />
                                    ))}

                                    {/* Days */}
                                    {Array.from({ length: daysInMonth }).map((_, i) => {
                                        const day = i + 1;
                                        const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                                        const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
                                        const isToday = new Date().toDateString() === date.toDateString();
                                        const report = currentMonthData[dateStr];
                                        const calendarDay = calendar[dateStr];

                                        // Determine day type from calendar metadata
                                        const dayOfWeek = date.getDay();
                                        const isWeekend = calendarDay ? calendarDay.dayType === 'weekend' : (dayOfWeek === 0 || dayOfWeek === 6);
                                        const isHoliday = calendarDay?.dayType === 'holiday';

                                        let cellClass = 'day-cell';

                                        if (isWeekend) cellClass += ' weekend';
                                        if (isToday) cellClass += ' today';

                                        // Add report type classes for colored borders
                                        if (report) {
                                            cellClass += ' has-report';
                                            const reportType = report.type?.toLowerCase().replace(' ', '-');
                                            cellClass += ` report-${reportType}`;
                                        }

                                        // Emoji mapping
                                        const getEmoji = (type) => {
                                            const emojiMap = {
                                                'відпустка': '🏖️',
                                                'лікарняний': '🏥',
                                                'вихідний': '🎂',
                                                'відрядження': '✈️',
                                                'vacation': '🏖️',
                                                'sick-leave': '🏥',
                                                'day-off': '🎂',
                                                'business-trip': '✈️'
                                            };
                                            return emojiMap[type?.toLowerCase().replace(' ', '-')] || '';
                                        };

                                        const totalHours = report ? (report.regularHours || 0) + (report.overtimeHours || 0) : 0;

                                        return (
                                            <div
                                                key={day}
                                                className={cellClass}
                                                onClick={() => handleDayClick(day)}
                                                title={isHoliday ? calendarDay.name : report?.type}
                                            >
                                                {report && getEmoji(report.type) && (
                                                    <div className="day-emoji">{getEmoji(report.type)}</div>
                                                )}
                                                <div>{day}</div>
                                                {totalHours > 0 && (
                                                    <div className="day-hours">{totalHours}год</div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Monthly Dashboard */}
                                <div className="monthly-dashboard">
                                    <div className="dashboard-stat">
                                        <span className="stat-label">Всього годин:</span>
                                        <span className="stat-value">
                                            {Object.values(currentMonthData)
                                                .reduce((sum, r) => sum + (r.regularHours || 0), 0)
                                                .toFixed(1)}
                                        </span>
                                    </div>
                                    <div className="dashboard-stat">
                                        <span className="stat-label">Понаднормові:</span>
                                        <span className="stat-value overtime">
                                            {Object.values(currentMonthData)
                                                .filter(r => r.type === 'Work' || r.type === 'Робочий')
                                                .reduce((sum, r) => sum + (r.overtimeHours || 0), 0)
                                                .toFixed(1)}
                                        </span>
                                    </div>
                                    <div className="dashboard-stat highlight">
                                        <span className="stat-label">Норма місяця:</span>
                                        <span className="stat-value">
                                            {monthlyNorm !== null ? monthlyNorm : (() => {
                                                // Fallback: Calculate working days (Mon-Fri) in the month
                                                let workingDays = 0;
                                                for (let d = 1; d <= daysInMonth; d++) {
                                                    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), d);
                                                    const dow = date.getDay();
                                                    if (dow !== 0 && dow !== 6) workingDays++;
                                                }
                                                return workingDays * 8;
                                            })()}
                                        </span>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                ) : null
                }

                {/* Day Edit Bottom Sheet / Overlay */}
                {
                    selectedDate && (
                        <div className="sheet-overlay" onClick={handleCloseSheet}>
                            <div className="sheet-container" onClick={e => e.stopPropagation()}>
                                <div className="sheet-header">
                                    <div className="sheet-title">
                                        {new Date(selectedDate).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}
                                    </div>
                                    <button className="sheet-close-btn" onClick={handleCloseSheet}>
                                        <X size={20} />
                                    </button>
                                </div>

                                <div className="sheet-body">
                                    <div className="day-type-selector">
                                        {DAY_TYPES.map(type => (
                                            <button
                                                key={type}
                                                className={`type-btn ${dayType === type ? 'active' : ''}`}
                                                onClick={() => setDayType(type)}
                                            >
                                                {type}
                                            </button>
                                        ))}
                                    </div>

                                    {(dayType === 'Work' || dayType === 'Робочий') && (
                                        <div className="hours-form">
                                            <div className="stepper-field">
                                                <label>Робочі години</label>
                                                <div className="stepper-control">
                                                    <button
                                                        className="stepper-btn"
                                                        onClick={() => setRegularHours(Math.max(0, regularHours - 0.5))}
                                                    >
                                                        <Minus size={20} />
                                                    </button>
                                                    <div className="stepper-value">{regularHours}</div>
                                                    <button
                                                        className="stepper-btn"
                                                        onClick={() => setRegularHours(Math.min(24, regularHours + 0.5))}
                                                    >
                                                        <Plus size={20} />
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="stepper-field">
                                                <label>Понаднормові</label>
                                                <div className="stepper-control">
                                                    <button
                                                        className="stepper-btn"
                                                        onClick={() => setOvertimeHours(Math.max(0, overtimeHours - 0.5))}
                                                    >
                                                        <Minus size={20} />
                                                    </button>
                                                    <div className="stepper-value">{overtimeHours}</div>
                                                    <button
                                                        className="stepper-btn"
                                                        onClick={() => setOvertimeHours(Math.min(24, overtimeHours + 0.5))}
                                                    >
                                                        <Plus size={20} />
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="total-summary-sheet">
                                                <span>Всього: <strong>{totalHours}год</strong></span>
                                                {totalHours > 24 && (
                                                    <span className="error-text">❌ &gt; 24год!</span>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                                        {currentMonthData[selectedDate] && (
                                            <button 
                                                className="craft-submit-btn" 
                                                onClick={handleDeleteDay}
                                                style={{ backgroundColor: '#ef4444', color: 'white', flex: 1 }}
                                            >
                                                <Trash2 size={18} style={{ marginRight: 8 }} />
                                                Видалити
                                            </button>
                                        )}
                                        <button 
                                            className="craft-submit-btn" 
                                            onClick={handleSaveDay}
                                            style={{ flex: 2 }}
                                        >
                                            <Save size={18} style={{ marginRight: 8 }} />
                                            Зберегти
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )
                }
            </div >

            {/* Blocked Operation Modal */}
            {blockedMessage && (
                <div className="blocked-modal-overlay" onClick={() => setBlockedMessage(null)}>
                    <div className="blocked-modal" onClick={e => e.stopPropagation()}>
                        <div className="blocked-modal-icon">⚠️</div>
                        <div className="blocked-modal-title">Операцію заблоковано</div>
                        <div className="blocked-modal-message">{blockedMessage}</div>
                        <button className="blocked-modal-btn" onClick={() => setBlockedMessage(null)}>
                            Зрозуміло
                        </button>
                    </div>
                </div>
            )}
        </div >
    );
};

export default TimesheetModal;

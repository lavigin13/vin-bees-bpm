import React, { useState, useEffect } from 'react';
import { X, Calendar as CalendarIcon, ChevronLeft, ChevronRight, ArrowLeft, Save, Users, CheckCircle, XCircle, ChevronDown, Plus, Minus } from 'lucide-react';
import './CraftingModal.css'; // Reusing modal base
import './TimesheetModal.css';
import { DAY_TYPES, INITIAL_USER } from '../data/mockData';
import { fetchTimesheet, saveDailyReport, fetchSubordinateTimesheets, approveTimesheetReports, rejectTimesheetReports } from '../services/api';

const TimesheetModal = ({ isOpen, onClose }) => {
    const [viewMode, setViewMode] = useState('my-hours'); // 'my-hours' or 'approve-hours'
    const [view, setView] = useState('calendar'); // 'calendar' or 'day'
    const [currentDate, setCurrentDate] = useState(new Date()); // For calendar navigation
    const [selectedDate, setSelectedDate] = useState(null); // For day editing

    // Day Form State - simplified to just hours
    const [dayType, setDayType] = useState('Work');
    const [regularHours, setRegularHours] = useState(0);
    const [overtimeHours, setOvertimeHours] = useState(0);

    const [currentMonthData, setCurrentMonthData] = useState({});
    const [monthlyNorm, setMonthlyNorm] = useState(null); // Monthly norm from backend
    const [calendar, setCalendar] = useState({}); // Calendar metadata: working/weekend/holiday
    const [isLoadingMonth, setIsLoadingMonth] = useState(false);
    const [error, setError] = useState(null);

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
            setDayType(report.type || 'Work');
            setRegularHours(report.regularHours || 0);
            setOvertimeHours(report.overtimeHours || 0);
        } else {
            setDayType('Work');
            setRegularHours(0);
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
        if (dayType === 'Work' && total === 0) {
            return { valid: false, message: 'Для робочого дня потрібно вказати години' };
        }
        return { valid: true };
    };

    // --- Save Logic ---

    const handleSaveDay = async () => {
        if (!selectedDate) return;

        const validation = validateHours();
        if (!validation.valid) {
            if (window.Telegram?.WebApp) {
                window.Telegram.WebApp.showAlert(validation.message);
            } else {
                alert(validation.message);
            }
            return;
        }

        const reportData = {
            type: dayType,
            regularHours: dayType === 'Work' ? regularHours : 8,
            overtimeHours: dayType === 'Work' ? overtimeHours : 0
        };

        try {
            await saveDailyReport(selectedDate, reportData);
            // Update local state
            setCurrentMonthData(prev => ({
                ...prev,
                [selectedDate]: reportData
            }));
            handleCloseSheet();

            if (window.Telegram?.WebApp) {
                window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
            }
        } catch (e) {
            console.error('Failed to save report', e);
            const errorMsg = 'Не вдалося зберегти звіт. Спробуйте ще раз.';
            if (window.Telegram?.WebApp) {
                window.Telegram.WebApp.showAlert(errorMsg);
            } else {
                alert(errorMsg);
            }
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
                    <CalendarIcon size={20} /> Timesheet
                </h2>

                {/* Mode Toggle - only show if user has subordinates */}
                {INITIAL_USER.subordinates && INITIAL_USER.subordinates.length > 0 && view === 'calendar' && (
                    <div className="mode-toggle">
                        <button
                            className={`mode-btn ${viewMode === 'my-hours' ? 'active' : ''}`}
                            onClick={() => setViewMode('my-hours')}
                        >
                            <CalendarIcon size={16} />
                            Мої години
                        </button>
                        <button
                            className={`mode-btn ${viewMode === 'approve-hours' ? 'active' : ''}`}
                            onClick={() => setViewMode('approve-hours')}
                        >
                            <Users size={16} />
                            Погодження
                        </button>
                    </div>
                )}

                {view === 'calendar' && viewMode === 'my-hours' ? (
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
                                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
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
                                                    <div className="day-hours">{totalHours}h</div>
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
                                                .filter(r => r.type === 'Work')
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
                ) : view === 'calendar' && viewMode === 'approve-hours' ? (
                    <>
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

                            <div className="approval-controls-row">
                                <div className="approval-control">
                                    <label className="approval-control-label">Статус</label>
                                    <select
                                        className="approval-control-select"
                                        value={statusFilter}
                                        onChange={(e) => setStatusFilter(e.target.value)}
                                    >
                                        <option value="all">Всі</option>
                                        <option value="approved">Погоджені</option>
                                        <option value="pending">Очікують</option>
                                        <option value="rejected">Відхилені</option>
                                    </select>
                                </div>

                                <div className="approval-control">
                                    <label className="approval-control-label">Групування</label>
                                    <select
                                        className="approval-control-select"
                                        value={groupByTopLevel}
                                        onChange={(e) => setGroupByTopLevel(e.target.value)}
                                    >
                                        <option value="employee">Людина → Тиждень</option>
                                        <option value="week">Тиждень → Людина</option>
                                    </select>
                                </div>
                            </div>

                            {/* Top Approval Actions */}
                            {selectedReports.length > 0 && (
                                <div className="approval-actions-top">
                                    <div className="actions-header">Вибрано: {selectedReports.length}</div>
                                    <div className="actions-buttons">
                                        <button
                                            className="action-btn approve"
                                            onClick={handleApproveSelected}
                                            disabled={isProcessing}
                                        >
                                            <CheckCircle size={16} /> Погодити
                                        </button>
                                        <button
                                            className="action-btn reject"
                                            onClick={handleRejectSelected}
                                            disabled={isProcessing}
                                        >
                                            <XCircle size={16} /> Відхилити
                                        </button>
                                    </div>
                                </div>
                            )}

                            {isLoadingMonth ? (
                                <div className="timesheet-loading">Завантаження...</div>
                            ) : (
                                <div className="subordinate-list">
                                    {groupByTopLevel === 'employee' ? (
                                        Object.values(subordinateData).map(employee => {
                                            // Stable date order for deterministic grouping and rendering.
                                            const allReports = Object.entries(employee.reports || {})
                                                .sort(([aDate], [bDate]) => aDate.localeCompare(bDate));
                                            const filteredReports = statusFilter === 'all'
                                                ? allReports
                                                : allReports.filter(([_, r]) => r.status === statusFilter);

                                            // Skip employee if no reports match filter
                                            if (filteredReports.length === 0) return null;

                                            const totalRegular = allReports.reduce((sum, [_, r]) => sum + (r.regularHours || 0), 0);
                                            const totalOvertime = allReports.reduce((sum, [_, r]) => sum + (r.overtimeHours || 0), 0);

                                            const allSelected = filteredReports.every(([date]) =>
                                                selectedReports.find(r => r.employeeId === employee.id && r.date === date)
                                            );

                                            const isExpanded = expandedGroups[employee.id];
                                            const reportsByWeek = filteredReports.reduce((acc, [date, report]) => {
                                                const weekNumber = getWeekOfMonth(date);
                                                const key = `week_${weekNumber}`;
                                                if (!acc[key]) {
                                                    acc[key] = { weekNumber, items: [] };
                                                }
                                                acc[key].items.push([date, report]);
                                                return acc;
                                            }, {});
                                            const weekGroups = Object.values(reportsByWeek)
                                                .sort((a, b) => a.weekNumber - b.weekNumber);

                                            return (
                                                <div key={employee.id} className="subordinate-group">
                                                    <div
                                                        className="group-header"
                                                        onClick={() => toggleGroupExpansion(employee.id)}
                                                        style={{ cursor: 'pointer' }}
                                                    >
                                                        <div className="group-toggle-icon">
                                                            {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                                                        </div>
                                                        <div className="group-info">
                                                            <div className="group-name">{employee.name}</div>
                                                            <div className="group-role">{employee.role}</div>
                                                        </div>
                                                        <div className="group-stats">
                                                            <span>{totalRegular}h</span>
                                                            {totalOvertime > 0 && <span className="overtime">+{totalOvertime}</span>}
                                                        </div>
                                                        <input
                                                            type="checkbox"
                                                            className="group-checkbox"
                                                            checked={allSelected}
                                                            onClick={(e) => e.stopPropagation()}
                                                            onChange={() => toggleSelectAllForEmployee(employee.id)}
                                                        />
                                                    </div>

                                                    {isExpanded && (
                                                        <div className="group-items">
                                                            {weekGroups.map((group) => (
                                                                <div key={`${employee.id}-${group.weekNumber}`} className="week-group">
                                                                    <button
                                                                        type="button"
                                                                        className="week-group-header"
                                                                        onClick={() => toggleWeekExpansion(employee.id, group.weekNumber)}
                                                                    >
                                                                        <span className="week-group-label">
                                                                            {expandedWeeks[`${employee.id}_week_${group.weekNumber}`] ?? true ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                                                            Тиждень {group.weekNumber}
                                                                        </span>
                                                                        <span className="week-group-meta">{group.items.length} дн.</span>
                                                                    </button>
                                                                    {(expandedWeeks[`${employee.id}_week_${group.weekNumber}`] ?? true) && group.items.map(([date, report]) => {
                                                                        const isSelected = selectedReports.find(r => r.employeeId === employee.id && r.date === date);
                                                                        const dateObj = new Date(date);
                                                                        const dayNum = dateObj.getDate();
                                                                        const dayName = dateObj.toLocaleDateString('uk-UA', { weekday: 'short' });

                                                                        return (
                                                                            <div key={date} className={`report-row ${report.status} ${isSelected ? 'selected' : ''}`} onClick={() => report.status === 'pending' && toggleReportSelection(employee.id, date)}>
                                                                                <div className="row-date">
                                                                                    <span className="day-num">{dayNum}</span>
                                                                                    <span className="day-name">{dayName}</span>
                                                                                </div>

                                                                                <div className="row-details">
                                                                                    <div className="row-type">{report.type}</div>
                                                                                    <div className="row-hours">
                                                                                        {report.regularHours}h
                                                                                        {report.overtimeHours > 0 && <span className="ot"> +{report.overtimeHours}</span>}
                                                                                    </div>
                                                                                </div>

                                                                                <div className="row-status">
                                                                                    {report.status === 'pending' && <div className="status-dot pending" />}
                                                                                    {report.status === 'approved' && <div className="status-dot approved" />}
                                                                                    {report.status === 'rejected' && <div className="status-dot rejected" />}
                                                                                </div>

                                                                                {report.status === 'pending' && (
                                                                                    <div className={`row-select ${isSelected ? 'checked' : ''}`}>
                                                                                        {isSelected && <CheckCircle size={14} color="#000" />}
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })
                                    ) : (
                                        (() => {
                                            const reportsByTopWeek = {};

                                            Object.values(subordinateData).forEach(employee => {
                                                const sortedReports = Object.entries(employee.reports || {})
                                                    .sort(([aDate], [bDate]) => aDate.localeCompare(bDate));
                                                const filteredReports = statusFilter === 'all'
                                                    ? sortedReports
                                                    : sortedReports.filter(([_, r]) => r.status === statusFilter);

                                                filteredReports.forEach(([date, report]) => {
                                                    const weekNumber = getWeekOfMonth(date);
                                                    const weekKey = `week_${weekNumber}`;

                                                    if (!reportsByTopWeek[weekKey]) {
                                                        reportsByTopWeek[weekKey] = { weekNumber, employees: {} };
                                                    }

                                                    if (!reportsByTopWeek[weekKey].employees[employee.id]) {
                                                        reportsByTopWeek[weekKey].employees[employee.id] = {
                                                            employee,
                                                            items: []
                                                        };
                                                    }

                                                    reportsByTopWeek[weekKey].employees[employee.id].items.push([date, report]);
                                                });
                                            });

                                            const topWeekGroups = Object.values(reportsByTopWeek)
                                                .sort((a, b) => a.weekNumber - b.weekNumber);

                                            if (topWeekGroups.length === 0) {
                                                return <div className="approval-empty">Немає записів для поточного фільтра</div>;
                                            }

                                            return topWeekGroups.map(group => {
                                                const weekKey = `week_${group.weekNumber}`;
                                                const weekEmployees = Object.values(group.employees);
                                                const weekItemsCount = weekEmployees.reduce((sum, item) => sum + item.items.length, 0);
                                                const isWeekExpanded = expandedTopWeeks[weekKey] ?? true;

                                                return (
                                                    <div key={weekKey} className="subordinate-group">
                                                        <div className="group-header" onClick={() => toggleTopWeekExpansion(group.weekNumber)} style={{ cursor: 'pointer' }}>
                                                            <div className="group-toggle-icon">
                                                                {isWeekExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                                                            </div>
                                                            <div className="group-info">
                                                                <div className="group-name">Тиждень {group.weekNumber}</div>
                                                                <div className="group-role">{weekEmployees.length} працівн. • {weekItemsCount} записів</div>
                                                            </div>
                                                        </div>

                                                        {isWeekExpanded && (
                                                            <div className="group-items">
                                                                {weekEmployees.map(({ employee, items }) => {
                                                                    const dates = items.map(([date]) => date);
                                                                    const pendingDates = items
                                                                        .filter(([_, report]) => report.status === 'pending')
                                                                        .map(([date]) => date);
                                                                    const allEmployeeWeekSelected = pendingDates.length > 0 && pendingDates.every(date =>
                                                                        selectedReports.some(r => r.employeeId === employee.id && r.date === date)
                                                                    );

                                                                    return (
                                                                        <div key={`${weekKey}_${employee.id}`} className="week-employee-block">
                                                                            <div className="week-employee-header">
                                                                                <div>
                                                                                    <div className="week-employee-name">{employee.name}</div>
                                                                                    <div className="week-employee-role">{employee.role}</div>
                                                                                </div>
                                                                                <div className="week-employee-stats">
                                                                                    <span>{items.length} дн.</span>
                                                                                    <input
                                                                                        type="checkbox"
                                                                                        className="group-checkbox"
                                                                                        checked={allEmployeeWeekSelected}
                                                                                        onChange={() => toggleSelectReportBatch(employee.id, dates)}
                                                                                    />
                                                                                </div>
                                                                            </div>

                                                                            {items.map(([date, report]) => {
                                                                                const isSelected = selectedReports.find(r => r.employeeId === employee.id && r.date === date);
                                                                                const dateObj = new Date(date);
                                                                                const dayNum = dateObj.getDate();
                                                                                const dayName = dateObj.toLocaleDateString('uk-UA', { weekday: 'short' });

                                                                                return (
                                                                                    <div key={`${employee.id}_${date}`} className={`report-row ${report.status} ${isSelected ? 'selected' : ''}`} onClick={() => report.status === 'pending' && toggleReportSelection(employee.id, date)}>
                                                                                        <div className="row-date">
                                                                                            <span className="day-num">{dayNum}</span>
                                                                                            <span className="day-name">{dayName}</span>
                                                                                        </div>

                                                                                        <div className="row-details">
                                                                                            <div className="row-type">{report.type}</div>
                                                                                            <div className="row-hours">
                                                                                                {report.regularHours}h
                                                                                                {report.overtimeHours > 0 && <span className="ot"> +{report.overtimeHours}</span>}
                                                                                            </div>
                                                                                        </div>

                                                                                        <div className="row-status">
                                                                                            {report.status === 'pending' && <div className="status-dot pending" />}
                                                                                            {report.status === 'approved' && <div className="status-dot approved" />}
                                                                                            {report.status === 'rejected' && <div className="status-dot rejected" />}
                                                                                        </div>

                                                                                        {report.status === 'pending' && (
                                                                                            <div className={`row-select ${isSelected ? 'checked' : ''}`}>
                                                                                                {isSelected && <CheckCircle size={14} color="#000" />}
                                                                                            </div>
                                                                                        )}
                                                                                    </div>
                                                                                );
                                                                            })}
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            });
                                        })()
                                    )}

                                </div>
                            )}
                        </div>
                    </>
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

                                    {dayType === 'Work' && (
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
                                                <span>Всього: <strong>{totalHours}h</strong></span>
                                                {totalHours > 24 && (
                                                    <span className="error-text">❌ &gt; 24h!</span>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    <button className="craft-submit-btn" onClick={handleSaveDay}>
                                        <Save size={18} style={{ marginRight: 8 }} />
                                        Save Report
                                    </button>
                                </div>
                            </div>
                        </div>
                    )
                }
            </div >
        </div >
    );
};

export default TimesheetModal;

import React, { useState, useEffect } from 'react';
import { X, Calendar as CalendarIcon, ChevronLeft, ChevronRight, Users, CheckCircle, XCircle, ChevronDown, ChevronRight as ChevronRightIcon } from 'lucide-react';
import './CraftingModal.css';
import './TimesheetModal.css';
import { fetchSubordinateTimesheets, approveTimesheetReports, rejectTimesheetReports } from '../services/api';
import { MOCK_SUBORDINATE_DATA } from '../data/mockData';

const TimesheetApprovalModal = ({ isOpen, onClose }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [subordinateData, setSubordinateData] = useState({});
    const [selectedReports, setSelectedReports] = useState([]);
    const [statusFilter, setStatusFilter] = useState('all');
    const [groupByTopLevel, setGroupByTopLevel] = useState('employee');
    const [isProcessing, setIsProcessing] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [expandedGroups, setExpandedGroups] = useState({});
    const [expandedWeeks, setExpandedWeeks] = useState({});
    const [expandedTopWeeks, setExpandedTopWeeks] = useState({});

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

    useEffect(() => {
        if (!isOpen) {
            setSelectedReports([]);
            setGroupByTopLevel('employee');
            setExpandedWeeks({});
            setExpandedTopWeeks({});
        }
    }, [isOpen]);

    useEffect(() => {
        if (isOpen) {
            loadSubordinateData();
        }
    }, [currentDate, isOpen]);

    const loadSubordinateData = async () => {
        setIsLoading(true);
        setError(null);
        const monthStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
        try {
            const data = await fetchSubordinateTimesheets(monthStr);
            if (data) {
                setSubordinateData(cloneSubordinateData(data));
            } else {
                setSubordinateData({});
            }
        } catch (e) {
            console.warn('Failed to load subordinate data', e);
            setError('Failed to load subordinate data');
            setSubordinateData({});
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    const monthLabel = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });

    const handlePrevMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    };

    const handleNextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    };

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
            .filter(([_, r]) => r.status === 'pending')
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
                alert(`✅ Approved ${result.approved} reports`);
                await loadSubordinateData();
            }
        } catch (e) {
            console.error('Failed to approve', e);
            alert('❌ Approval failed');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleRejectSelected = async () => {
        if (selectedReports.length === 0) return;
        const reason = prompt('Rejection reason (optional):');
        setIsProcessing(true);
        try {
            const result = await rejectTimesheetReports(selectedReports, reason);
            if (result.success) {
                applyStatusToSelectedReports('rejected');
                setSelectedReports([]);
                alert(`❌ Rejected ${result.rejected} reports`);
                await loadSubordinateData();
            }
        } catch (e) {
            console.error('Failed to reject', e);
            alert('❌ Rejection failed');
        } finally {
            setIsProcessing(false);
        }
    };

    const toggleGroupExpansion = (employeeId) => {
        setExpandedGroups(prev => ({ ...prev, [employeeId]: !prev[employeeId] }));
    };

    const toggleWeekExpansion = (employeeId, weekNumber) => {
        const key = `${employeeId}_week_${weekNumber}`;
        setExpandedWeeks(prev => ({ ...prev, [key]: !(prev[key] ?? true) }));
    };

    const toggleTopWeekExpansion = (weekNumber) => {
        const key = `week_${weekNumber}`;
        setExpandedTopWeeks(prev => ({ ...prev, [key]: !(prev[key] ?? true) }));
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
        const firstDayOffset = (firstDayOfMonth.getDay() + 6) % 7;
        return Math.floor((dateObj.getDate() + firstDayOffset - 1) / 7) + 1;
    };

    return (
        <div className="modal-overlay" style={{ zIndex: 1200 }}>
            <div className="modal-container">
                <button className="close-btn" onClick={onClose}><X size={24} /></button>

                <h2 className="modal-title">
                    <Users size={20} /> Approval
                </h2>

                <div className="timesheet-container">
                    {error && (
                        <div className="timesheet-error">⚠️ {error}</div>
                    )}

                    <div className="calendar-header">
                        <button className="nav-btn" onClick={handlePrevMonth}><ChevronLeft size={20} /></button>
                        <div className="month-label">{monthLabel}</div>
                        <button className="nav-btn" onClick={handleNextMonth}><ChevronRightIcon size={20} /></button>
                    </div>

                    <div className="approval-controls-row">
                        <div className="approval-control">
                            <label className="approval-control-label">Status</label>
                            <select
                                className="approval-control-select"
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                            >
                                <option value="all">All</option>
                                <option value="approved">Approved</option>
                                <option value="pending">Pending</option>
                                <option value="rejected">Rejected</option>
                            </select>
                        </div>
                        <div className="approval-control">
                            <label className="approval-control-label">Group by</label>
                            <select
                                className="approval-control-select"
                                value={groupByTopLevel}
                                onChange={(e) => setGroupByTopLevel(e.target.value)}
                            >
                                <option value="employee">Employee → Week</option>
                                <option value="week">Week → Employee</option>
                            </select>
                        </div>
                    </div>

                    {selectedReports.length > 0 && (
                        <div className="approval-actions-top">
                            <div className="actions-header">Selected: {selectedReports.length}</div>
                            <div className="actions-buttons">
                                <button className="action-btn approve" onClick={handleApproveSelected} disabled={isProcessing}>
                                    <CheckCircle size={16} /> Approve
                                </button>
                                <button className="action-btn reject" onClick={handleRejectSelected} disabled={isProcessing}>
                                    <XCircle size={16} /> Reject
                                </button>
                            </div>
                        </div>
                    )}

                    {isLoading ? (
                        <div className="timesheet-loading">Loading...</div>
                    ) : (
                        <div className="subordinate-list">
                            {groupByTopLevel === 'employee' ? (
                                Object.values(subordinateData).map(employee => {
                                    const allReports = Object.entries(employee.reports || {})
                                        .sort(([aDate], [bDate]) => aDate.localeCompare(bDate));
                                    const filteredReports = statusFilter === 'all'
                                        ? allReports
                                        : allReports.filter(([_, r]) => r.status === statusFilter);

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
                                        if (!acc[key]) acc[key] = { weekNumber, items: [] };
                                        acc[key].items.push([date, report]);
                                        return acc;
                                    }, {});
                                    const weekGroups = Object.values(reportsByWeek).sort((a, b) => a.weekNumber - b.weekNumber);

                                    return (
                                        <div key={employee.id} className="subordinate-group">
                                            <div className="group-header" onClick={() => toggleGroupExpansion(employee.id)} style={{ cursor: 'pointer' }}>
                                                <div className="group-toggle-icon">
                                                    {isExpanded ? <ChevronDown size={20} /> : <ChevronRightIcon size={20} />}
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
                                                            <button type="button" className="week-group-header" onClick={() => toggleWeekExpansion(employee.id, group.weekNumber)}>
                                                                <span className="week-group-label">
                                                                    {expandedWeeks[`${employee.id}_week_${group.weekNumber}`] ?? true ? <ChevronDown size={14} /> : <ChevronRightIcon size={14} />}
                                                                    Week {group.weekNumber}
                                                                </span>
                                                                <span className="week-group-meta">{group.items.length} days</span>
                                                            </button>
                                                            <div className="week-days-grid">
                                                                {group.items.map(([date, report]) => {
                                                                    const isSelected = selectedReports.find(r => r.employeeId === employee.id && r.date === date);
                                                                    const dateObj = new Date(date);
                                                                    const dayNum = dateObj.getDate();
                                                                    const dayName = dateObj.toLocaleDateString('uk-UA', { weekday: 'short' }).toUpperCase();

                                                                    return (
                                                                        <div key={date} className={`day-square ${report.type.replace(/\s+/g, '')} ${isSelected ? 'selected' : ''}`} onClick={() => report.status === 'pending' && toggleReportSelection(employee.id, date)}>
                                                                            <div className="ds-header">
                                                                                <span className="ds-date">{dayNum} {dayName}</span>
                                                                                <div className={`ds-status ${report.status}`} />
                                                                            </div>
                                                                            <div className="ds-body">
                                                                                {report.type === 'Work' ? (
                                                                                    <>
                                                                                        <div className="ds-hours">{report.regularHours}</div>
                                                                                        {report.overtimeHours > 0 && <div className="ds-ot">+{report.overtimeHours}</div>}
                                                                                    </>
                                                                                ) : (
                                                                                    <div className="ds-icon">
                                                                                        {report.type === 'Vacation' && '⛱️'}
                                                                                        {report.type === 'Sick' && '💊'}
                                                                                        {report.type === 'Business Trip' && '💼'}
                                                                                        {report.type === 'Day Off' && '☕'}
                                                                                        {(report.type === 'omitted' || report.type === 'Omitted') && '❌'}
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                            {report.status === 'pending' && isSelected && (
                                                                                <div className="ds-check">
                                                                                    <CheckCircle size={12} color="#000" />
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
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
                                        const sortedReports = Object.entries(employee.reports || {}).sort(([a], [b]) => a.localeCompare(b));
                                        const filteredReports = statusFilter === 'all' ? sortedReports : sortedReports.filter(([_, r]) => r.status === statusFilter);
                                        filteredReports.forEach(([date, report]) => {
                                            const weekNumber = getWeekOfMonth(date);
                                            const weekKey = `week_${weekNumber}`;
                                            if (!reportsByTopWeek[weekKey]) reportsByTopWeek[weekKey] = { weekNumber, employees: {} };
                                            if (!reportsByTopWeek[weekKey].employees[employee.id]) reportsByTopWeek[weekKey].employees[employee.id] = { employee, items: [] };
                                            reportsByTopWeek[weekKey].employees[employee.id].items.push([date, report]);
                                        });
                                    });
                                    const topWeekGroups = Object.values(reportsByTopWeek).sort((a, b) => a.weekNumber - b.weekNumber);

                                    if (topWeekGroups.length === 0) {
                                        return <div className="approval-empty">No records for current filter</div>;
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
                                                        {isWeekExpanded ? <ChevronDown size={20} /> : <ChevronRightIcon size={20} />}
                                                    </div>
                                                    <div className="group-info">
                                                        <div className="group-name">Week {group.weekNumber}</div>
                                                        <div className="group-role">{weekEmployees.length} employees • {weekItemsCount} records</div>
                                                    </div>
                                                </div>

                                                {isWeekExpanded && (
                                                    <div className="group-items">
                                                        {weekEmployees.map(({ employee, items }) => {
                                                            const dates = items.map(([date]) => date);
                                                            const pendingDates = items.filter(([_, r]) => r.status === 'pending').map(([d]) => d);
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
                                                                            <span>{items.length} days</span>
                                                                            <input
                                                                                type="checkbox"
                                                                                className="group-checkbox"
                                                                                checked={allEmployeeWeekSelected}
                                                                                onChange={() => toggleSelectReportBatch(employee.id, dates)}
                                                                            />
                                                                        </div>
                                                                    </div>

                                                                    <div className="week-days-grid">
                                                                        {items.map(([date, report]) => {
                                                                            const isSelected = selectedReports.find(r => r.employeeId === employee.id && r.date === date);
                                                                            const dateObj = new Date(date);
                                                                            const dayNum = dateObj.getDate();
                                                                            const dayName = dateObj.toLocaleDateString('uk-UA', { weekday: 'short' }).toUpperCase();

                                                                            return (
                                                                                <div key={`${employee.id}_${date}`} className={`day-square ${report.type.replace(/\s+/g, '')} ${isSelected ? 'selected' : ''}`} onClick={() => report.status === 'pending' && toggleReportSelection(employee.id, date)}>
                                                                                    <div className="ds-header">
                                                                                        <span className="ds-date">{dayNum} {dayName}</span>
                                                                                        <div className={`ds-status ${report.status}`} />
                                                                                    </div>
                                                                                    <div className="ds-body">
                                                                                        {report.type === 'Work' ? (
                                                                                            <>
                                                                                                <div className="ds-hours">{report.regularHours}</div>
                                                                                                {report.overtimeHours > 0 && <div className="ds-ot">+{report.overtimeHours}</div>}
                                                                                            </>
                                                                                        ) : (
                                                                                            <div className="ds-icon">
                                                                                                {report.type === 'Vacation' && '⛱️'}
                                                                                                {report.type === 'Sick' && '💊'}
                                                                                                {report.type === 'Business Trip' && '💼'}
                                                                                                {report.type === 'Day Off' && '☕'}
                                                                                                {(report.type === 'omitted' || report.type === 'Omitted') && '❌'}
                                                                                            </div>
                                                                                        )}
                                                                                    </div>
                                                                                    {report.status === 'pending' && isSelected && (
                                                                                        <div className="ds-check">
                                                                                            <CheckCircle size={12} color="#000" />
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                            );
                                                                        })}
                                                                    </div>
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
            </div>
        </div>
    );
};

export default TimesheetApprovalModal;

import React, { useState, useEffect, useMemo } from 'react';
import { X, Calendar as CalendarIcon, ChevronLeft, ChevronRight, ArrowLeft, Plus, Trash2, Save, Clock } from 'lucide-react';
import './CraftingModal.css'; // Reusing modal base
import './TimesheetModal.css';
import { WORK_TYPES, DAY_TYPES } from '../data/mockData';

const TimesheetModal = ({ isOpen, onClose, dailyReports = {}, onSaveReport }) => {
    const [view, setView] = useState('calendar'); // 'calendar' or 'day'
    const [currentDate, setCurrentDate] = useState(new Date()); // For calendar navigation
    const [selectedDate, setSelectedDate] = useState(null); // For day editing
    
    // Day Form State
    const [dayType, setDayType] = useState('Work');
    const [tasks, setTasks] = useState([]);

    // Reset on open
    useEffect(() => {
        if (!isOpen) {
            setView('calendar');
            setSelectedDate(null);
        }
    }, [isOpen]);

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
        const report = dailyReports[dateStr];
        if (report) {
            setDayType(report.type || 'Work');
            setTasks(report.tasks ? JSON.parse(JSON.stringify(report.tasks)) : []);
        } else {
            setDayType('Work');
            setTasks([]);
        }
        
        setView('day');
    };

    // --- Day Form Logic ---

    const handleAddTask = () => {
        setTasks([...tasks, { id: Date.now(), workType: WORK_TYPES[0], comment: '', quantity: 1, hours: 0 }]);
    };

    const updateTask = (id, field, value) => {
        setTasks(tasks.map(t => t.id === id ? { ...t, [field]: value } : t));
    };

    const removeTask = (id) => {
        setTasks(tasks.filter(t => t.id !== id));
    };

    const handleSaveDay = () => {
        if (selectedDate) {
            onSaveReport(selectedDate, {
                type: dayType,
                tasks: tasks
            });
            setView('calendar');
        }
    };

    const totalHours = tasks.reduce((sum, t) => sum + (parseFloat(t.hours) || 0), 0);

    return (
        <div className="modal-overlay" style={{ zIndex: 1200 }}>
            <div className="modal-content" style={{ maxWidth: 600 }}>
                <button className="close-btn" onClick={onClose}><X size={24} /></button>
                
                <h2 className="modal-title">
                    <CalendarIcon size={20} /> Timesheet
                </h2>

                {view === 'calendar' ? (
                    <div className="timesheet-container">
                        <div className="calendar-header">
                            <button className="nav-btn" onClick={handlePrevMonth}><ChevronLeft size={20} /></button>
                            <div className="month-label">{monthLabel}</div>
                            <button className="nav-btn" onClick={handleNextMonth}><ChevronRight size={20} /></button>
                        </div>

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
                                const isToday = new Date().toDateString() === new Date(currentDate.getFullYear(), currentDate.getMonth(), day).toDateString();
                                const report = dailyReports[dateStr];
                                
                                let dotClass = '';
                                if (report) {
                                    if (report.type === 'Work') dotClass = 'filled';
                                    else if (['Vacation', 'Sick Leave', 'Day Off'].includes(report.type)) dotClass = 'off';
                                } else if (!report && new Date(dateStr) < new Date()) {
                                    // Past days without report (simplified logic)
                                    // dotClass = 'missing'; 
                                }

                                return (
                                    <div 
                                        key={day} 
                                        className={`day-cell ${isToday ? 'today' : ''}`}
                                        onClick={() => handleDayClick(day)}
                                    >
                                        {day}
                                        {dotClass && <div className={`report-dot ${dotClass}`} />}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ) : (
                    <div className="day-form">
                        <div className="day-header">
                            <button className="nav-btn" onClick={() => setView('calendar')}><ArrowLeft size={20} /></button>
                            <div className="day-title">{new Date(selectedDate).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}</div>
                        </div>

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
                            <>
                                <table className="tasks-table">
                                    <thead>
                                        <tr>
                                            <th style={{ width: '30%' }}>Work Type</th>
                                            <th style={{ width: '35%' }}>Comment</th>
                                            <th style={{ width: '15%' }}>Qty</th>
                                            <th style={{ width: '15%' }}>Hours</th>
                                            <th style={{ width: '5%' }}></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {tasks.map(task => (
                                            <tr key={task.id}>
                                                <td>
                                                    <select 
                                                        className="task-input" 
                                                        value={task.workType}
                                                        onChange={(e) => updateTask(task.id, 'workType', e.target.value)}
                                                        style={{ background: '#1a1a1a', borderRadius: 4 }}
                                                    >
                                                        {WORK_TYPES.map(t => <option key={t}>{t}</option>)}
                                                    </select>
                                                </td>
                                                <td>
                                                    <input 
                                                        className="task-input"
                                                        value={task.comment}
                                                        onChange={(e) => updateTask(task.id, 'comment', e.target.value)}
                                                        placeholder="..."
                                                    />
                                                </td>
                                                <td>
                                                    <input 
                                                        type="number"
                                                        className="task-input"
                                                        value={task.quantity}
                                                        onChange={(e) => updateTask(task.id, 'quantity', parseInt(e.target.value) || 0)}
                                                    />
                                                </td>
                                                <td>
                                                    <input 
                                                        type="number"
                                                        className="task-input"
                                                        value={task.hours}
                                                        onChange={(e) => updateTask(task.id, 'hours', parseFloat(e.target.value) || 0)}
                                                    />
                                                </td>
                                                <td style={{ textAlign: 'center' }}>
                                                    <button className="delete-row-btn" onClick={() => removeTask(task.id)}>
                                                        <Trash2 size={14} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>

                                <button className="add-task-btn" onClick={handleAddTask}>
                                    <Plus size={16} /> Add Work Log
                                </button>

                                <div className="total-summary">
                                    <span>Total Hours: <strong>{totalHours}</strong></span>
                                </div>
                            </>
                        )}

                        <button className="craft-submit-btn" onClick={handleSaveDay}>
                            <Save size={18} style={{ marginRight: 8 }} />
                            Save Report
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TimesheetModal;


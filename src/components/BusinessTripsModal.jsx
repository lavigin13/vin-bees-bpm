import React, { useState, useEffect } from 'react';
import { X, Rocket, Plus, Calendar, MapPin, Paperclip, Trash2, ArrowLeft } from 'lucide-react';
import './CraftingModal.css'; // Reusing modal base
import './BusinessTripsModal.css';

const BusinessTripsModal = ({ isOpen, onClose, trips = [], onSave, onSubmit }) => {
    const [view, setView] = useState('list'); // 'list' or 'edit'
    const [currentTrip, setCurrentTrip] = useState(null);
    const [activeFileExpenseId, setActiveFileExpenseId] = useState(null); // To track which expense is uploading
    const fileInputRef = React.useRef(null);

    // Reset state on open/close
    useEffect(() => {
        if (!isOpen) {
            setView('list');
            setCurrentTrip(null);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleCreateNew = () => {
        setCurrentTrip({
            id: `new_${Date.now()}`,
            status: 'draft',
            destination: '',
            dateFrom: '',
            dateTo: '',
            goal: '',
            expenses: []
        });
        setView('edit');
    };

    const handleEdit = (trip) => {
        setCurrentTrip(JSON.parse(JSON.stringify(trip))); // Deep copy
        setView('edit');
    };

    const handleBack = () => {
        if (confirm("Discard unsaved changes?")) {
            setView('list');
        }
    };

    const handleSave = () => {
        onSave(currentTrip);
        setView('list');
    };

    const handleSubmit = () => {
        if (confirm("Submit this trip for approval? It will be locked.")) {
            onSubmit(currentTrip);
            setView('list');
        }
    };

    // --- Form Handlers ---

    const updateField = (field, value) => {
        setCurrentTrip(prev => ({ ...prev, [field]: value }));
    };

    const addExpense = () => {
        setCurrentTrip(prev => ({
            ...prev,
            expenses: [
                ...prev.expenses,
                { id: Date.now(), type: 'Transport', currency: 'USD', amount: 0, fileName: '', comment: '' }
            ]
        }));
    };

    const removeExpense = (id) => {
        setCurrentTrip(prev => ({
            ...prev,
            expenses: prev.expenses.filter(e => e.id !== id)
        }));
    };

    const updateExpense = (id, field, value) => {
        setCurrentTrip(prev => ({
            ...prev,
            expenses: prev.expenses.map(e => e.id === id ? { ...e, [field]: value } : e)
        }));
    };

    const handleFileClick = (expenseId) => {
        setActiveFileExpenseId(expenseId);
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    };

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0] && activeFileExpenseId) {
            const file = e.target.files[0];
            // In a real app, you might upload here or convert to base64
            // For now, we store the file object and name
            updateExpense(activeFileExpenseId, 'fileName', file.name);
            updateExpense(activeFileExpenseId, 'file', file); 
            
            // Reset
            e.target.value = null;
            setActiveFileExpenseId(null);
        }
    };

    return (
        <div className="modal-overlay" style={{ zIndex: 1150 }}>
            <div className="modal-content" style={{ maxWidth: 500 }}>
                {/* Hidden File Input */}
                <input 
                    type="file" 
                    ref={fileInputRef} 
                    style={{ display: 'none' }} 
                    onChange={handleFileChange} 
                />

                <button className="close-btn" onClick={onClose}><X size={24} /></button>
                
                <h2 className="modal-title">
                    <span style={{ fontSize: 24 }}>🐝</span> Hive Business Flights
                </h2>

                {view === 'list' ? (
                    <div className="trips-container">
                        <button className="new-trip-btn" onClick={handleCreateNew}>
                            <Plus size={18} /> Plan New Trip
                        </button>

                        {trips.length === 0 ? (
                            <div style={{ textAlign: 'center', opacity: 0.5, padding: 20 }}>No trips yet</div>
                        ) : (
                            trips.map(trip => (
                                <div key={trip.id} className="trip-card" onClick={() => handleEdit(trip)}>
                                    <div className="trip-info">
                                        <h3>{trip.destination || "Untitled Trip"}</h3>
                                        <div className="trip-dates">
                                            <Calendar size={10} /> {trip.dateFrom} - {trip.dateTo}
                                        </div>
                                    </div>
                                    <div className={`trip-status status-${trip.status}`}>
                                        {trip.status}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                ) : (
                    <div className="trip-form">
                        <div style={{ marginBottom: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, opacity: 0.7 }} onClick={handleBack}>
                            <ArrowLeft size={14} /> Back to list
                        </div>

                        <div className="form-section">
                            <label className="label">Destination</label>
                            <input 
                                className="rpg-input" 
                                value={currentTrip.destination}
                                onChange={(e) => updateField('destination', e.target.value)}
                                placeholder="e.g. New York Hive"
                            />
                        </div>

                        <div className="form-section date-row">
                            <div style={{ flex: 1 }}>
                                <label className="label">From</label>
                                <input 
                                    type="date" 
                                    className="rpg-input" 
                                    value={currentTrip.dateFrom}
                                    onChange={(e) => updateField('dateFrom', e.target.value)}
                                />
                            </div>
                            <div style={{ flex: 1 }}>
                                <label className="label">To</label>
                                <input 
                                    type="date" 
                                    className="rpg-input" 
                                    value={currentTrip.dateTo}
                                    onChange={(e) => updateField('dateTo', e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="form-section">
                            <label className="label">Goal / Description</label>
                            <textarea 
                                className="rpg-input" 
                                rows={2}
                                value={currentTrip.goal}
                                onChange={(e) => updateField('goal', e.target.value)}
                                placeholder="Why are we going?"
                            />
                        </div>

                        <div className="form-section">
                            <label className="label">Expenses</label>
                            <table className="expenses-table">
                                <thead>
                                    <tr>
                                        <th style={{width: '25%'}}>Type</th>
                                        <th style={{width: '25%'}}>Comment</th>
                                        <th style={{width: '15%'}}>Curr</th>
                                        <th style={{width: '20%'}}>Amt</th>
                                        <th style={{width: '5%'}}>Doc</th>
                                        <th style={{width: '10%'}}></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {currentTrip.expenses.map(exp => (
                                        <tr key={exp.id}>
                                            <td>
                                                <select 
                                                    className="expense-input"
                                                    value={exp.type}
                                                    onChange={(e) => updateExpense(exp.id, 'type', e.target.value)}
                                                >
                                                    <option>Transport</option>
                                                    <option>Hotel</option>
                                                    <option>Food</option>
                                                    <option>Other</option>
                                                </select>
                                            </td>
                                            <td>
                                                <input 
                                                    type="text" 
                                                    className="expense-input"
                                                    value={exp.comment || ''}
                                                    onChange={(e) => updateExpense(exp.id, 'comment', e.target.value)}
                                                    placeholder="..."
                                                />
                                            </td>
                                            <td>
                                                <select 
                                                    className="expense-input"
                                                    value={exp.currency}
                                                    onChange={(e) => updateExpense(exp.id, 'currency', e.target.value)}
                                                >
                                                    <option>USD</option>
                                                    <option>EUR</option>
                                                    <option>GBP</option>
                                                </select>
                                            </td>
                                            <td>
                                                <input 
                                                    type="number" 
                                                    className="expense-input"
                                                    value={exp.amount}
                                                    onChange={(e) => updateExpense(exp.id, 'amount', parseInt(e.target.value) || 0)}
                                                />
                                            </td>
                                            <td style={{ textAlign: 'center' }}>
                                                <button 
                                                    className={`file-btn ${exp.fileName ? 'attached' : ''}`}
                                                    title={exp.fileName || "Attach File"}
                                                    onClick={() => handleFileClick(exp.id)}
                                                >
                                                    <Paperclip size={14} />
                                                </button>
                                            </td>
                                            <td style={{ textAlign: 'center' }}>
                                                <button className="delete-row-btn" onClick={() => removeExpense(exp.id)}>
                                                    <Trash2 size={14} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            <button className="add-expense-btn" onClick={addExpense}>
                                <Plus size={14} /> Add Expense
                            </button>
                        </div>

                        <div className="form-actions">
                            <button className="action-btn btn-save" onClick={handleSave}>
                                Save Draft
                            </button>
                            <button className="action-btn btn-submit" onClick={handleSubmit}>
                                Submit
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default BusinessTripsModal;


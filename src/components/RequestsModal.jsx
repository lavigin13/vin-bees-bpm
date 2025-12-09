import React, { useState, useEffect } from 'react';
import { X, Plus, Calendar, FileText, ArrowLeft, Users, User } from 'lucide-react';
import './CraftingModal.css'; // Reusing base modal styles
import './RequestsModal.css';
import { REQUEST_CATEGORIES } from '../data/mockData';

const RequestsModal = ({ isOpen, onClose, requests = [], onSave, onSubmit, onApprove, onReject, currentUserId, initialFilter = 'my' }) => {
    const [view, setView] = useState('list'); // 'list' or 'edit'
    const [listFilter, setListFilter] = useState(initialFilter); // 'my' or 'subordinates'
    const [currentRequest, setCurrentRequest] = useState(null);

    // Reset state when modal opens
    useEffect(() => {
        if (isOpen) {
            setView('list');
            setListFilter(initialFilter); // Use prop for initial state
            setCurrentRequest(null);
        }
    }, [isOpen, initialFilter]);

    const handleCreateNew = () => {
        const today = new Date().toISOString().split('T')[0];
        setCurrentRequest({
            id: null,
            status: 'draft',
            date: today,
            category: REQUEST_CATEGORIES[0],
            shortDesc: '',
            fullDesc: '',
            createdBy: currentUserId
        });
        setView('edit');
    };

    const handleEdit = (req) => {
        if (listFilter === 'subordinates') {
            // Read-only view for subordinates' requests (can be expanded later for approval logic)
            setCurrentRequest(req);
            setView('edit'); 
        } else {
            setCurrentRequest({ ...req });
            setView('edit');
        }
    };

    const handleBack = () => {
        setView('list');
        setCurrentRequest(null);
    };

    const updateField = (field, value) => {
        if (listFilter === 'subordinates') return; // Prevent editing subordinates' requests here
        setCurrentRequest(prev => ({ ...prev, [field]: value }));
    };

    const handleSaveForm = () => {
        if (!currentRequest.shortDesc) {
            alert('Short description is required');
            return;
        }
        onSave(currentRequest);
        setView('list');
    };

    const handleSubmitForm = () => {
        if (!currentRequest.shortDesc) {
            alert('Short description is required');
            return;
        }
        onSubmit(currentRequest);
        setView('list');
    };

    // Filter requests based on toggle
    const filteredRequests = requests.filter(req => {
        if (listFilter === 'my') {
            return req.createdBy === currentUserId;
        } else {
            return req.createdBy !== currentUserId; // Assuming non-current user requests are from subordinates for now
        }
    });

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" style={{ zIndex: 1150 }}>
            <div className="requests-modal-content">
                <button className="close-btn" onClick={onClose}><X size={24} /></button>

                <div className="requests-header">
                    <h2 className="requests-title">
                        <span style={{ fontSize: 24 }}>🍯</span> Honey Requests
                    </h2>
                </div>

                {view === 'list' ? (
                    <>
                        <div className="requests-toggle-container">
                            <button 
                                className={`toggle-btn ${listFilter === 'my' ? 'active' : ''}`}
                                onClick={() => setListFilter('my')}
                            >
                                <User size={16} style={{marginRight: 6, verticalAlign: 'text-bottom'}} />
                                My Requests
                            </button>
                            <button 
                                className={`toggle-btn ${listFilter === 'subordinates' ? 'active' : ''}`}
                                onClick={() => setListFilter('subordinates')}
                            >
                                <Users size={16} style={{marginRight: 6, verticalAlign: 'text-bottom'}} />
                                Team Requests
                            </button>
                        </div>

                        <div className="requests-list">
                            {filteredRequests.length === 0 ? (
                                <div style={{textAlign: 'center', color: 'var(--text-secondary)', padding: 20}}>
                                    No requests found.
                                </div>
                            ) : (
                                filteredRequests.map(req => (
                                    <div key={req.id} className="request-card" onClick={() => handleEdit(req)}>
                                        <div className="request-header">
                                            <span className="request-category">{req.category}</span>
                                            <span className={`request-status ${req.status}`}>{req.status}</span>
                                        </div>
                                        <div className="request-desc">{req.shortDesc}</div>
                                        <div className="request-meta">
                                            <span><Calendar size={12} /> {req.date}</span>
                                            {listFilter === 'subordinates' && <span>By: ID #{req.createdBy}</span>}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        {listFilter === 'my' && (
                            <button className="create-request-btn" onClick={handleCreateNew}>
                                <Plus size={20} /> New Request
                            </button>
                        )}
                    </>
                ) : (
                    <div className="request-form-container" style={{display: 'flex', flexDirection: 'column', height: '100%'}}>
                        <div style={{display: 'flex', alignItems: 'center', marginBottom: 20, cursor: 'pointer'}} onClick={handleBack}>
                            <ArrowLeft size={20} style={{marginRight: 10}} />
                            <h3>{currentRequest.id ? 'Edit Request' : 'New Request'}</h3>
                        </div>

                        <div className="request-form">
                            <div className="form-group">
                                <label className="form-label">Date</label>
                                <input 
                                    type="date" 
                                    className="form-input"
                                    value={currentRequest.date}
                                    onChange={(e) => updateField('date', e.target.value)}
                                    readOnly={listFilter === 'subordinates'}
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Category</label>
                                <select 
                                    className="form-select"
                                    value={currentRequest.category}
                                    onChange={(e) => updateField('category', e.target.value)}
                                    disabled={listFilter === 'subordinates'}
                                >
                                    {REQUEST_CATEGORIES.map(cat => (
                                        <option key={cat} value={cat}>{cat}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Short Description</label>
                                <input 
                                    type="text" 
                                    className="form-input"
                                    value={currentRequest.shortDesc}
                                    onChange={(e) => updateField('shortDesc', e.target.value)}
                                    placeholder="e.g. New Monitor"
                                    readOnly={listFilter === 'subordinates'}
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Full Description</label>
                                <textarea 
                                    className="form-textarea"
                                    value={currentRequest.fullDesc}
                                    onChange={(e) => updateField('fullDesc', e.target.value)}
                                    placeholder="Provide more details..."
                                    readOnly={listFilter === 'subordinates'}
                                />
                            </div>
                        </div>

                        {listFilter === 'my' && (
                            <div className="form-actions">
                                <button className="action-btn btn-secondary" onClick={handleSaveForm}>
                                    Save Draft
                                </button>
                                <button className="action-btn btn-primary" onClick={handleSubmitForm}>
                                    Submit Request
                                </button>
                            </div>
                        )}
                        {listFilter === 'subordinates' && (
                            <div className="form-actions">
                                {currentRequest.status === 'new' || currentRequest.status === 'pending' ? (
                                    <>
                                        <button className="action-btn" style={{backgroundColor: '#ef4444', color: 'white'}} onClick={() => { onReject(currentRequest); setView('list'); }}>
                                            Reject
                                        </button>
                                        <button className="action-btn" style={{backgroundColor: '#10b981', color: 'white'}} onClick={() => { onApprove(currentRequest); setView('list'); }}>
                                            Approve
                                        </button>
                                    </>
                                ) : (
                                    <button className="action-btn btn-secondary" onClick={handleBack}>
                                        Close
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default RequestsModal;


import React, { useState, useEffect } from 'react';
import { X, Plus, Calendar, FileText, ArrowLeft, Users, User } from 'lucide-react';
import './CraftingModal.css'; // Reusing base modal styles
import './RequestsModal.css';
import { REQUEST_CATEGORIES } from '../data/mockData';
import { fetchRequestCategories } from '../services/api';

const RequestsModal = ({ isOpen, onClose, requests = [], onSave, onSubmit, onApprove, onReject, currentUserId, initialFilter = 'my', onViewChange }) => {
    const [view, setView] = useState('list'); // 'list' or 'edit'
    const [listFilter, setListFilter] = useState(initialFilter); // 'my' or 'subordinates'
    const [currentRequest, setCurrentRequest] = useState(null);
    const [categories, setCategories] = useState(REQUEST_CATEGORIES);
    const [isLoadingCategories, setIsLoadingCategories] = useState(false);

    // Fetch categories on mount
    useEffect(() => {
        const loadCategories = async () => {
            setIsLoadingCategories(true);
            try {
                const data = await fetchRequestCategories();
                if (data && Array.isArray(data)) {
                    setCategories(data);
                }
            } catch (error) {
                console.error('Failed to load categories', error);
            } finally {
                setIsLoadingCategories(false);
            }
        };
        loadCategories();
    }, []);

    // Reset state when modal opens
    useEffect(() => {
        if (isOpen) {
            setView('list');
            setListFilter(initialFilter);
            setCurrentRequest(null);
            // Trigger fetch for initial filter
            onViewChange(initialFilter);
        }
    }, [isOpen, initialFilter]);

    const handleFilterChange = (newFilter) => {
        setListFilter(newFilter);
        onViewChange(newFilter);
    };

    const handleCreateNew = () => {
        const today = new Date().toISOString().split('T')[0];
        setCurrentRequest({
            id: null,
            status: 'draft',
            date: today,
            categoryId: '',
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
        if (!currentRequest.categoryId) {
            alert('Category is required');
            return;
        }
        if (!currentRequest.shortDesc) {
            alert('Short description is required');
            return;
        }
        onSave(currentRequest);
        setView('list');
    };

    const handleSubmitForm = () => {
        if (!currentRequest.categoryId) {
            alert('Category is required');
            return;
        }
        if (!currentRequest.shortDesc) {
            alert('Short description is required');
            return;
        }
        onSubmit(currentRequest);
        setView('list');
    };

    // Filter requests based on toggle
    // Filter requests based on toggle
    const filteredRequests = requests; // Now we assume requests are already filtered by the API/Parent based on the view

    // Check if current request is editable (only new/drats are editable)
    const isEditable = currentRequest && (!currentRequest.id || currentRequest.status === 'draft');

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
                                onClick={() => handleFilterChange('my')}
                            >
                                <User size={16} style={{ marginRight: 6, verticalAlign: 'text-bottom' }} />
                                My Requests
                            </button>
                            <button
                                className={`toggle-btn ${listFilter === 'subordinates' ? 'active' : ''}`}
                                onClick={() => handleFilterChange('subordinates')}
                            >
                                <Users size={16} style={{ marginRight: 6, verticalAlign: 'text-bottom' }} />
                                Team Requests
                            </button>
                        </div>

                        <div className="requests-list">
                            {filteredRequests.length === 0 ? (
                                <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: 20 }}>
                                    No requests found.
                                </div>
                            ) : (
                                filteredRequests.map(req => (
                                    <div key={req.id} className="request-card" onClick={() => handleEdit(req)}>
                                        <div className="request-header">
                                            <span className="request-category">
                                                {categories.find(c => c.id === req.categoryId)?.name || req.categoryId || 'Unknown'}
                                            </span>
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
                    <div className="request-form-container" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 20, cursor: 'pointer' }} onClick={handleBack}>
                            <ArrowLeft size={20} style={{ marginRight: 10 }} />
                            <h3>{currentRequest.id ? 'Edit Request' : 'New Request'}</h3>
                        </div>

                        <div className="request-form">

                            <div className="form-group">
                                <label className="form-label">Category</label>
                                <select
                                    className="form-select"
                                    value={currentRequest.categoryId}
                                    onChange={(e) => updateField('categoryId', e.target.value)}
                                    disabled={listFilter === 'subordinates' || isLoadingCategories || !isEditable}
                                >
                                    {!isLoadingCategories && (
                                        <option value="" disabled>
                                            Select category...
                                        </option>
                                    )}
                                    {isLoadingCategories && <option>Loading...</option>}
                                    {categories.map(cat => (
                                        <option key={cat.id} value={cat.id}>{cat.name}</option>
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
                                    readOnly={listFilter === 'subordinates' || !isEditable}
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Full Description</label>
                                <textarea
                                    className="form-textarea"
                                    value={currentRequest.fullDesc}
                                    onChange={(e) => updateField('fullDesc', e.target.value)}
                                    placeholder="Provide more details..."
                                    readOnly={listFilter === 'subordinates' || !isEditable}
                                />
                            </div>
                        </div>

                        {listFilter === 'my' && isEditable && (
                            <div className="form-actions">
                                <button className="action-btn btn-secondary" onClick={handleSaveForm}>
                                    Save Draft
                                </button>
                                <button className="action-btn btn-primary" onClick={handleSubmitForm}>
                                    Submit Request
                                </button>
                            </div>
                        )}
                        {listFilter === 'my' && !isEditable && (
                            <div className="form-actions">
                                <div style={{
                                    padding: '12px',
                                    background: 'rgba(255, 255, 255, 0.05)',
                                    borderRadius: '8px',
                                    width: '100%',
                                    textAlign: 'center',
                                    color: 'var(--text-secondary)',
                                    fontSize: '14px'
                                }}>
                                    ReadOnly: Request is {currentRequest.status}
                                </div>
                            </div>
                        )}
                        {listFilter === 'subordinates' && (
                            <div className="form-actions">
                                {currentRequest.status === 'new' || currentRequest.status === 'pending' ? (
                                    <>
                                        <button className="action-btn" style={{ backgroundColor: '#ef4444', color: 'white' }} onClick={() => { onReject(currentRequest); setView('list'); }}>
                                            Reject
                                        </button>
                                        <button className="action-btn" style={{ backgroundColor: '#10b981', color: 'white' }} onClick={() => { onApprove(currentRequest); setView('list'); }}>
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


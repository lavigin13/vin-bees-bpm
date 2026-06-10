import React, { useState, useEffect } from 'react';
import { X, Plus, Calendar, FileText, ArrowLeft, Users, User } from 'lucide-react';
import './CraftingModal.css'; // Reusing base modal styles
import './RequestsModal.css';
import { REQUEST_CATEGORIES } from '../data/constants';
import { fetchRequestCategories } from '../services/api';

const RequestsModal = ({ isOpen, onClose, requests = [], onSave, onSubmit, onApprove, onReject, currentUser, initialFilter = 'my', onViewChange }) => {
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
        // eslint-disable-next-line react-hooks/exhaustive-deps -- onViewChange is an inline callback from App; re-run only on open
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
            createdBy: currentUser ? currentUser.id : 999
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
            alert('Потрібно обрати категорію');
            return;
        }
        if (!currentRequest.shortDesc) {
            alert('Потрібно вказати короткий опис');
            return;
        }
        onSave(currentRequest);
        setView('list');
    };

    const handleSubmitForm = () => {
        if (!currentRequest.categoryId) {
            alert('Потрібно обрати категорію');
            return;
        }
        if (!currentRequest.shortDesc) {
            alert('Потрібно вказати короткий опис');
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

    const isOwnRequest = (req) => {
        if (!req || !currentUser) return false;
        return req.createdBy === currentUser.id || req.createdBy === currentUser.name;
    };

    return (
        <div className="modal-overlay" style={{ zIndex: 1150 }}>
            <div className="requests-modal-content">
                <button className="close-btn" onClick={onClose}><X size={24} /></button>

                <div className="requests-header">
                    <h2 className="requests-title">
                        <span style={{ fontSize: 24 }}>🍯</span> Заявки Вулика
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
                                Мої заявки
                            </button>
                            <button
                                className={`toggle-btn ${listFilter === 'subordinates' ? 'active' : ''}`}
                                onClick={() => handleFilterChange('subordinates')}
                            >
                                <Users size={16} style={{ marginRight: 6, verticalAlign: 'text-bottom' }} />
                                Заявки команди
                            </button>
                        </div>

                        <div className="requests-list">
                            {filteredRequests.length === 0 ? (
                                <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: 20 }}>
                                    Заявок не знайдено.
                                </div>
                            ) : (
                                filteredRequests.map(req => (
                                    <div key={req.id} className="request-card" onClick={() => handleEdit(req)}>
                                        <div className="request-header">
                                            <span className="request-category">
                                                {categories.find(c => c.id === req.categoryId)?.name || req.categoryId || 'Невідомо'}
                                            </span>
                                            <span className={`request-status ${req.status}`}>{req.status}</span>
                                        </div>
                                        <div className="request-desc">{req.shortDesc}</div>
                                        <div className="request-meta">
                                            <span><Calendar size={12} /> {req.date}</span>
                                            {listFilter === 'subordinates' && <span>Від: ID #{req.createdBy}</span>}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        {listFilter === 'my' && (
                            <button className="create-request-btn" onClick={handleCreateNew}>
                                <Plus size={20} /> Нова заявка
                            </button>
                        )}
                    </>
                ) : (
                    <div className="request-form-container" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 20, cursor: 'pointer' }} onClick={handleBack}>
                            <ArrowLeft size={20} style={{ marginRight: 10 }} />
                            <h3>{currentRequest.id ? 'Редагування заявки' : 'Нова заявка'}</h3>
                        </div>

                        <div className="request-form">

                            <div className="form-group">
                                <label className="form-label">Категорія</label>
                                <select
                                    className="form-select"
                                    value={currentRequest.categoryId}
                                    onChange={(e) => updateField('categoryId', e.target.value)}
                                    disabled={listFilter === 'subordinates' || isLoadingCategories || !isEditable}
                                >
                                    {!isLoadingCategories && (
                                        <option value="" disabled>
                                            Оберіть категорію...
                                        </option>
                                    )}
                                    {isLoadingCategories && <option>Завантаження...</option>}
                                    {categories.map(cat => (
                                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Короткий опис</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={currentRequest.shortDesc}
                                    onChange={(e) => updateField('shortDesc', e.target.value)}
                                    placeholder="напр. Новий монітор"
                                    readOnly={listFilter === 'subordinates' || !isEditable}
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Повний опис</label>
                                <textarea
                                    className="form-textarea"
                                    value={currentRequest.fullDesc}
                                    onChange={(e) => updateField('fullDesc', e.target.value)}
                                    placeholder="Вкажіть більше деталей..."
                                    readOnly={listFilter === 'subordinates' || !isEditable}
                                />
                            </div>
                        </div>

                        {listFilter === 'my' && isEditable && (
                            <div className="form-actions">
                                <button className="action-btn btn-secondary" onClick={handleSaveForm}>
                                    Зберегти чернетку
                                </button>
                                <button className="action-btn btn-primary" onClick={handleSubmitForm}>
                                    Відправити заявку
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
                                    Тільки читання: Заявка в статусі {currentRequest.status}
                                </div>
                            </div>
                        )}
                        {listFilter === 'subordinates' && (
                            <div className="form-actions">
                                {(currentRequest.status === 'new' || currentRequest.status === 'pending') && !isOwnRequest(currentRequest) ? (
                                    <>
                                        <button className="action-btn" style={{ backgroundColor: '#ef4444', color: 'white' }} onClick={() => { onReject(currentRequest); setView('list'); }}>
                                            Відхилити
                                        </button>
                                        <button className="action-btn" style={{ backgroundColor: '#10b981', color: 'white' }} onClick={() => { onApprove(currentRequest); setView('list'); }}>
                                            Погодити
                                        </button>
                                    </>
                                ) : (currentRequest.status === 'new' || currentRequest.status === 'pending') && isOwnRequest(currentRequest) ? (
                                    <div style={{
                                        padding: '12px',
                                        background: 'rgba(255, 255, 255, 0.05)',
                                        borderRadius: '8px',
                                        width: '100%',
                                        textAlign: 'center',
                                        color: '#fbbf24',
                                        fontSize: '14px'
                                    }}>
                                        Ви не можете погодити власну заявку
                                    </div>
                                ) : (
                                    <button className="action-btn btn-secondary" onClick={handleBack}>
                                        Закрити
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


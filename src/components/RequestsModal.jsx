import React, { useState, useEffect, useRef } from 'react';
import { X, Plus, Calendar, FileText, ArrowLeft, Users, User, Paperclip, Trash2, Download, RefreshCw, Loader2 } from 'lucide-react';
import './CraftingModal.css'; // Reusing base modal styles
import './RequestsModal.css';
import { REQUEST_CATEGORIES } from '../data/constants';
import { fetchRequestCategories } from '../services/api';
import { currentMonthPeriod, toIsoDate } from '../utils/period';
import { fileToBase64, formatSize, downloadBase64File } from '../utils/files';

// Quick status filters for the "Заявки команди" tab. `statuses` lists the raw
// backend statuses each chip matches; 'all' matches everything.
const TEAM_STATUS_FILTERS = [
    { id: 'all',      label: 'Всі',            statuses: null },
    { id: 'pending',  label: 'На погодженні',  statuses: ['new', 'pending'] },
    { id: 'approved', label: 'Погоджені',      statuses: ['approved'] },
    { id: 'rejected', label: 'Відхилені',      statuses: ['rejected'] },
];

const matchesStatusFilter = (req, filterId) => {
    const f = TEAM_STATUS_FILTERS.find(x => x.id === filterId);
    if (!f || !f.statuses) return true;
    return f.statuses.includes(String(req.status || '').toLowerCase());
};

// Raw backend status → Ukrainian label shown on cards; unknown values fall
// back to the raw string so new backend statuses are still visible.
const STATUS_LABELS = {
    draft: 'Чернетка',
    new: 'На погодженні',
    pending: 'На погодженні',
    approved: 'Погоджено',
    rejected: 'Відхилено',
};
const statusLabel = (status) => STATUS_LABELS[String(status || '').toLowerCase()] || String(status || '');

let fileUidCounter = 0;

const RequestsModal = ({ isOpen, onClose, requests = [], onSave, onSubmit, onApprove, onReject, currentUser, colleagues = [], initialFilter = 'my', onViewChange }) => {
    const [view, setView] = useState('list'); // 'list' or 'edit'
    const [listFilter, setListFilter] = useState(initialFilter); // 'my' or 'subordinates'
    const [teamStatusFilter, setTeamStatusFilter] = useState('all'); // id from TEAM_STATUS_FILTERS
    const [currentRequest, setCurrentRequest] = useState(null);
    const [categories, setCategories] = useState(REQUEST_CATEGORIES);
    const [isLoadingCategories, setIsLoadingCategories] = useState(false);
    const [categoriesLoaded, setCategoriesLoaded] = useState(false);
    // Period the list is fetched for (ISO dates); defaults to the current month.
    const [period, setPeriod] = useState(currentMonthPeriod);
    const [isLoadingList, setIsLoadingList] = useState(false);
    const [listError, setListError] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Monotonic id of the latest reload — out-of-order responses from rapid
    // tab/period switches must not overwrite the newest list or spinner state.
    const reloadSeqRef = useRef(0);

    // Ask the parent to (re)load the list for a view + period.
    const reloadList = async (view, nextPeriod) => {
        if (!nextPeriod.startDate || !nextPeriod.endDate) return;
        const seq = ++reloadSeqRef.current;
        setIsLoadingList(true);
        setListError(false);
        try {
            await onViewChange(view, nextPeriod);
            if (seq === reloadSeqRef.current) setIsLoadingList(false);
        } catch (e) {
            console.error('Failed to load requests', e);
            if (seq === reloadSeqRef.current) {
                setIsLoadingList(false);
                setListError(true);
            }
        }
    };

    // Fetch the categories catalog when the modal opens (retried on next open
    // after a failure; the hardcoded fallback stays until the backend answers).
    useEffect(() => {
        if (!isOpen || categoriesLoaded) return;
        let cancelled = false;
        setIsLoadingCategories(true);
        fetchRequestCategories()
            .then(data => {
                if (cancelled) return;
                if (data && Array.isArray(data)) {
                    setCategories(data);
                    setCategoriesLoaded(true);
                }
            })
            .catch(error => console.error('Failed to load categories', error))
            .finally(() => { if (!cancelled) setIsLoadingCategories(false); });
        return () => { cancelled = true; };
    }, [isOpen, categoriesLoaded]);

    // Reset state when modal opens
    useEffect(() => {
        if (isOpen) {
            setView('list');
            setListFilter(initialFilter);
            setTeamStatusFilter('all');
            setCurrentRequest(null);
            // Trigger fetch for initial filter and the current period
            reloadList(initialFilter, period);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps -- onViewChange/period are read at open time; re-run only on open
    }, [isOpen, initialFilter]);

    const handleFilterChange = (newFilter) => {
        setListFilter(newFilter);
        reloadList(newFilter, period);
    };

    const handlePeriodChange = (field, value) => {
        const next = { ...period, [field]: value };
        setPeriod(next);
        reloadList(listFilter, next);
    };

    const handleCreateNew = () => {
        setCurrentRequest({
            id: null,
            status: 'draft',
            date: toIsoDate(new Date()), // local date — toISOString() would shift the day near midnight
            categoryId: '',
            shortDesc: '',
            fullDesc: '',
            files: [],
            createdBy: currentUser?.id ?? null
        });
        setView('edit');
    };

    const handleEdit = (req) => {
        setCurrentRequest(listFilter === 'subordinates' ? req : { ...req });
        setView('edit');
    };

    const handleBack = () => {
        setView('list');
        setCurrentRequest(null);
    };

    const updateField = (field, value) => {
        if (listFilter === 'subordinates') return; // Prevent editing subordinates' requests here
        setCurrentRequest(prev => ({ ...prev, [field]: value }));
    };

    const handleAddFiles = async (e) => {
        const picked = Array.from(e.target.files || []);
        if (picked.length === 0) return;
        try {
            const encoded = await Promise.all(
                picked.map(async (f) => ({
                    _uid: `f_${++fileUidCounter}`,
                    name: f.name,
                    type: f.type,
                    size: f.size,
                    data: await fileToBase64(f), // base64 (without data: prefix), size-capped
                }))
            );
            setCurrentRequest(prev => ({ ...prev, files: [...(prev.files || []), ...encoded] }));
        } catch (err) {
            alert(err.message || 'Не вдалося прочитати файл');
        } finally {
            e.target.value = '';
        }
    };

    const handleRemoveFile = (idx) =>
        setCurrentRequest(prev => ({ ...prev, files: (prev.files || []).filter((_, i) => i !== idx) }));

    const validateForm = () => {
        if (!currentRequest.categoryId) {
            alert('Потрібно обрати категорію');
            return false;
        }
        if (!currentRequest.shortDesc) {
            alert('Потрібно вказати короткий опис');
            return false;
        }
        return true;
    };

    // Await the parent handler and stay on the form when it fails — otherwise
    // the typed request (with attachments) would be silently discarded.
    const runFormAction = async (action) => {
        if (!validateForm() || isSaving) return;
        setIsSaving(true);
        try {
            await action(currentRequest);
            setView('list');
            setCurrentRequest(null);
        } catch {
            // The parent already alerted; keep the form open with the data intact.
        } finally {
            setIsSaving(false);
        }
    };

    const handleSaveForm = () => runFormAction(onSave);
    const handleSubmitForm = () => runFormAction(onSubmit);

    // The list is already scoped by view + period on the server; the team tab
    // additionally narrows it by status on the client.
    const filteredRequests = listFilter === 'subordinates'
        ? requests.filter(r => matchesStatusFilter(r, teamStatusFilter))
        : requests;
    const teamStatusCounts = listFilter === 'subordinates'
        ? Object.fromEntries(TEAM_STATUS_FILTERS.map(f => [f.id, requests.filter(r => matchesStatusFilter(r, f.id)).length]))
        : {};

    // Check if current request is editable (only new/drafts are editable)
    const isEditable = currentRequest && (!currentRequest.id || currentRequest.status === 'draft');

    if (!isOpen) return null;

    // String() comparison — the backend's createdBy type (string vs number) is
    // not guaranteed to match the profile id type.
    const isOwnRequest = (req) => {
        if (!req || !currentUser) return false;
        return String(req.createdBy) === String(currentUser.id) || req.createdBy === currentUser.name;
    };

    // Resolve the author's display name from the colleagues list when the
    // backend sends only an id.
    const authorName = (createdBy) => {
        const match = (colleagues || []).find(c => String(c.id) === String(createdBy));
        return match?.name || (typeof createdBy === 'string' && !/^\d+$/.test(createdBy) ? createdBy : `ID #${createdBy}`);
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

                        <div className="requests-period">
                            <input
                                type="date"
                                className="requests-date-input"
                                value={period.startDate}
                                max={period.endDate || undefined}
                                onChange={(e) => handlePeriodChange('startDate', e.target.value)}
                                title="Початок періоду"
                            />
                            <span className="requests-period-sep">—</span>
                            <input
                                type="date"
                                className="requests-date-input"
                                value={period.endDate}
                                min={period.startDate || undefined}
                                onChange={(e) => handlePeriodChange('endDate', e.target.value)}
                                title="Кінець періоду"
                            />
                            <button
                                type="button"
                                className="requests-refresh"
                                onClick={() => reloadList(listFilter, period)}
                                disabled={isLoadingList}
                                title="Оновити"
                            >
                                <RefreshCw size={15} className={isLoadingList ? 'requests-spin' : ''} />
                            </button>
                        </div>

                        {listFilter === 'subordinates' && (
                            <div className="requests-status-filters">
                                {TEAM_STATUS_FILTERS.map(f => (
                                    <button
                                        key={f.id}
                                        type="button"
                                        className={`requests-status-chip ${f.id} ${teamStatusFilter === f.id ? 'active' : ''}`}
                                        onClick={() => setTeamStatusFilter(f.id)}
                                    >
                                        {f.label}
                                        {!isLoadingList && !listError && (
                                            <span className="requests-status-chip-count">{teamStatusCounts[f.id] ?? 0}</span>
                                        )}
                                    </button>
                                ))}
                            </div>
                        )}

                        <div className="requests-list">
                            {isLoadingList ? (
                                <div className="requests-loading">
                                    <Loader2 size={22} className="requests-spin" />
                                    Завантаження заявок...
                                </div>
                            ) : listError ? (
                                <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: 20 }}>
                                    <div style={{ marginBottom: 12 }}>Не вдалося завантажити заявки.</div>
                                    <button className="requests-refresh" style={{ width: 'auto', padding: '8px 16px' }} onClick={() => reloadList(listFilter, period)}>
                                        Спробувати ще раз
                                    </button>
                                </div>
                            ) : filteredRequests.length === 0 ? (
                                <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: 20 }}>
                                    {listFilter === 'subordinates' && teamStatusFilter !== 'all' && requests.length > 0
                                        ? 'Немає заявок з таким статусом за вибраний період.'
                                        : 'Заявок за вибраний період не знайдено.'}
                                </div>
                            ) : (
                                filteredRequests.map(req => (
                                    <div key={req.id} className="request-card" onClick={() => handleEdit(req)}>
                                        <div className="request-header">
                                            <span className="request-category">
                                                {categories.find(c => c.id === req.categoryId)?.name || req.categoryId || 'Невідомо'}
                                            </span>
                                            <span className={`request-status ${req.status}`}>{statusLabel(req.status)}</span>
                                        </div>
                                        <div className="request-desc">{req.shortDesc}</div>
                                        <div className="request-meta">
                                            <span><Calendar size={12} /> {req.date}</span>
                                            {listFilter === 'subordinates' && <span>Від: {authorName(req.createdBy)}</span>}
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

                            <div className="form-group">
                                <label className="form-label">Прикріплені файли</label>

                                {(currentRequest.files && currentRequest.files.length > 0) ? (
                                    <div className="req-files">
                                        {currentRequest.files.map((f, idx) => (
                                            <div className="req-file-row" key={f._uid || `${f.name}_${f.size}_${idx}`}>
                                                <FileText size={15} className="req-file-icon" />
                                                <span className="req-file-name" title={f.name}>{f.name}</span>
                                                <span className="req-file-size">{formatSize(f.size)}</span>
                                                <button
                                                    type="button"
                                                    className="req-file-btn"
                                                    onClick={() => downloadBase64File(f)}
                                                    title="Завантажити"
                                                >
                                                    <Download size={15} />
                                                </button>
                                                {(listFilter !== 'subordinates' && isEditable) && (
                                                    <button
                                                        type="button"
                                                        className="req-file-btn req-file-remove"
                                                        onClick={() => handleRemoveFile(idx)}
                                                        title="Видалити"
                                                    >
                                                        <Trash2 size={15} />
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="req-files-empty">Файлів немає</div>
                                )}

                                {(listFilter !== 'subordinates' && isEditable) && (
                                    <label className="req-upload-btn">
                                        <Paperclip size={15} />
                                        Додати файли
                                        <input type="file" multiple hidden onChange={handleAddFiles} />
                                    </label>
                                )}
                            </div>
                        </div>

                        {listFilter === 'my' && isEditable && (
                            <div className="form-actions">
                                <button className="action-btn btn-secondary" disabled={isSaving} onClick={handleSaveForm}>
                                    Зберегти чернетку
                                </button>
                                <button className="action-btn btn-primary" disabled={isSaving} onClick={handleSubmitForm}>
                                    {isSaving ? 'Надсилання...' : 'Відправити заявку'}
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
                                    Тільки читання: заявка в статусі «{statusLabel(currentRequest.status)}»
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

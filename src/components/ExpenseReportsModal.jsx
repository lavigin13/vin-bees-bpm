import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
    X, ArrowLeft, Search, Loader2, RefreshCw, Receipt, Plus,
    Paperclip, FileText, Trash2, Eye, Send
} from 'lucide-react';
import './SupplierOrders.css';
import './ExpenseReports.css';
import { fetchIndividualExpenseReports, createIndividualExpenseReport, fetchExpenseArticles } from '../services/api';
import { fileToBase64, formatSize, openBase64File } from '../utils/files';
import { isoToApiDate as toApiDate, toIsoDate as toIso, currentMonthPeriod } from '../utils/period';

// '2026-01-30T00:00:00' → '30.01.2026'
const displayDate = (isoDateTime) => {
    const datePart = (isoDateTime || '').split('T')[0];
    const [y, m, d] = datePart.split('-');
    return y && m && d ? `${d}.${m}.${y}` : (isoDateTime || '—');
};

const formatAmount = (amount) =>
    (Number(amount) || 0).toLocaleString('uk-UA', { maximumFractionDigits: 2 });

const ExpenseReportsModal = ({ isOpen, onClose }) => {
    const [reports, setReports]   = useState([]);
    const [isLoading, setLoading] = useState(false);
    const [loadError, setLoadError] = useState(false);

    // Articles catalog: [{ UUID, Name }]
    const [articles, setArticles]             = useState([]);
    const [articlesLoaded, setArticlesLoaded] = useState(false);

    const [startDate, setStartDate] = useState(() => currentMonthPeriod().startDate);
    const [endDate, setEndDate]     = useState(() => currentMonthPeriod().endDate);
    const [search, setSearch]       = useState('');

    // Monotonic id of the latest list load — rapid period edits must not let an
    // out-of-order response overwrite the newest list.
    const loadSeqRef = useRef(0);

    // view: 'list' | 'create'
    const [view, setView] = useState('list');

    // Create form state
    const [reportDate, setReportDate]   = useState(() => toIso(new Date()));
    const [articleUuid, setArticleUuid] = useState('');
    const [description, setDescription] = useState('');
    const [amount, setAmount]           = useState('');
    const [file, setFile]               = useState(null); // { name, type, size, data }
    const [isSaving, setSaving]         = useState(false);

    const load = useCallback(() => {
        const start = toApiDate(startDate);
        const end = toApiDate(endDate);
        if (!start || !end) return;
        const seq = ++loadSeqRef.current;
        setLoading(true);
        setLoadError(false);
        fetchIndividualExpenseReports(start, end)
            .then(data => {
                if (seq !== loadSeqRef.current) return; // stale response
                setReports(Array.isArray(data) ? data : []);
            })
            .catch(e => {
                if (seq !== loadSeqRef.current) return;
                console.error(e);
                setReports([]);
                setLoadError(true);
            })
            .finally(() => { if (seq === loadSeqRef.current) setLoading(false); });
    }, [startDate, endDate]);

    useEffect(() => {
        if (isOpen) load();
    }, [isOpen, load]);

    // The articles catalog is small and static — load it once until it
    // succeeds (a failed attempt is retried on the next modal open).
    useEffect(() => {
        if (!isOpen || articlesLoaded) return;
        fetchExpenseArticles()
            .then(data => {
                if (Array.isArray(data) && data.length) {
                    setArticles(data);
                    setArticlesLoaded(true);
                }
            })
            .catch(console.error);
    }, [isOpen, articlesLoaded]);

    const visibleReports = useMemo(() => {
        const term = search.trim().toLowerCase();
        return reports
            .filter(r => !r.DeletionMark)
            .filter(r =>
                !term ||
                (r.Description || '').toLowerCase().includes(term) ||
                (r.Article || '').toLowerCase().includes(term)
            )
            .sort((a, b) => (b.Date || '').localeCompare(a.Date || ''));
    }, [reports, search]);

    const totalAmount = useMemo(
        () => visibleReports.reduce((sum, r) => sum + (Number(r.Amount) || 0), 0),
        [visibleReports]
    );

    if (!isOpen) return null;

    const resetCreateForm = () => {
        setReportDate(toIso(new Date()));
        setArticleUuid('');
        setDescription('');
        setAmount('');
        setFile(null);
    };

    const handlePickFile = async (e) => {
        const picked = (e.target.files || [])[0];
        if (!picked) return;
        try {
            setFile({
                name: picked.name,
                type: picked.type,
                size: picked.size,
                data: await fileToBase64(picked),
            });
        } catch (err) {
            alert(err.message || 'Не вдалося прочитати файл');
        } finally {
            e.target.value = '';
        }
    };

    const canSubmit =
        reportDate && articleUuid && description.trim() && Number(amount) > 0 && !isSaving;

    const handleCreate = async () => {
        if (!canSubmit) return;
        setSaving(true);
        try {
            const result = await createIndividualExpenseReport({
                Date: reportDate,
                ArticleUUID: articleUuid,
                Description: description.trim(),
                Amount: Number(amount),
                File: file,
            });
            if (result && result.success === false) {
                alert('Помилка створення: ' + (result.message || result.error || 'Невідома помилка API'));
                return;
            }
            resetCreateForm();
            setView('list');
            load();
        } catch (e) {
            alert('Помилка створення: ' + (e.message || e));
        } finally {
            setSaving(false);
        }
    };

    const handleClose = () => {
        // Don't let a stray overlay tap silently discard a half-filled form.
        const isDirty = view === 'create' && (articleUuid || description.trim() || amount || file);
        if (isDirty && !confirm('Закрити без збереження? Введені дані буде втрачено.')) return;
        setView('list');
        resetCreateForm();
        onClose();
    };

    return (
        <div className="so-overlay" onClick={handleClose}>
            <div className="so-modal" onClick={e => e.stopPropagation()}>
                <div className="so-header">
                    <h3 className="so-title">
                        <Receipt size={18} />
                        {view === 'create' ? 'Новий звіт по витратам' : 'Звіт по витратам'}
                    </h3>
                    <button className="so-close" onClick={handleClose}><X size={20} /></button>
                </div>

                {view === 'list' ? (
                    <>
                        <div className="so-body">
                            {/* Period + search */}
                            <div className="er-filters">
                                <div className="er-period">
                                    <input
                                        type="date"
                                        className="er-date-input"
                                        value={startDate}
                                        onChange={e => setStartDate(e.target.value)}
                                    />
                                    <span className="so-muted">—</span>
                                    <input
                                        type="date"
                                        className="er-date-input"
                                        value={endDate}
                                        onChange={e => setEndDate(e.target.value)}
                                    />
                                    <button className="so-refresh" onClick={load} title="Оновити">
                                        <RefreshCw size={15} />
                                    </button>
                                </div>
                                <div className="so-search">
                                    <Search size={15} />
                                    <input
                                        type="text"
                                        placeholder="Пошук за описом чи статтею..."
                                        value={search}
                                        onChange={e => setSearch(e.target.value)}
                                    />
                                </div>
                            </div>

                            {/* List */}
                            {isLoading ? (
                                <div className="so-loading">
                                    <Loader2 size={22} className="so-spin" />
                                    Завантаження звітів...
                                </div>
                            ) : loadError ? (
                                <div className="so-no-docs">
                                    Не вдалося завантажити звіти.{' '}
                                    <button className="er-file-btn" style={{ display: 'inline-flex', marginLeft: 8 }} onClick={load}>
                                        Спробувати ще раз
                                    </button>
                                </div>
                            ) : visibleReports.length === 0 ? (
                                <div className="so-no-docs">Немає звітів за вибраний період</div>
                            ) : (
                                <div className="er-list">
                                    {visibleReports.map(r => (
                                        <div className="er-card" key={r.UUID}>
                                            <div className="er-card-main">
                                                <div className="er-card-top">
                                                    <span className="er-date">{displayDate(r.Date)}</span>
                                                    <span className={`er-status ${r.Posted ? 'posted' : 'draft'}`}>
                                                        {r.Posted ? 'Проведено' : 'Чернетка'}
                                                    </span>
                                                </div>
                                                <div className="er-desc">{r.Description || '—'}</div>
                                                <div className="er-article">{r.Article || '—'}</div>
                                            </div>
                                            <div className="er-card-side">
                                                <span className="er-amount">{formatAmount(r.Amount)} ₴</span>
                                                {r.File ? (
                                                    <button
                                                        className="er-file-btn"
                                                        onClick={() => openBase64File(r.File)}
                                                        title="Переглянути файл"
                                                    >
                                                        <Eye size={14} /> Файл
                                                    </button>
                                                ) : null}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="so-footer er-footer">
                            <div className="er-total">
                                <span className="so-muted">Разом:</span>
                                <span className="so-strong">{formatAmount(totalAmount)} ₴</span>
                            </div>
                            <button className="so-btn-save" onClick={() => setView('create')}>
                                <Plus size={15} /> Створити
                            </button>
                        </div>
                    </>
                ) : (
                    <>
                        <div className="so-body">
                            <div className="er-form">
                                <label className="er-field">
                                    <span className="so-section-label">Дата</span>
                                    <input
                                        type="date"
                                        className="er-input"
                                        style={{ colorScheme: 'dark' }}
                                        value={reportDate}
                                        onChange={e => setReportDate(e.target.value)}
                                    />
                                </label>

                                <label className="er-field">
                                    <span className="so-section-label">Стаття витрат</span>
                                    <select
                                        className="er-input"
                                        value={articleUuid}
                                        onChange={e => setArticleUuid(e.target.value)}
                                    >
                                        <option value="" disabled>
                                            {articlesLoaded
                                                ? (articles.length ? 'Оберіть статтю...' : 'Каталог статей порожній')
                                                : 'Завантаження статей...'}
                                        </option>
                                        {articles.map(a => (
                                            <option value={a.UUID} key={a.UUID}>{a.Name}</option>
                                        ))}
                                    </select>
                                </label>

                                <label className="er-field">
                                    <span className="so-section-label">Опис</span>
                                    <textarea
                                        className="er-input er-textarea"
                                        rows={3}
                                        placeholder="За що витрачено кошти..."
                                        value={description}
                                        onChange={e => setDescription(e.target.value)}
                                    />
                                </label>

                                <label className="er-field">
                                    <span className="so-section-label">Сума, ₴</span>
                                    <input
                                        type="number"
                                        className="er-input"
                                        min="0"
                                        step="0.01"
                                        placeholder="0.00"
                                        value={amount}
                                        onChange={e => setAmount(e.target.value)}
                                    />
                                </label>

                                <div className="er-field">
                                    <span className="so-section-label">Файл (чек, рахунок)</span>
                                    {file ? (
                                        <div className="so-file-row">
                                            <FileText size={14} className="so-file-icon" />
                                            <span className="so-file-name">{file.name}</span>
                                            <span className="so-file-size">{formatSize(file.size)}</span>
                                            <button className="so-file-remove" onClick={() => setFile(null)}>
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    ) : (
                                        <label className="so-upload-btn">
                                            <Paperclip size={15} />
                                            Додати файл
                                            <input type="file" hidden onChange={handlePickFile} />
                                        </label>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="so-footer">
                            <button className="so-btn-cancel" onClick={() => setView('list')}>
                                <ArrowLeft size={14} /> Назад
                            </button>
                            <button className="so-btn-save" disabled={!canSubmit} onClick={handleCreate}>
                                {isSaving
                                    ? (<><Loader2 size={15} className="so-spin" /> Створення...</>)
                                    : (<><Send size={15} /> Створити</>)}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default ExpenseReportsModal;

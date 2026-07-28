import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    X, ArrowLeft, Search, Loader2, RefreshCw, Receipt, Plus,
    Paperclip, FileText, Trash2, Eye, Send
} from 'lucide-react';
import './SupplierOrders.css';
import './ExpenseReports.css';
import { fetchIndividualExpenseReports, createIndividualExpenseReport } from '../services/api';

// Read a File into a base64 string (strips the "data:*;base64," prefix).
const fileToBase64 = (file) =>
    new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const result = reader.result || '';
            resolve(String(result).split(',')[1] || '');
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });

const formatSize = (bytes) => {
    if (!bytes && bytes !== 0) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

// 'YYYY-MM-DD' (input[type=date]) → 'DD.MM.YYYY' (1C API)
const toApiDate = (isoDate) => {
    const [y, m, d] = (isoDate || '').split('-');
    return y && m && d ? `${d}.${m}.${y}` : '';
};

// '2026-01-30T00:00:00' → '30.01.2026'
const displayDate = (isoDateTime) => {
    const datePart = (isoDateTime || '').split('T')[0];
    const [y, m, d] = datePart.split('-');
    return y && m && d ? `${d}.${m}.${y}` : (isoDateTime || '—');
};

const toIso = (date) => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

const monthStartIso = () => {
    const now = new Date();
    return toIso(new Date(now.getFullYear(), now.getMonth(), 1));
};

const monthEndIso = () => {
    const now = new Date();
    return toIso(new Date(now.getFullYear(), now.getMonth() + 1, 0));
};

const formatAmount = (amount) =>
    (Number(amount) || 0).toLocaleString('uk-UA', { maximumFractionDigits: 2 });

// Detect the MIME type of a bare base64 payload by its magic-number prefix.
const sniffBase64Mime = (base64) => {
    if (base64.startsWith('JVBERi')) return 'application/pdf';
    if (base64.startsWith('/9j/')) return 'image/jpeg';
    if (base64.startsWith('iVBOR')) return 'image/png';
    if (base64.startsWith('R0lGOD')) return 'image/gif';
    return 'application/octet-stream';
};

// Open a report attachment in a new tab. `File` is either a URL or bare base64.
const openReportFile = (fileValue) => {
    if (!fileValue) return;
    if (/^https?:\/\//i.test(fileValue)) {
        window.open(fileValue, '_blank', 'noopener');
        return;
    }
    try {
        const byteChars = atob(fileValue);
        const bytes = new Uint8Array(byteChars.length);
        for (let i = 0; i < byteChars.length; i++) bytes[i] = byteChars.charCodeAt(i);
        const blob = new Blob([bytes], { type: sniffBase64Mime(fileValue) });
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank', 'noopener');
        // Give the new tab time to load the blob before revoking.
        setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (e) {
        alert('Не вдалося відкрити файл: ' + (e.message || e));
    }
};

const DEFAULT_ARTICLES = ['Аутсорс послуги'];

const ExpenseReportsModal = ({ isOpen, onClose }) => {
    const [reports, setReports]   = useState([]);
    const [isLoading, setLoading] = useState(false);

    const [startDate, setStartDate] = useState(monthStartIso);
    const [endDate, setEndDate]     = useState(monthEndIso);
    const [search, setSearch]       = useState('');

    // view: 'list' | 'create'
    const [view, setView] = useState('list');

    // Create form state
    const [article, setArticle]         = useState('');
    const [description, setDescription] = useState('');
    const [amount, setAmount]           = useState('');
    const [file, setFile]               = useState(null); // { name, type, size, data }
    const [isSaving, setSaving]         = useState(false);

    const load = useCallback(() => {
        const start = toApiDate(startDate);
        const end = toApiDate(endDate);
        if (!start || !end) return;
        setLoading(true);
        fetchIndividualExpenseReports(start, end)
            .then(data => setReports(Array.isArray(data) ? data : []))
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [startDate, endDate]);

    useEffect(() => {
        if (isOpen) load();
    }, [isOpen, load]);

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

    const articleOptions = useMemo(() => {
        const seen = new Set(DEFAULT_ARTICLES);
        reports.forEach(r => { if (r.Article) seen.add(r.Article); });
        return Array.from(seen).sort((a, b) => a.localeCompare(b, 'uk'));
    }, [reports]);

    if (!isOpen) return null;

    const resetCreateForm = () => {
        setArticle('');
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
            alert('Не вдалося прочитати файл: ' + (err.message || err));
        } finally {
            e.target.value = '';
        }
    };

    const canSubmit =
        article.trim() && description.trim() && Number(amount) > 0 && !isSaving;

    const handleCreate = async () => {
        if (!canSubmit) return;
        setSaving(true);
        try {
            const result = await createIndividualExpenseReport({
                Article: article.trim(),
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
                                                        onClick={() => openReportFile(r.File)}
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
                                    <span className="so-section-label">Стаття витрат</span>
                                    <input
                                        type="text"
                                        className="er-input"
                                        list="er-article-options"
                                        placeholder="Оберіть або введіть статтю..."
                                        value={article}
                                        onChange={e => setArticle(e.target.value)}
                                    />
                                    <datalist id="er-article-options">
                                        {articleOptions.map(a => <option value={a} key={a} />)}
                                    </datalist>
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

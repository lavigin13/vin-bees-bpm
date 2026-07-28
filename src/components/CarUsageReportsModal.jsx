import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    X, ArrowLeft, Search, Loader2, RefreshCw, Car, Plus,
    Paperclip, FileText, Trash2, Eye, Send, MoveRight
} from 'lucide-react';
import './SupplierOrders.css';
import './ExpenseReports.css';
import './CarUsage.css';
import { fetchCarUsageReports, createCarUsageReport } from '../services/api';

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

// '2026-01-30T00:00:00' or '2026-01-30' → '30.01.2026'
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

const formatKm = (km) =>
    (Number(km) || 0).toLocaleString('uk-UA', { maximumFractionDigits: 1 });

// Detect the MIME type of a bare base64 payload by its magic-number prefix.
const sniffBase64Mime = (base64) => {
    if (base64.startsWith('JVBERi')) return 'application/pdf';
    if (base64.startsWith('/9j/')) return 'image/jpeg';
    if (base64.startsWith('iVBOR')) return 'image/png';
    if (base64.startsWith('R0lGOD')) return 'image/gif';
    return 'application/octet-stream';
};

// Open a report attachment in a new tab. Value is either a URL or bare base64.
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

// GET may return Files: ['base64', ...] or a single File string — normalise.
const reportFiles = (r) => {
    if (Array.isArray(r.Files)) return r.Files.filter(Boolean);
    return r.File ? [r.File] : [];
};

const emptySegment = () => ({ date: toIso(new Date()), pointA: '', pointB: '', km: '' });

const segmentComplete = (s) =>
    s.date && s.pointA.trim() && s.pointB.trim() && Number(s.km) > 0;

const CarUsageReportsModal = ({ isOpen, onClose }) => {
    const [reports, setReports]   = useState([]);
    const [isLoading, setLoading] = useState(false);

    const [startDate, setStartDate] = useState(monthStartIso);
    const [endDate, setEndDate]     = useState(monthEndIso);
    const [search, setSearch]       = useState('');

    // view: 'list' | 'create'
    const [view, setView] = useState('list');

    // Create form state
    const [segments, setSegments] = useState([emptySegment()]);
    const [files, setFiles]       = useState([]); // [{ name, type, size, data }]
    const [isSaving, setSaving]   = useState(false);

    const load = useCallback(() => {
        const start = toApiDate(startDate);
        const end = toApiDate(endDate);
        if (!start || !end) return;
        setLoading(true);
        fetchCarUsageReports(start, end)
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
                (r.Segments || []).some(s =>
                    (s.PointA || '').toLowerCase().includes(term) ||
                    (s.PointB || '').toLowerCase().includes(term)
                )
            )
            .sort((a, b) => (b.Date || '').localeCompare(a.Date || ''));
    }, [reports, search]);

    const totalKm = useMemo(
        () => visibleReports.reduce(
            (sum, r) => sum + (r.Segments || []).reduce((s, seg) => s + (Number(seg.Km) || 0), 0),
            0
        ),
        [visibleReports]
    );

    if (!isOpen) return null;

    const resetCreateForm = () => {
        setSegments([emptySegment()]);
        setFiles([]);
    };

    const updateSegment = (idx, field, value) =>
        setSegments(prev => prev.map((s, i) => (i === idx ? { ...s, [field]: value } : s)));

    const addSegment = () =>
        setSegments(prev => {
            // A new leg usually starts where the previous one ended, on the same day.
            const last = prev[prev.length - 1];
            const next = emptySegment();
            if (last) {
                next.date = last.date;
                next.pointA = last.pointB;
            }
            return [...prev, next];
        });

    const removeSegment = (idx) =>
        setSegments(prev => (prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev));

    const handleAddFiles = async (e) => {
        const picked = Array.from(e.target.files || []);
        if (picked.length === 0) return;
        try {
            const encoded = await Promise.all(
                picked.map(async (f) => ({
                    name: f.name,
                    type: f.type,
                    size: f.size,
                    data: await fileToBase64(f),
                }))
            );
            setFiles(prev => [...prev, ...encoded]);
        } catch (err) {
            alert('Не вдалося прочитати файл: ' + (err.message || err));
        } finally {
            e.target.value = '';
        }
    };

    const handleRemoveFile = (idx) =>
        setFiles(prev => prev.filter((_, i) => i !== idx));

    const draftKm = segments.reduce((sum, s) => sum + (Number(s.km) || 0), 0);
    const canSubmit = segments.length > 0 && segments.every(segmentComplete) && !isSaving;

    const handleCreate = async () => {
        if (!canSubmit) return;
        setSaving(true);
        try {
            const result = await createCarUsageReport({
                Segments: segments.map(s => ({
                    Date: s.date,
                    PointA: s.pointA.trim(),
                    PointB: s.pointB.trim(),
                    Km: Number(s.km),
                })),
                Files: files,
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
                        <Car size={18} />
                        {view === 'create' ? 'Новий звіт по авто' : 'Використання авто'}
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
                                        placeholder="Пошук за маршрутом..."
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
                                    {visibleReports.map(r => {
                                        const segs = r.Segments || [];
                                        const reportKm = segs.reduce((s, seg) => s + (Number(seg.Km) || 0), 0);
                                        const attachments = reportFiles(r);
                                        return (
                                            <div className="er-card" key={r.UUID}>
                                                <div className="er-card-main">
                                                    <div className="er-card-top">
                                                        <span className="er-date">{displayDate(r.Date)}</span>
                                                        <span className={`er-status ${r.Posted ? 'posted' : 'draft'}`}>
                                                            {r.Posted ? 'Проведено' : 'Чернетка'}
                                                        </span>
                                                    </div>
                                                    {segs.map((seg, i) => (
                                                        <div className="cu-seg-line" key={i}>
                                                            <span className="cu-seg-date">{displayDate(seg.Date)}</span>
                                                            <span className="cu-seg-route">
                                                                {seg.PointA} <MoveRight size={12} /> {seg.PointB}
                                                            </span>
                                                            <span className="cu-seg-km">{formatKm(seg.Km)} км</span>
                                                        </div>
                                                    ))}
                                                </div>
                                                <div className="er-card-side">
                                                    <span className="er-amount">{formatKm(reportKm)} км</span>
                                                    {attachments.map((f, i) => (
                                                        <button
                                                            className="er-file-btn"
                                                            key={i}
                                                            onClick={() => openReportFile(f)}
                                                            title="Переглянути файл"
                                                        >
                                                            <Eye size={14} /> Файл{attachments.length > 1 ? ` ${i + 1}` : ''}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        <div className="so-footer er-footer">
                            <div className="er-total">
                                <span className="so-muted">Разом:</span>
                                <span className="so-strong">{formatKm(totalKm)} км</span>
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
                                <div className="er-field">
                                    <span className="so-section-label">Сегменти маршруту</span>
                                    <div className="cu-segments">
                                        {segments.map((s, idx) => (
                                            <div className="cu-segment" key={idx}>
                                                <div className="cu-segment-head">
                                                    <input
                                                        type="date"
                                                        className="er-input cu-seg-date-input"
                                                        style={{ colorScheme: 'dark' }}
                                                        value={s.date}
                                                        onChange={e => updateSegment(idx, 'date', e.target.value)}
                                                    />
                                                    <input
                                                        type="number"
                                                        className="er-input cu-km-input"
                                                        min="0"
                                                        step="0.1"
                                                        placeholder="км"
                                                        value={s.km}
                                                        onChange={e => updateSegment(idx, 'km', e.target.value)}
                                                    />
                                                    <button
                                                        className="so-file-remove"
                                                        onClick={() => removeSegment(idx)}
                                                        disabled={segments.length === 1}
                                                        title="Видалити сегмент"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                                <div className="cu-segment-route">
                                                    <input
                                                        type="text"
                                                        className="er-input"
                                                        placeholder="Точка А"
                                                        value={s.pointA}
                                                        onChange={e => updateSegment(idx, 'pointA', e.target.value)}
                                                    />
                                                    <MoveRight size={14} className="cu-route-arrow" />
                                                    <input
                                                        type="text"
                                                        className="er-input"
                                                        placeholder="Точка Б"
                                                        value={s.pointB}
                                                        onChange={e => updateSegment(idx, 'pointB', e.target.value)}
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <button className="so-upload-btn" onClick={addSegment}>
                                        <Plus size={15} /> Додати сегмент
                                    </button>
                                </div>

                                <div className="er-field">
                                    <span className="so-section-label">Файли (чеки, подорожній лист)</span>
                                    <label className="so-upload-btn">
                                        <Paperclip size={15} />
                                        Додати файли
                                        <input type="file" multiple hidden onChange={handleAddFiles} />
                                    </label>
                                    {files.length > 0 && (
                                        <div className="so-files">
                                            {files.map((f, idx) => (
                                                <div className="so-file-row" key={idx}>
                                                    <FileText size={14} className="so-file-icon" />
                                                    <span className="so-file-name">{f.name}</span>
                                                    <span className="so-file-size">{formatSize(f.size)}</span>
                                                    <button className="so-file-remove" onClick={() => handleRemoveFile(idx)}>
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="so-footer er-footer">
                            <div className="er-total">
                                <span className="so-muted">Разом:</span>
                                <span className="so-strong">{formatKm(draftKm)} км</span>
                            </div>
                            <div className="cu-create-actions">
                                <button className="so-btn-cancel" onClick={() => setView('list')}>
                                    <ArrowLeft size={14} /> Назад
                                </button>
                                <button className="so-btn-save" disabled={!canSubmit} onClick={handleCreate}>
                                    {isSaving
                                        ? (<><Loader2 size={15} className="so-spin" /> Створення...</>)
                                        : (<><Send size={15} /> Створити</>)}
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default CarUsageReportsModal;

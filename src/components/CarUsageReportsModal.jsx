import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    X, ArrowLeft, Loader2, RefreshCw, Car, Plus,
    Paperclip, FileText, Trash2, Eye, Send, Fuel, Gauge
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

const formatNum = (value) =>
    (Number(value) || 0).toLocaleString('uk-UA', { maximumFractionDigits: 1 });

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

const reportKm = (r) => {
    const km = (Number(r.OdometerEnd) || 0) - (Number(r.OdometerStart) || 0);
    return km > 0 ? km : 0;
};

const CarUsageReportsModal = ({ isOpen, onClose }) => {
    const [reports, setReports]   = useState([]);
    const [isLoading, setLoading] = useState(false);

    const [startDate, setStartDate] = useState(monthStartIso);
    const [endDate, setEndDate]     = useState(monthEndIso);

    // view: 'list' | 'create'
    const [view, setView] = useState('list');

    // Create form state
    const [reportDate, setReportDate]       = useState(() => toIso(new Date()));
    const [odometerStart, setOdometerStart] = useState('');
    const [odometerEnd, setOdometerEnd]     = useState('');
    const [refueled, setRefueled]           = useState(false);
    const [fuelLiters, setFuelLiters]       = useState('');
    const [files, setFiles]                 = useState([]); // [{ name, type, size, data }]
    const [isSaving, setSaving]             = useState(false);

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

    const visibleReports = useMemo(
        () => reports
            .filter(r => !r.DeletionMark)
            .sort((a, b) => (b.Date || '').localeCompare(a.Date || '')),
        [reports]
    );

    const totalKm = useMemo(
        () => visibleReports.reduce((sum, r) => sum + reportKm(r), 0),
        [visibleReports]
    );

    if (!isOpen) return null;

    const resetCreateForm = () => {
        setReportDate(toIso(new Date()));
        setOdometerStart('');
        setOdometerEnd('');
        setRefueled(false);
        setFuelLiters('');
        setFiles([]);
    };

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

    const startNum = Number(odometerStart);
    const endNum = Number(odometerEnd);
    const odometersValid =
        odometerStart !== '' && odometerEnd !== '' &&
        startNum >= 0 && endNum > startNum;
    const fuelValid = !refueled || Number(fuelLiters) > 0;
    const canSubmit = reportDate && odometersValid && fuelValid && !isSaving;
    const draftKm = odometersValid ? endNum - startNum : 0;

    const handleCreate = async () => {
        if (!canSubmit) return;
        setSaving(true);
        try {
            const result = await createCarUsageReport({
                Date: reportDate,
                OdometerStart: startNum,
                OdometerEnd: endNum,
                Refueled: refueled,
                FuelLiters: refueled ? Number(fuelLiters) : 0,
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
                            {/* Period */}
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
                                                    <div className="cu-meter-line">
                                                        <Gauge size={13} />
                                                        <span>{formatNum(r.OdometerStart)} → {formatNum(r.OdometerEnd)}</span>
                                                    </div>
                                                    {r.Refueled ? (
                                                        <div className="cu-fuel-line">
                                                            <Fuel size={13} />
                                                            <span>Заправка: {formatNum(r.FuelLiters)} л</span>
                                                        </div>
                                                    ) : null}
                                                </div>
                                                <div className="er-card-side">
                                                    <span className="er-amount">{formatNum(reportKm(r))} км</span>
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
                                <span className="so-strong">{formatNum(totalKm)} км</span>
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

                                <div className="cu-odometers">
                                    <label className="er-field">
                                        <span className="so-section-label">Початковий одометр</span>
                                        <input
                                            type="number"
                                            className="er-input"
                                            min="0"
                                            step="1"
                                            placeholder="км"
                                            value={odometerStart}
                                            onChange={e => setOdometerStart(e.target.value)}
                                        />
                                    </label>
                                    <label className="er-field">
                                        <span className="so-section-label">Кінцевий одометр</span>
                                        <input
                                            type="number"
                                            className="er-input"
                                            min="0"
                                            step="1"
                                            placeholder="км"
                                            value={odometerEnd}
                                            onChange={e => setOdometerEnd(e.target.value)}
                                        />
                                    </label>
                                </div>

                                {odometersValid && (
                                    <div className="so-hint cu-km-hint">
                                        <Gauge size={14} />
                                        Пробіг: <strong>{formatNum(draftKm)} км</strong>
                                    </div>
                                )}

                                <div className="er-field">
                                    <label className="cu-fuel-toggle">
                                        <input
                                            type="checkbox"
                                            checked={refueled}
                                            onChange={e => setRefueled(e.target.checked)}
                                        />
                                        <Fuel size={15} />
                                        <span>Заправлявся</span>
                                    </label>
                                    {refueled && (
                                        <input
                                            type="number"
                                            className="er-input"
                                            min="0"
                                            step="0.01"
                                            placeholder="Кількість літрів"
                                            value={fuelLiters}
                                            onChange={e => setFuelLiters(e.target.value)}
                                        />
                                    )}
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

export default CarUsageReportsModal;

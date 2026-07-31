import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    X, ArrowLeft, Loader2, RefreshCw, Car, Plus,
    Paperclip, FileText, Trash2, Download, Send, Fuel, Gauge, MoveRight
} from 'lucide-react';
import './SupplierOrders.css';
import './ExpenseReports.css';
import './CarUsage.css';
import { fetchCarUsageReports, createCarUsageReport, fetchCars, fetchRoutePoints } from '../services/api';

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

// Trigger a browser download for a base64-encoded attachment
// ({ name, type, size, data }) — same shape as request attachments.
const downloadFile = (f) => {
    if (!f.data) {
        alert('Вміст файлу недоступний для завантаження.');
        return;
    }
    const a = document.createElement('a');
    a.href = `data:${f.type || 'application/octet-stream'};base64,${f.data}`;
    a.download = f.name || 'file';
    document.body.appendChild(a);
    a.click();
    a.remove();
};

const reportKm = (r) => {
    const km = (Number(r.OdometerEnd) || 0) - (Number(r.OdometerStart) || 0);
    return km > 0 ? km : 0;
};

// Catalog items may come as { UUID, Name }, { Id, Name } or plain strings.
const itemId = (item) => item?.UUID || item?.Id || item?.id || '';
const itemName = (item) => (typeof item === 'string' ? item : (item?.Name || item?.name || ''));

const emptySegment = () => ({ pointA: '', pointB: '' });

const CarUsageReportsModal = ({ isOpen, onClose }) => {
    const [reports, setReports]   = useState([]);
    const [isLoading, setLoading] = useState(false);

    const [startDate, setStartDate] = useState(monthStartIso);
    const [endDate, setEndDate]     = useState(monthEndIso);

    // Catalogs (loaded once per modal open)
    const [cars, setCars]                 = useState([]); // [{ UUID, Name, FuelRemainder }]
    const [carsLoaded, setCarsLoaded]     = useState(false);
    const [routePoints, setRoutePoints]   = useState([]); // [{ UUID, Name }] | ['...']
    const [pointsLoaded, setPointsLoaded] = useState(false);

    // view: 'list' | 'create'
    const [view, setView] = useState('list');

    // Create form state
    const [reportDate, setReportDate]           = useState(() => toIso(new Date()));
    const [carUuid, setCarUuid]                 = useState('');
    const [odometerStart, setOdometerStart]     = useState('');
    const [odometerEnd, setOdometerEnd]         = useState('');
    const [refueled, setRefueled]               = useState(false);
    const [fuelLiters, setFuelLiters]           = useState('');
    const [remainderMismatch, setRemainderMismatch] = useState(false);
    const [actualRemainder, setActualRemainder] = useState('');
    const [segments, setSegments]               = useState([emptySegment()]);
    const [comment, setComment]                 = useState('');
    const [files, setFiles]                     = useState([]); // [{ name, type, size, data }]
    const [isSaving, setSaving]                 = useState(false);

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

    useEffect(() => {
        if (!isOpen || carsLoaded) return;
        fetchCars()
            .then(data => {
                setCars(Array.isArray(data) ? data : []);
                setCarsLoaded(true);
            })
            .catch(console.error);
    }, [isOpen, carsLoaded]);

    useEffect(() => {
        if (!isOpen || pointsLoaded) return;
        fetchRoutePoints()
            .then(data => {
                setRoutePoints(Array.isArray(data) ? data : []);
                setPointsLoaded(true);
            })
            .catch(console.error);
    }, [isOpen, pointsLoaded]);

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

    const pointNames = useMemo(
        () => Array.from(new Set(routePoints.map(itemName).filter(Boolean))),
        [routePoints]
    );

    if (!isOpen) return null;

    const selectedCar = cars.find(c => itemId(c) === carUuid);

    const resetCreateForm = () => {
        setReportDate(toIso(new Date()));
        setCarUuid('');
        setOdometerStart('');
        setOdometerEnd('');
        setRefueled(false);
        setFuelLiters('');
        setRemainderMismatch(false);
        setActualRemainder('');
        setSegments([emptySegment()]);
        setComment('');
        setFiles([]);
    };

    const updateSegment = (idx, field, value) =>
        setSegments(prev => prev.map((s, i) => (i === idx ? { ...s, [field]: value } : s)));

    const addSegment = () =>
        setSegments(prev => {
            // The next leg starts where the previous one ended.
            const last = prev[prev.length - 1];
            return [...prev, { pointA: last ? last.pointB : '', pointB: '' }];
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

    const startNum = Number(odometerStart);
    const endNum = Number(odometerEnd);
    const odometersValid =
        odometerStart !== '' && odometerEnd !== '' &&
        startNum >= 0 && endNum > startNum;
    const fuelValid = !refueled || Number(fuelLiters) > 0;
    const segmentsValid = segments.length > 0 && segments.every(s => s.pointA.trim() && s.pointB.trim());
    const remainderValid = !remainderMismatch || (actualRemainder !== '' && Number(actualRemainder) >= 0);
    const canSubmit = reportDate && carUuid && odometersValid && fuelValid && segmentsValid && remainderValid && !isSaving;
    const draftKm = odometersValid ? endNum - startNum : 0;

    // Predicted fuel remainder:
    //   початковий залишок − (дельта одометра × середній розхід / 100) + літри заправки
    const initialRemainder = selectedCar ? Number(selectedCar.FuelRemainder) : NaN;
    const consumption = selectedCar ? Number(selectedCar.FuelConsumption) : NaN;
    const hasPrediction =
        !Number.isNaN(initialRemainder) && !Number.isNaN(consumption) && odometersValid;
    const predictedRemainder = hasPrediction
        ? Math.max(0,
            initialRemainder
            - (draftKm * consumption) / 100
            + (refueled ? (Number(fuelLiters) || 0) : 0))
        : null;

    const handleCreate = async () => {
        if (!canSubmit) return;
        setSaving(true);
        try {
            const result = await createCarUsageReport({
                Date: reportDate,
                CarUUID: carUuid,
                OdometerStart: startNum,
                OdometerEnd: endNum,
                Refueled: refueled,
                FuelLiters: refueled ? Number(fuelLiters) : 0,
                PredictedFuelRemainder: hasPrediction ? Math.round(predictedRemainder * 100) / 100 : null,
                FuelRemainderMismatch: remainderMismatch,
                ActualFuelRemainder: remainderMismatch ? Number(actualRemainder) : null,
                Segments: segments.map(s => ({ PointA: s.pointA.trim(), PointB: s.pointB.trim() })),
                Comment: comment.trim(),
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
                                        const attachments = r.Files || [];
                                        const carName = itemName(r.Car) || r.CarName || '';
                                        const segs = r.Segments || [];
                                        return (
                                            <div className="er-card" key={r.UUID}>
                                                <div className="er-card-main">
                                                    <div className="er-card-top">
                                                        <span className="er-date">{displayDate(r.Date)}</span>
                                                        <span className={`er-status ${r.Posted ? 'posted' : 'draft'}`}>
                                                            {r.Posted ? 'Проведено' : 'Чернетка'}
                                                        </span>
                                                    </div>
                                                    {carName && <div className="cu-car-name">{carName}</div>}
                                                    <div className="cu-meter-line">
                                                        <Gauge size={13} />
                                                        <span>{formatNum(r.OdometerStart)} → {formatNum(r.OdometerEnd)}</span>
                                                    </div>
                                                    {segs.map((seg, i) => (
                                                        <div className="cu-seg-line" key={i}>
                                                            <span className="cu-seg-route">
                                                                {seg.PointA} <MoveRight size={12} /> {seg.PointB}
                                                            </span>
                                                        </div>
                                                    ))}
                                                    {r.Refueled ? (
                                                        <div className="cu-fuel-line">
                                                            <Fuel size={13} />
                                                            <span>Заправка: {formatNum(r.FuelLiters)} л</span>
                                                        </div>
                                                    ) : null}
                                                    {r.Comment && <div className="cu-comment">{r.Comment}</div>}
                                                </div>
                                                <div className="er-card-side">
                                                    <span className="er-amount">{formatNum(reportKm(r))} км</span>
                                                    {attachments.map((f, i) => (
                                                        <button
                                                            className="er-file-btn"
                                                            key={i}
                                                            onClick={() => downloadFile(f)}
                                                            title={f.name || 'Завантажити файл'}
                                                        >
                                                            <Download size={14} />
                                                            <span className="cu-file-name">{f.name || 'Файл'}</span>
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

                                <label className="er-field">
                                    <span className="so-section-label">Авто</span>
                                    <select
                                        className="er-input"
                                        value={carUuid}
                                        onChange={e => setCarUuid(e.target.value)}
                                    >
                                        <option value="" disabled>
                                            {carsLoaded
                                                ? (cars.length ? 'Оберіть авто...' : 'Список авто порожній')
                                                : 'Завантаження авто...'}
                                        </option>
                                        {cars.map(c => (
                                            <option value={itemId(c)} key={itemId(c)}>{itemName(c)}</option>
                                        ))}
                                    </select>
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

                                {/* Fuel remainder: computed from the car's initial remainder
                                    and average consumption, override on mismatch */}
                                {carUuid && (
                                    <div className="er-field">
                                        {hasPrediction ? (
                                            <div className="so-hint cu-km-hint">
                                                <Fuel size={14} />
                                                Прогнозований залишок палива: <strong>{formatNum(predictedRemainder)} л</strong>
                                            </div>
                                        ) : (
                                            <div className="so-hint cu-km-hint">
                                                <Fuel size={14} />
                                                Введіть одометри — залишок палива порахується автоматично
                                            </div>
                                        )}
                                        <label className="cu-fuel-toggle">
                                            <input
                                                type="checkbox"
                                                checked={remainderMismatch}
                                                onChange={e => setRemainderMismatch(e.target.checked)}
                                            />
                                            <span>Залишок не збігається</span>
                                        </label>
                                        {remainderMismatch && (
                                            <input
                                                type="number"
                                                className="er-input"
                                                min="0"
                                                step="0.01"
                                                placeholder="Фактичний залишок, л"
                                                value={actualRemainder}
                                                onChange={e => setActualRemainder(e.target.value)}
                                            />
                                        )}
                                    </div>
                                )}

                                <div className="er-field">
                                    <span className="so-section-label">Сегменти маршруту</span>
                                    <div className="cu-segments">
                                        {segments.map((s, idx) => (
                                            <div className="cu-segment-row" key={idx}>
                                                <input
                                                    type="text"
                                                    className="er-input"
                                                    list="cu-point-options"
                                                    placeholder="Точка А"
                                                    value={s.pointA}
                                                    onChange={e => updateSegment(idx, 'pointA', e.target.value)}
                                                />
                                                <MoveRight size={14} className="cu-route-arrow" />
                                                <input
                                                    type="text"
                                                    className="er-input"
                                                    list="cu-point-options"
                                                    placeholder="Точка Б"
                                                    value={s.pointB}
                                                    onChange={e => updateSegment(idx, 'pointB', e.target.value)}
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
                                        ))}
                                    </div>
                                    <datalist id="cu-point-options">
                                        {pointNames.map(name => <option value={name} key={name} />)}
                                    </datalist>
                                    <button className="so-upload-btn" onClick={addSegment}>
                                        <Plus size={15} /> Додати сегмент
                                    </button>
                                </div>

                                <label className="er-field">
                                    <span className="so-section-label">Коментар</span>
                                    <textarea
                                        className="er-input er-textarea"
                                        rows={2}
                                        placeholder="Необов'язково..."
                                        value={comment}
                                        onChange={e => setComment(e.target.value)}
                                    />
                                </label>

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

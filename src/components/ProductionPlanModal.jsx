import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    X, Loader2, RefreshCw, Factory, ChevronLeft, ChevronRight, Info,
    Search, MessageSquare, Hash
} from 'lucide-react';
import './SupplierOrders.css';
import './ProductionPlan.css';
import { fetchProductionPlan } from '../services/api';

const DAY_NAMES = ['Понеділок', 'Вівторок', 'Середа', 'Четвер', "П'ятниця", 'Субота', 'Неділя'];
const MONTH_NAMES_GEN = [
    'січня', 'лютого', 'березня', 'квітня', 'травня', 'червня',
    'липня', 'серпня', 'вересня', 'жовтня', 'листопада', 'грудня'
];

// Status id (from 1C) → label + css modifier. Unknown ids fall back to the raw value.
const STATUS_META = {
    '':          { label: 'Новий',        cls: 'new' },
    new:         { label: 'Новий',        cls: 'new' },
    confirmed:   { label: 'Підтверджено', cls: 'confirmed' },
    inwork:      { label: 'В роботі',     cls: 'inwork' },
    in_progress: { label: 'В роботі',     cls: 'inwork' },
    done:        { label: 'Виконано',     cls: 'done' },
    completed:   { label: 'Виконано',     cls: 'done' },
    cancelled:   { label: 'Скасовано',    cls: 'cancelled' },
    canceled:    { label: 'Скасовано',    cls: 'cancelled' },
};

const statusMeta = (status) => {
    const key = String(status ?? '').trim().toLowerCase();
    return STATUS_META[key] || { label: String(status), cls: 'other' };
};

const stripTime = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

// Monday of the week that contains `date`.
const weekStartOf = (date) => {
    const d = stripTime(date);
    const dow = (d.getDay() + 6) % 7; // 0 = Monday
    d.setDate(d.getDate() - dow);
    return d;
};

const addDays = (date, days) => {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
};

const toIso = (date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

// Date → 'DD.MM.YYYY' (1C API)
const toApiDate = (date) =>
    `${String(date.getDate()).padStart(2, '0')}.${String(date.getMonth() + 1).padStart(2, '0')}.${date.getFullYear()}`;

// '2026-01-30T00:00:00' | '30.01.2026' → 'YYYY-MM-DD' (day key)
const dayKeyOf = (value) => {
    if (!value) return '';
    const s = String(value);
    if (s.includes('.')) {
        const [d, m, y] = s.split('T')[0].split('.');
        return y && m && d ? `${y}-${m}-${d}` : '';
    }
    return s.split('T')[0];
};

const formatShort = (date) => `${String(date.getDate()).padStart(2, '0')}.${String(date.getMonth() + 1).padStart(2, '0')}`;

const formatWeekLabel = (start) => {
    const end = addDays(start, 6);
    if (start.getMonth() === end.getMonth()) {
        return `${start.getDate()}–${end.getDate()} ${MONTH_NAMES_GEN[end.getMonth()]} ${end.getFullYear()}`;
    }
    return `${start.getDate()} ${MONTH_NAMES_GEN[start.getMonth()]} – ${end.getDate()} ${MONTH_NAMES_GEN[end.getMonth()]} ${end.getFullYear()}`;
};

const formatQuantity = (qty) =>
    (Number(qty) || 0).toLocaleString('uk-UA', { maximumFractionDigits: 3 });

// `Product` may come as a string or as { UUID, Name }.
const productName = (item) => {
    const p = item.Product ?? item.Item ?? item.Nomenclature;
    if (!p) return '—';
    return typeof p === 'string' ? p : (p.Name || p.name || '—');
};

// Everything the full-text search looks at, lower-cased and joined.
const searchHaystack = (item) => [
    productName(item),
    item.WorkFlow,
    item.Comment,
    item.Info,
    item.Unit,
    statusMeta(item.Status).label,
    item.Status,
].filter(Boolean).join(' ').toLowerCase();

const ProductionPlanModal = ({ isOpen, onClose }) => {
    const [weekStart, setWeekStart] = useState(() => weekStartOf(new Date()));
    const [search, setSearch] = useState('');
    // Bumped by the refresh button to re-run the fetch for the same week.
    const [reloadTick, setReloadTick] = useState(0);
    // Last completed fetch: `key` identifies which request produced it, so
    // "loading" is simply "the current request key has no result yet".
    const [result, setResult] = useState({ key: null, items: [], error: '' });

    const requestKey = `${toIso(weekStart)}#${reloadTick}`;

    useEffect(() => {
        if (!isOpen) return;
        let cancelled = false;
        fetchProductionPlan(toApiDate(weekStart), toApiDate(addDays(weekStart, 6)))
            .then(data => {
                if (!cancelled) setResult({ key: requestKey, items: Array.isArray(data) ? data : [], error: '' });
            })
            .catch(e => {
                console.error(e);
                if (!cancelled) setResult({ key: requestKey, items: [], error: 'Не вдалося завантажити план виробництва' });
            });
        return () => { cancelled = true; };
    }, [isOpen, weekStart, requestKey]);

    const load = useCallback(() => setReloadTick(t => t + 1), []);
    const isLoading = result.key !== requestKey;
    const error = isLoading ? '' : result.error;

    // Full-text filter → group by day of the selected week (Mon..Sun order).
    const { days, totalItems, matchedItems } = useMemo(() => {
        const all = (isLoading ? [] : result.items).filter(i => !i.DeletionMark);
        const terms = search.trim().toLowerCase().split(/\s+/).filter(Boolean);
        const matched = terms.length
            ? all.filter(i => { const hay = searchHaystack(i); return terms.every(t => hay.includes(t)); })
            : all;

        const byKey = new Map();
        matched.forEach(i => {
            const key = dayKeyOf(i.Date);
            if (!byKey.has(key)) byKey.set(key, []);
            byKey.get(key).push(i);
        });
        const grouped = Array.from({ length: 7 }, (_, idx) => {
            const date = addDays(weekStart, idx);
            return { date, key: toIso(date), items: byKey.get(toIso(date)) || [] };
        });
        return { days: grouped, totalItems: all.length, matchedItems: matched.length };
    }, [isLoading, result.items, weekStart, search]);

    const todayKey = toIso(new Date());
    const isCurrentWeek = toIso(weekStart) === toIso(weekStartOf(new Date()));

    if (!isOpen) return null;

    return (
        <div className="so-overlay" onClick={onClose}>
            <div className="so-modal" onClick={e => e.stopPropagation()}>
                <div className="so-header">
                    <h3 className="so-title">
                        <Factory size={18} />
                        План виробництва
                    </h3>
                    <button className="so-close" onClick={onClose}><X size={20} /></button>
                </div>

                <div className="so-body">
                    {/* Week switcher */}
                    <div className="pp-week-nav">
                        <button
                            className="pp-week-btn"
                            onClick={() => setWeekStart(addDays(weekStart, -7))}
                            title="Попередній тиждень"
                        >
                            <ChevronLeft size={18} />
                        </button>
                        <div className="pp-week-label">
                            <span className="pp-week-range">{formatWeekLabel(weekStart)}</span>
                            {isCurrentWeek ? (
                                <span className="pp-week-current">Поточний тиждень</span>
                            ) : (
                                <button className="pp-week-today" onClick={() => setWeekStart(weekStartOf(new Date()))}>
                                    До поточного
                                </button>
                            )}
                        </div>
                        <button
                            className="pp-week-btn"
                            onClick={() => setWeekStart(addDays(weekStart, 7))}
                            title="Наступний тиждень"
                        >
                            <ChevronRight size={18} />
                        </button>
                        <button className="so-refresh" onClick={load} title="Оновити">
                            <RefreshCw size={15} />
                        </button>
                    </div>

                    {/* Full-text search */}
                    <div className="so-search pp-search">
                        <Search size={15} />
                        <input
                            type="text"
                            placeholder="Пошук: виріб, № замовлення, коментар, статус..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                        {search ? (
                            <button className="pp-search-clear" onClick={() => setSearch('')} title="Очистити">
                                <X size={14} />
                            </button>
                        ) : null}
                    </div>

                    {isLoading ? (
                        <div className="so-loading">
                            <Loader2 size={22} className="so-spin" />
                            Завантаження плану...
                        </div>
                    ) : error ? (
                        <div className="so-no-docs">{error}</div>
                    ) : totalItems === 0 ? (
                        <div className="so-no-docs">Немає плану на цей тиждень</div>
                    ) : matchedItems === 0 ? (
                        <div className="so-no-docs">Нічого не знайдено за запитом «{search.trim()}»</div>
                    ) : (
                        <div className="pp-days">
                            {days.filter(d => d.items.length > 0).map(d => (
                                <div className="pp-day" key={d.key}>
                                    <div className={`pp-day-header ${d.key === todayKey ? 'today' : ''}`}>
                                        <span className="pp-day-name">{DAY_NAMES[(d.date.getDay() + 6) % 7]}</span>
                                        <span className="pp-day-date">{formatShort(d.date)}</span>
                                        <span className="pp-day-count">{d.items.length}</span>
                                    </div>
                                    <div className="pp-cards">
                                        {d.items.map((item, idx) => {
                                            const plan = Number(item.Quantity) || 0;
                                            const done = Number(item.QuantityDone) || 0;
                                            const pct = plan > 0 ? Math.min(100, Math.round(done / plan * 100)) : 0;
                                            const st = statusMeta(item.Status);
                                            const isDone = plan > 0 && done >= plan;
                                            return (
                                                <div className={`pp-card ${isDone ? 'is-done' : ''}`} key={item.UUID || item.WorkFlow || `${d.key}_${idx}`}>
                                                    <div className="pp-card-top">
                                                        <div className="pp-card-head">
                                                            {item.WorkFlow ? (
                                                                <span className="pp-workflow" title="Номер замовлення">
                                                                    <Hash size={11} />{String(item.WorkFlow).replace(/^0+(?=\d)/, '')}
                                                                </span>
                                                            ) : null}
                                                            <span className={`pp-status ${st.cls}`}>{st.label}</span>
                                                        </div>
                                                        <div className="pp-qty" title="Готово / план">
                                                            <span className={`pp-qty-done ${isDone ? 'ok' : ''}`}>{formatQuantity(done)}</span>
                                                            <span className="pp-qty-sep">/</span>
                                                            <span className="pp-qty-plan">{formatQuantity(plan)}</span>
                                                            {item.Unit ? <span className="pp-unit"> {item.Unit}</span> : null}
                                                        </div>
                                                    </div>

                                                    <div className="pp-product">{productName(item)}</div>

                                                    <div className="pp-progress" title={`${pct}%`}>
                                                        <div className={`pp-progress-bar ${isDone ? 'ok' : ''}`} style={{ width: `${pct}%` }} />
                                                    </div>

                                                    {item.Info ? (
                                                        <div className="pp-note pp-info">
                                                            <Info size={13} className="pp-note-icon" />
                                                            <span>{item.Info}</span>
                                                        </div>
                                                    ) : null}
                                                    {item.Comment ? (
                                                        <div className="pp-note pp-comment">
                                                            <MessageSquare size={13} className="pp-note-icon" />
                                                            <span>{item.Comment}</span>
                                                        </div>
                                                    ) : null}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="so-footer pp-footer">
                    <span className="so-muted">Позицій за тиждень:</span>
                    <span className="so-strong">
                        {search.trim() && !isLoading ? `${matchedItems} з ${totalItems}` : totalItems}
                    </span>
                </div>
            </div>
        </div>
    );
};

export default ProductionPlanModal;

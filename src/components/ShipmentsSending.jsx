import React, { useState, useEffect, useMemo } from 'react';
import { Search, Loader2, Eye, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import './SupplierOrders.css';
import './Shipments.css';
import { fetchShipmentDocuments } from '../services/api';
import ShipmentDocumentDetailModal from './ShipmentDocumentDetailModal';

const MONTH_NAMES = [
    'Січень', 'Лютий', 'Березень', 'Квітень', 'Травень', 'Червень',
    'Липень', 'Серпень', 'Вересень', 'Жовтень', 'Листопад', 'Грудень',
];

// 'YYYY-MM' for the current month
const currentMonthStr = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const shiftMonth = (monthStr, delta) => {
    const [y, m] = monthStr.split('-').map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const monthLabel = (monthStr) => {
    const [y, m] = monthStr.split('-').map(Number);
    return `${MONTH_NAMES[m - 1]} ${y}`;
};

const shipmentStatusName = (status) =>
    status === 'posted' ? 'Проведено' : status === 'draft' ? 'Чернетка' : (status || '—');

const ShipmentsSending = () => {
    const [documents, setDocuments] = useState([]);
    const [isLoading, setLoading]   = useState(true);

    const [month, setMonth]   = useState(currentMonthStr);
    const [search, setSearch] = useState('');

    const [selectedDoc, setSelectedDoc] = useState(null);

    // Refresh handler (event-driven — safe to set loading synchronously).
    const load = () => {
        setLoading(true);
        fetchShipmentDocuments(month)
            .then(({ documents }) => setDocuments(Array.isArray(documents) ? documents : []))
            .catch(console.error)
            .finally(() => setLoading(false));
    };

    // The loading flag is raised in the event handlers (changeMonth / load),
    // never inside the effect — the effect only fetches for the active month.
    useEffect(() => {
        let active = true;
        fetchShipmentDocuments(month)
            .then(({ documents }) => { if (active) setDocuments(Array.isArray(documents) ? documents : []); })
            .catch(console.error)
            .finally(() => { if (active) setLoading(false); });
        return () => { active = false; };
    }, [month]);

    const changeMonth = (delta) => {
        setLoading(true);
        setMonth(m => shiftMonth(m, delta));
    };

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return documents;
        return documents.filter(doc => {
            const haystack = [
                doc.departmentName,
                doc.destination,
                doc.workflow,
                shipmentStatusName(doc.status),
                ...(doc.lines || []).map(l => l.skuName),
            ].filter(Boolean).join(' ').toLowerCase();
            return haystack.includes(q);
        });
    }, [documents, search]);

    const handleSent = () => {
        setSelectedDoc(null);
        load();
    };

    return (
        <div className="so-list-wrap">
            {/* Filters */}
            <div className="so-filters">
                <div className="so-search">
                    <Search size={15} />
                    <input
                        type="text"
                        placeholder="Пошук: підрозділ, напрямок, товар..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
                <div className="so-filter-row">
                    <div className="sh-month-nav">
                        <button className="sh-month-btn" onClick={() => changeMonth(-1)} aria-label="Попередній місяць">
                            <ChevronLeft size={16} />
                        </button>
                        <span className="sh-month-label">{monthLabel(month)}</span>
                        <button className="sh-month-btn" onClick={() => changeMonth(+1)} aria-label="Наступний місяць">
                            <ChevronRight size={16} />
                        </button>
                    </div>
                    <button className="so-refresh" onClick={load} title="Оновити">
                        <RefreshCw size={16} />
                    </button>
                </div>
            </div>

            {/* List */}
            <div className="so-list">
                {isLoading ? (
                    <div className="so-loading"><Loader2 size={18} className="so-spin" /> Завантаження...</div>
                ) : filtered.length === 0 ? (
                    <div className="so-empty">
                        {documents.length === 0
                            ? `Немає документів на відправку за ${monthLabel(month).toLowerCase()}`
                            : 'Нічого не знайдено за фільтрами'}
                    </div>
                ) : (
                    filtered.map(doc => (
                        <div key={doc.Id} className="so-order-card" onClick={() => setSelectedDoc(doc)}>
                            <div className="so-order-left">
                                <div className="so-order-number">{doc.destination || '—'}</div>
                                {doc.departmentName && <div className="so-order-supplier">{doc.departmentName}</div>}
                                <div className="so-order-meta">
                                    {doc.Date && <span>{doc.Date}</span>}
                                    {doc.workflow && <span>· {doc.workflow}</span>}
                                    {(doc.lines?.length > 0) && <span>· {doc.lines.length} поз.</span>}
                                </div>
                            </div>
                            <div className="so-order-right">
                                <span className={`sh-status-badge ${doc.status === 'posted' ? 'posted' : 'draft'}`}>
                                    {shipmentStatusName(doc.status)}
                                </span>
                                <Eye size={15} className="so-muted" />
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* key + conditional mount: attached files must reinitialize for every
                opened document, otherwise files from a previously viewed document
                leak into the next one. */}
            {selectedDoc && (
                <ShipmentDocumentDetailModal
                    key={selectedDoc.Id}
                    isOpen
                    doc={selectedDoc}
                    onClose={() => setSelectedDoc(null)}
                    onSent={handleSent}
                />
            )}
        </div>
    );
};

export default ShipmentsSending;

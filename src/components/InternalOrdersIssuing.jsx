import React, { useState, useEffect, useMemo } from 'react';
import { Search, Loader2, Eye, RefreshCw, CheckCircle, AlertTriangle } from 'lucide-react';
import './InternalOrders.css';
import { fetchInternalOrders } from '../services/api';
import InternalOrderDetailModal from './InternalOrderDetailModal';

const statusKeyOf = (status) =>
    typeof status === 'object' && status ? (status.Id ?? status.Name ?? '') : (status ?? '');
const statusNameOf = (status) =>
    typeof status === 'object' && status ? (status.Name ?? status.Id ?? '') : (status ?? '');
const statusColorOf = (status) =>
    (typeof status === 'object' && status && status.Color) ? status.Color : 'var(--accent-gold)';

const InternalOrdersIssuing = () => {
    const [orders, setOrders]     = useState([]);
    const [statuses, setStatuses] = useState([]);
    const [isLoading, setLoading] = useState(true);

    const [search, setSearch]               = useState('');
    const [statusFilter, setStatusFilter]   = useState('');
    const [warehouseFilter, setWHFilter]    = useState('');

    const [selectedOrder, setSelectedOrder] = useState(null);

    const applyData = ({ orders, statuses }) => {
        setOrders(Array.isArray(orders) ? orders : []);
        setStatuses(Array.isArray(statuses) ? statuses : []);
    };

    const load = () => {
        setLoading(true);
        fetchInternalOrders()
            .then(applyData)
            .catch(console.error)
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        let active = true;
        fetchInternalOrders()
            .then(data => { if (active) applyData(data); })
            .catch(console.error)
            .finally(() => { if (active) setLoading(false); });
        return () => { active = false; };
    }, []);

    const warehouseOptions = useMemo(() => {
        const map = new Map();
        orders.forEach(o => {
            if (o.Warehouse?.Id) map.set(o.Warehouse.Id, o.Warehouse.Name);
        });
        return Array.from(map, ([Id, Name]) => ({ Id, Name }));
    }, [orders]);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        return orders.filter(o => {
            if (statusFilter && statusKeyOf(o.Status) !== statusFilter) return false;
            if (warehouseFilter && o.Warehouse?.Id !== warehouseFilter) return false;
            if (!q) return true;
            const haystack = [
                o.Number,
                o.Requester?.Name,
                o.Warehouse?.Name,
                statusNameOf(o.Status),
                ...(o.Products || []).flatMap(p => [p.Name]),
            ].filter(Boolean).join(' ').toLowerCase();
            return haystack.includes(q);
        });
    }, [orders, search, statusFilter, warehouseFilter]);

    const handleSaved = () => {
        setSelectedOrder(null);
        load();
    };

    return (
        <div className="io-list-wrap">
            {/* Filters */}
            <div className="io-filters">
                <div className="io-search">
                    <Search size={15} />
                    <input
                        type="text"
                        placeholder="Пошук: номер, співробітник, товар..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
                <div className="io-filter-row">
                    <select className="io-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                        <option value="">Всі статуси</option>
                        {statuses.map(s => (
                            <option key={statusKeyOf(s)} value={statusKeyOf(s)}>{statusNameOf(s)}</option>
                        ))}
                    </select>
                    <select className="io-select" value={warehouseFilter} onChange={e => setWHFilter(e.target.value)}>
                        <option value="">Всі склади</option>
                        {warehouseOptions.map(w => (
                            <option key={w.Id} value={w.Id}>{w.Name}</option>
                        ))}
                    </select>
                    <button className="io-refresh" onClick={load} title="Оновити">
                        <RefreshCw size={16} />
                    </button>
                </div>
            </div>

            {/* List */}
            <div className="io-list">
                {isLoading ? (
                    <div className="io-loading"><Loader2 size={18} className="io-spin" /> Завантаження...</div>
                ) : filtered.length === 0 ? (
                    <div className="io-empty">
                        {orders.length === 0 ? 'Немає заявок на видачу' : 'Нічого не знайдено за фільтрами'}
                    </div>
                ) : (
                    filtered.map(o => (
                        <div key={o.Id} className="io-order-card" onClick={() => setSelectedOrder(o)}>
                            <div className="io-order-left">
                                <div className="io-order-number">№{o.Number}</div>
                                {o.Requester?.Name && <div className="io-order-requester">{o.Requester.Name}</div>}
                                <div className="io-order-meta">
                                    {o.Date && <span>{o.Date}</span>}
                                    {o.Warehouse?.Name && <span>· {o.Warehouse.Name}</span>}
                                    {(o.Products?.length > 0) && <span>· {o.Products.length} поз.</span>}
                                    
                                    {/* Manager Approved Badge */}
                                    {o.ManagerApproved ? (
                                        <span className="io-approved-badge approved"><CheckCircle size={10} /> Погоджено</span>
                                    ) : (
                                        <span className="io-approved-badge pending"><AlertTriangle size={10} /> Очікує</span>
                                    )}
                                </div>
                            </div>
                            <div className="io-order-right">
                                <span
                                    className="io-status-badge"
                                    style={{ color: statusColorOf(o.Status), borderColor: statusColorOf(o.Status) }}
                                >
                                    {statusNameOf(o.Status) || '—'}
                                </span>
                                <Eye size={15} className="io-muted" />
                            </div>
                        </div>
                    ))
                )}
            </div>

            <InternalOrderDetailModal
                isOpen={!!selectedOrder}
                order={selectedOrder}
                statuses={statuses}
                onClose={() => setSelectedOrder(null)}
                onSaved={handleSaved}
            />
        </div>
    );
};

export default InternalOrdersIssuing;

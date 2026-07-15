import React, { useState, useEffect, useMemo } from 'react';
import { Search, Loader2, Eye, RefreshCw, Paperclip } from 'lucide-react';
import './SupplierOrders.css';
import { fetchSupplierOrders } from '../services/api';
import SupplierOrderDetailModal from './SupplierOrderDetailModal';

const statusNameOf = (status) =>
    typeof status === 'object' && status ? (status.Name ?? status.Id ?? '') : (status ?? '');
const statusColorOf = (status) =>
    (typeof status === 'object' && status && status.Color) ? status.Color : 'var(--accent-gold)';

const SupplierOrdersReceiving = () => {
    const [orders, setOrders]     = useState([]);
    const [statuses, setStatuses] = useState([]);
    const [isLoading, setLoading] = useState(true);

    const [search, setSearch]               = useState('');
    const [warehouseFilter, setWHFilter]    = useState('');

    const [selectedOrder, setSelectedOrder] = useState(null);

    const applyData = ({ orders, statuses }) => {
        setOrders(Array.isArray(orders) ? orders : []);
        setStatuses(Array.isArray(statuses) ? statuses : []);
    };

    // Refresh handler (event-driven — safe to set loading synchronously).
    const load = () => {
        setLoading(true);
        fetchSupplierOrders()
            .then(applyData)
            .catch(console.error)
            .finally(() => setLoading(false));
    };

    // Initial load. State is only set after the request resolves to avoid a
    // synchronous setState inside the effect body.
    useEffect(() => {
        let active = true;
        fetchSupplierOrders()
            .then(data => { if (active) applyData(data); })
            .catch(console.error)
            .finally(() => { if (active) setLoading(false); });
        return () => { active = false; };
    }, []);

    // Warehouse options derived from loaded orders (no extra API call needed).
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
            if (warehouseFilter && o.Warehouse?.Id !== warehouseFilter) return false;
            if (!q) return true;
            // Full-text: number, supplier, warehouse, product names + articles
            const haystack = [
                o.Number,
                o.Supplier?.Name,
                o.Warehouse?.Name,
                statusNameOf(o.Status),
                ...(o.Products || []).flatMap(p => [p.Name]),
            ].filter(Boolean).join(' ').toLowerCase();
            return haystack.includes(q);
        });
    }, [orders, search, warehouseFilter]);

    const handleSaved = () => {
        setSelectedOrder(null);
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
                        placeholder="Пошук: номер, постачальник, товар..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
                <div className="so-filter-row">
                    <select className="so-select" value={warehouseFilter} onChange={e => setWHFilter(e.target.value)}>
                        <option value="">Всі склади</option>
                        {warehouseOptions.map(w => (
                            <option key={w.Id} value={w.Id}>{w.Name}</option>
                        ))}
                    </select>
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
                        {orders.length === 0 ? 'Немає замовлень для прийому' : 'Нічого не знайдено за фільтрами'}
                    </div>
                ) : (
                    filtered.map(o => (
                        <div key={o.Id} className="so-order-card" onClick={() => setSelectedOrder(o)}>
                            <div className="so-order-left">
                                <div className="so-order-number">№{o.Number}</div>
                                {o.Supplier?.Name && <div className="so-order-supplier">{o.Supplier.Name}</div>}
                                <div className="so-order-meta">
                                    {o.Date && <span>{o.Date}</span>}
                                    {o.Warehouse?.Name && <span>· {o.Warehouse.Name}</span>}
                                    {(o.Products?.length > 0) && <span>· {o.Products.length} поз.</span>}
                                </div>
                            </div>
                            <div className="so-order-right">
                                {o.Files?.length > 0 && (
                                    <span className="so-files-badge"><Paperclip size={12} /> {o.Files.length}</span>
                                )}
                                <span
                                    className="so-status-badge"
                                    style={{ color: statusColorOf(o.Status), borderColor: statusColorOf(o.Status) }}
                                >
                                    {statusNameOf(o.Status) || '—'}
                                </span>
                                <Eye size={15} className="so-muted" />
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* key + conditional mount: React state (received qty, files, status)
                must reinitialize for every opened order, otherwise values from a
                previously viewed order leak into the next one. */}
            {selectedOrder && (
                <SupplierOrderDetailModal
                    key={selectedOrder.Id}
                    isOpen
                    order={selectedOrder}
                    statuses={statuses}
                    onClose={() => setSelectedOrder(null)}
                    onSaved={handleSaved}
                />
            )}
        </div>
    );
};

export default SupplierOrdersReceiving;

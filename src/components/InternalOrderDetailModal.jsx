import React, { useState, useMemo } from 'react';
import { X, ArrowLeft, FileText, Loader2, Plus, Minus, AlertTriangle, CheckCircle } from 'lucide-react';
import './InternalOrders.css';
import { saveInternalOrderIssuing } from '../services/api';

const statusKeyOf = (status) =>
    typeof status === 'object' && status ? (status.Id ?? status.Name ?? '') : (status ?? '');
const statusNameOf = (status) =>
    typeof status === 'object' && status ? (status.Name ?? status.Id ?? '') : (status ?? '');

const InternalOrderDetailModal = ({ isOpen, order, statuses = [], onClose, onSaved }) => {
    const initialStatus = useMemo(() => statusKeyOf(order?.Status), [order]);
    const products = useMemo(() => order?.Products || [], [order]);

    const [statusId, setStatusId] = useState(initialStatus);
    const [isSaving, setIsSaving] = useState(false);
    
    // Default issued qty = requested qty
    const [issued, setIssued] = useState(() => {
        const map = {};
        (order?.Products || []).forEach((p, idx) => {
            map[idx] = (p.CountIssued ?? p.CountRequested) ?? 0;
        });
        return map;
    });

    if (!isOpen || !order) return null;

    const setIssuedQty = (idx, val) => {
        const n = Math.max(0, Number.isNaN(parseFloat(val)) ? 0 : parseFloat(val));
        setIssued(prev => ({ ...prev, [idx]: n }));
    };
    
    const stepIssued = (idx, delta) => {
        setIssued(prev => ({ ...prev, [idx]: Math.max(0, (Number(prev[idx]) || 0) + delta) }));
    };

    const handleSave = async () => {
        if (!statusId) return;
        setIsSaving(true);
        try {
            const payload = {
                id: order.Id,
                status: statusId,
                products: products.map((p, idx) => ({
                    id: p.Id,
                    requested: p.CountRequested,
                    issued: issued[idx] ?? 0,
                })),
            };
            const result = await saveInternalOrderIssuing(payload);
            if (result && result.success === false) {
                alert('Помилка збереження: ' + (result.message || result.error || 'Невідома помилка API'));
            } else {
                onSaved && onSaved();
            }
        } catch (e) {
            alert('Помилка збереження: ' + (e.message || e));
        } finally {
            setIsSaving(false);
        }
    };

    const canSave = !!statusId;
    const isApproved = order.ManagerApproved;

    return (
        <div className="io-overlay" onClick={onClose}>
            <div className="io-modal" onClick={e => e.stopPropagation()}>
                <div className="io-header">
                    <h3 className="io-title">
                        <FileText size={18} />
                        Заявка №{order.Number}
                    </h3>
                    <button className="io-close" onClick={onClose}><X size={20} /></button>
                </div>

                <div className="io-body">
                    {/* Approved Alert */}
                    {!isApproved && (
                        <div className="io-hint" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <AlertTriangle size={16} />
                            <strong>Увага:</strong> Заявка ще не погоджена менеджером.
                        </div>
                    )}
                    {isApproved && (
                        <div className="io-hint" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#34d399', backgroundColor: 'rgba(52,211,153,0.1)', borderColor: 'rgba(52,211,153,0.25)' }}>
                            <CheckCircle size={16} />
                            Заявка погоджена менеджером.
                        </div>
                    )}

                    {/* Order summary */}
                    <div className="io-summary">
                        {order.Date && (
                            <div className="io-summary-row">
                                <span className="io-muted">Дата</span>
                                <span className="io-strong">{order.Date}</span>
                            </div>
                        )}
                        {order.Requester?.Name && (
                            <div className="io-summary-row">
                                <span className="io-muted">Ініціатор</span>
                                <span className="io-strong">{order.Requester.Name}</span>
                            </div>
                        )}
                        {order.Warehouse?.Name && (
                            <div className="io-summary-row">
                                <span className="io-muted">Склад</span>
                                <span className="io-strong">{order.Warehouse.Name}</span>
                            </div>
                        )}
                    </div>

                    {/* Products table */}
                    <div className="io-section">
                        <span className="io-section-label">Товари ({products.length})</span>
                        {products.length === 0 ? (
                            <div className="io-empty">Немає товарів у заявці</div>
                        ) : (
                            <div className="io-table-wrap">
                                <table className="io-table">
                                    <thead>
                                        <tr>
                                            <th>Найменування</th>
                                            <th className="io-num">Запитано</th>
                                            <th className="io-num">Видано</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {products.map((p, idx) => {
                                            const iss = issued[idx] ?? 0;
                                            const mismatch = Number(iss) !== Number(p.CountRequested);
                                            return (
                                                <tr key={p.Id || idx}>
                                                    <td>
                                                        <div className="io-prod-name">{p.Name}</div>
                                                    </td>
                                                    <td className="io-num">
                                                        {p.CountRequested}{p.Unit ? ` ${p.Unit}` : ''}
                                                    </td>
                                                    <td className="io-num">
                                                        <div className={`io-iss-control ${mismatch ? 'mismatch' : ''}`}>
                                                            <button type="button" className="io-iss-btn" onClick={() => stepIssued(idx, -1)}>
                                                                <Minus size={11} />
                                                            </button>
                                                            <input
                                                                type="number"
                                                                className="io-iss-input"
                                                                min={0}
                                                                value={iss}
                                                                onChange={e => setIssuedQty(idx, e.target.value)}
                                                            />
                                                            <button type="button" className="io-iss-btn" onClick={() => stepIssued(idx, +1)}>
                                                                <Plus size={11} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    {/* Status */}
                    <div className="io-section">
                        <span className="io-section-label">Статус</span>
                        {statuses.length === 0 ? (
                            <div className="io-empty">Список статусів недоступний</div>
                        ) : (
                            <select
                                className="io-select"
                                value={statusId}
                                onChange={e => setStatusId(e.target.value)}
                            >
                                <option value="">-- Оберіть статус --</option>
                                {statuses.map(s => (
                                    <option key={statusKeyOf(s)} value={statusKeyOf(s)}>
                                        {statusNameOf(s)}
                                    </option>
                                ))}
                            </select>
                        )}
                    </div>
                </div>

                <div className="io-footer">
                    <button className="io-btn-cancel" onClick={onClose}>
                        <ArrowLeft size={14} /> Закрити
                    </button>
                    <button className="io-btn-save" disabled={!canSave || isSaving} onClick={handleSave}>
                        {isSaving ? (<><Loader2 size={15} className="io-spin" /> Збереження...</>) : 'Видати / Зберегти'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default InternalOrderDetailModal;

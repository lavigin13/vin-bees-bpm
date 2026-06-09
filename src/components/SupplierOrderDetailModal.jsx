import React, { useState, useMemo } from 'react';
import { X, ArrowLeft, Paperclip, FileText, Trash2, FileX, Loader2, Plus, Minus } from 'lucide-react';
import './SupplierOrders.css';
import { saveSupplierOrderReceiving } from '../services/api';

// Read a File into a base64 string (strips the "data:*;base64," prefix).
const fileToBase64 = (file) =>
    new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const result = reader.result || '';
            const base64 = String(result).split(',')[1] || '';
            resolve(base64);
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

const statusKeyOf = (status) =>
    typeof status === 'object' && status ? (status.Id ?? status.Name ?? '') : (status ?? '');
const statusNameOf = (status) =>
    typeof status === 'object' && status ? (status.Name ?? status.Id ?? '') : (status ?? '');

const SupplierOrderDetailModal = ({ isOpen, order, statuses = [], onClose, onSaved }) => {
    const initialStatus = useMemo(() => statusKeyOf(order?.Status), [order]);

    const products = useMemo(() => order?.Products || [], [order]);

    const [statusId, setStatusId]       = useState(initialStatus);
    const [noDocuments, setNoDocuments] = useState(!!order?.NoDocuments);
    const [files, setFiles]             = useState([]); // [{ name, type, size, data }]
    const [isSaving, setIsSaving]       = useState(false);
    // Received quantity per product line — defaults to the ordered quantity.
    const [received, setReceived]       = useState(() => {
        const map = {};
        (order?.Products || []).forEach((p, idx) => {
            map[idx] = (p.Received ?? p.Count) ?? 0;
        });
        return map;
    });

    if (!isOpen || !order) return null;

    const currency = order.Currency || '';

    const setReceivedQty = (idx, val) => {
        const n = Math.max(0, Number.isNaN(parseFloat(val)) ? 0 : parseFloat(val));
        setReceived(prev => ({ ...prev, [idx]: n }));
    };
    const stepReceived = (idx, delta) =>
        setReceived(prev => ({ ...prev, [idx]: Math.max(0, (Number(prev[idx]) || 0) + delta) }));

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
            // Adding files clears the "no documents" flag — they are mutually exclusive.
            setNoDocuments(false);
        } catch (err) {
            alert('Не вдалося прочитати файл: ' + (err.message || err));
        } finally {
            e.target.value = '';
        }
    };

    const handleRemoveFile = (idx) =>
        setFiles(prev => prev.filter((_, i) => i !== idx));

    const handleToggleNoDocs = () => {
        setNoDocuments(prev => {
            const next = !prev;
            if (next) setFiles([]); // marking "no documents" discards attached files
            return next;
        });
    };

    // Business rule: a status change requires either attached files or an explicit
    // "no documents" mark.
    const documentsResolved = files.length > 0 || noDocuments;
    const canSave = !!statusId && documentsResolved;

    const handleSave = async () => {
        if (!canSave) return;
        setIsSaving(true);
        try {
            const payload = {
                id: order.Id,
                status: statusId,
                noDocuments,
                files,
                products: products.map((p, idx) => ({
                    id: p.Id,
                    count: p.Count,
                    received: received[idx] ?? 0,
                })),
            };
            const result = await saveSupplierOrderReceiving(payload);
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

    return (
        <div className="so-overlay" onClick={onClose}>
            <div className="so-modal" onClick={e => e.stopPropagation()}>
                <div className="so-header">
                    <h3 className="so-title">
                        <FileText size={18} />
                        Замовлення №{order.Number}
                    </h3>
                    <button className="so-close" onClick={onClose}><X size={20} /></button>
                </div>

                <div className="so-body">
                    {/* Order summary */}
                    <div className="so-summary">
                        {order.Date && (
                            <div className="so-summary-row">
                                <span className="so-muted">Дата</span>
                                <span className="so-strong">{order.Date}</span>
                            </div>
                        )}
                        {order.Supplier?.Name && (
                            <div className="so-summary-row">
                                <span className="so-muted">Постачальник</span>
                                <span className="so-strong">{order.Supplier.Name}</span>
                            </div>
                        )}
                        {order.Warehouse?.Name && (
                            <div className="so-summary-row">
                                <span className="so-muted">Склад</span>
                                <span className="so-strong">{order.Warehouse.Name}</span>
                            </div>
                        )}
                        {(order.Sum || order.Sum === 0) && (
                            <div className="so-summary-row">
                                <span className="so-muted">Сума</span>
                                <span className="so-strong">{order.Sum} {currency}</span>
                            </div>
                        )}
                    </div>

                    {/* Products table */}
                    <div className="so-section">
                        <span className="so-section-label">Товари ({products.length})</span>
                        {products.length === 0 ? (
                            <div className="so-empty">Немає товарів у замовленні</div>
                        ) : (
                            <div className="so-table-wrap">
                                <table className="so-table">
                                    <thead>
                                        <tr>
                                            <th>Найменування</th>
                                            <th className="so-num">Замовлено</th>
                                            <th className="so-num">Прийнято</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {products.map((p, idx) => {
                                            const rec = received[idx] ?? 0;
                                            const mismatch = Number(rec) !== Number(p.Count);
                                            return (
                                                <tr key={p.Id || idx}>
                                                    <td>
                                                        <div className="so-prod-name">{p.Name}</div>
                                                        <div className="so-prod-article">
                                                            {(p.Price ?? '—')} {currency}/{p.Unit || 'од'}
                                                        </div>
                                                    </td>
                                                    <td className="so-num">
                                                        {p.Count}{p.Unit ? ` ${p.Unit}` : ''}
                                                    </td>
                                                    <td className="so-num">
                                                        <div className={`so-rec-control ${mismatch ? 'mismatch' : ''}`}>
                                                            <button type="button" className="so-rec-btn" onClick={() => stepReceived(idx, -1)}>
                                                                <Minus size={11} />
                                                            </button>
                                                            <input
                                                                type="number"
                                                                className="so-rec-input"
                                                                min={0}
                                                                value={rec}
                                                                onChange={e => setReceivedQty(idx, e.target.value)}
                                                            />
                                                            <button type="button" className="so-rec-btn" onClick={() => stepReceived(idx, +1)}>
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

                    {/* Documents (files) */}
                    <div className="so-section">
                        <span className="so-section-label">Документи</span>

                        <label className={`so-no-docs ${noDocuments ? 'active' : ''}`}>
                            <input type="checkbox" checked={noDocuments} onChange={handleToggleNoDocs} />
                            <FileX size={15} />
                            Документів немає
                        </label>

                        {!noDocuments && (
                            <>
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
                            </>
                        )}
                    </div>

                    {/* Status */}
                    <div className="so-section">
                        <span className="so-section-label">Статус</span>
                        {statuses.length === 0 ? (
                            <div className="so-empty">Список статусів недоступний</div>
                        ) : (
                            <select
                                className="so-select"
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

                    {!documentsResolved && (
                        <div className="so-hint">
                            Додайте файли документів або позначте «Документів немає», щоб зберегти.
                        </div>
                    )}
                </div>

                <div className="so-footer">
                    <button className="so-btn-cancel" onClick={onClose}>
                        <ArrowLeft size={14} /> Закрити
                    </button>
                    <button className="so-btn-save" disabled={!canSave || isSaving} onClick={handleSave}>
                        {isSaving ? (<><Loader2 size={15} className="so-spin" /> Збереження...</>) : 'Зберегти'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SupplierOrderDetailModal;

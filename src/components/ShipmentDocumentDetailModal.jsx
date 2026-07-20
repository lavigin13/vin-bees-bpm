import React, { useState } from 'react';
import { X, ArrowLeft, Paperclip, FileText, Trash2, Loader2, Send, AlertTriangle } from 'lucide-react';
import './SupplierOrders.css';
import './Shipments.css';
import { markShipmentDocumentSent } from '../services/api';

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

const shipmentStatusName = (status) =>
    status === 'posted' ? 'Проведено' : status === 'draft' ? 'Чернетка' : (status || '—');

const ShipmentDocumentDetailModal = ({ isOpen, doc, onClose, onSent }) => {
    const [files, setFiles]       = useState([]); // [{ name, type, size, data }]
    const [isSending, setSending] = useState(false);

    if (!isOpen || !doc) return null;

    const lines = doc.lines || [];
    const isDraft = doc.status === 'draft';

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

    const handleSend = async () => {
        setSending(true);
        try {
            const result = await markShipmentDocumentSent({ id: doc.Id, files });
            if (result && result.success === false) {
                alert('Помилка відправки: ' + (result.message || result.error || 'Невідома помилка API'));
            } else {
                onSent && onSent();
            }
        } catch (e) {
            alert('Помилка відправки: ' + (e.message || e));
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="so-overlay" onClick={onClose}>
            <div className="so-modal" onClick={e => e.stopPropagation()}>
                <div className="so-header">
                    <h3 className="so-title">
                        <Send size={18} />
                        Відправка
                    </h3>
                    <button className="so-close" onClick={onClose}><X size={20} /></button>
                </div>

                <div className="so-body">
                    {/* Draft warning */}
                    {isDraft && (
                        <div className="so-hint" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <AlertTriangle size={16} />
                            <span><strong>Увага:</strong> документ ще не проведено (чернетка).</span>
                        </div>
                    )}

                    {/* Document summary */}
                    <div className="so-summary">
                        {doc.Date && (
                            <div className="so-summary-row">
                                <span className="so-muted">Дата</span>
                                <span className="so-strong">{doc.Date}</span>
                            </div>
                        )}
                        {doc.departmentName && (
                            <div className="so-summary-row">
                                <span className="so-muted">Підрозділ</span>
                                <span className="so-strong">{doc.departmentName}</span>
                            </div>
                        )}
                        {doc.destination && (
                            <div className="so-summary-row">
                                <span className="so-muted">Напрямок</span>
                                <span className="so-strong">{doc.destination}</span>
                            </div>
                        )}
                        {doc.workflow && (
                            <div className="so-summary-row">
                                <span className="so-muted">Процес</span>
                                <span className="so-strong">{doc.workflow}</span>
                            </div>
                        )}
                        <div className="so-summary-row">
                            <span className="so-muted">Статус</span>
                            <span className={`sh-status-badge ${doc.status === 'posted' ? 'posted' : 'draft'}`}>
                                {shipmentStatusName(doc.status)}
                            </span>
                        </div>
                    </div>

                    {/* Lines table */}
                    <div className="so-section">
                        <span className="so-section-label">Товари ({lines.length})</span>
                        {lines.length === 0 ? (
                            <div className="so-empty">Немає товарів у документі</div>
                        ) : (
                            <div className="so-table-wrap">
                                <table className="so-table">
                                    <thead>
                                        <tr>
                                            <th>Найменування</th>
                                            <th className="so-num">Кількість</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {lines.map((l, idx) => (
                                            <tr key={l.skuId || idx}>
                                                <td><div className="so-prod-name">{l.skuName}</div></td>
                                                <td className="so-num">{l.quantity}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    {/* Attachments */}
                    <div className="so-section">
                        <span className="so-section-label">Файли</span>

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

                <div className="so-footer">
                    <button className="so-btn-cancel" onClick={onClose}>
                        <ArrowLeft size={14} /> Закрити
                    </button>
                    <button className="so-btn-save" disabled={isSending} onClick={handleSend}>
                        {isSending
                            ? (<><Loader2 size={15} className="so-spin" /> Відправка...</>)
                            : (<><Send size={15} /> Відправлено</>)}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ShipmentDocumentDetailModal;

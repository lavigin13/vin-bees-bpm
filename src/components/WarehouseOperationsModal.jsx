import React, { useState, useEffect, useMemo } from 'react';
import { X, Plus, Minus, ArrowLeft, Loader2, Warehouse, Eye, Package } from 'lucide-react';
import './WarehouseOperationsModal.css';
import NomenclaturePickerModal from './NomenclaturePickerModal';
import SpecPickerModal from './SpecPickerModal';
import {
    fetchWarehouseOperations,
    fetchWarehouses,
    saveWarehouseOperation,
    fetchProfile,
    fetchColleagues
} from '../services/api';

const OPERATION_TYPES = [
    { key: 'Writeoff',          label: 'Write-off' },
    { key: 'Movement',          label: 'Movement' },
    { key: 'ProductionRequest', label: 'Production Request' },
];

const STATUS_LABEL = {
    New:         'New',
    Cancelled:   'Cancelled',
    Confirmed:   'Confirmed',
};

const OP_LABEL = {
    Movement:          'Movement',
    Writeoff:          'Write-off',
    ProductionRequest: 'Production Request',
};

function getCurrentMonth() {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
}

// ─────────────────────────────────────────
//  Document list screen
// ─────────────────────────────────────────
const DocListScreen = ({ month, onMonthChange, docs, isLoading, onCreate, onView }) => (
    <>
        <div className="wh-ops-month-row">
            <label className="wh-form-label" style={{ whiteSpace: 'nowrap' }}>Month:</label>
            <input
                type="month"
                className="wh-ops-month-input"
                value={month}
                onChange={e => onMonthChange(e.target.value)}
            />
        </div>

        <div className="wh-ops-list">
            {isLoading ? (
                <div className="wh-loading"><Loader2 size={18} className="spin" /> Loading...</div>
            ) : docs.length === 0 ? (
                <div className="wh-ops-empty">No documents for this month</div>
            ) : (
                docs.map(doc => {
                    const statusKey = doc.Status || 'New';
                    return (
                        <div
                            key={doc.Id}
                            className="wh-ops-doc-card wh-ops-doc-card--clickable"
                            onClick={() => onView(doc)}
                        >
                            <div className="wh-ops-doc-left">
                                <div className="wh-ops-doc-number">#{doc.Number}</div>
                                <div className="wh-ops-doc-op">{OP_LABEL[doc.Operation] || doc.Operation}</div>
                                <div className="wh-ops-doc-date">{doc.Date}</div>
                                <div style={{ fontSize: '0.8rem', color: '#9ca3af', marginTop: 4 }}>
                                    {doc.Warehouse?.Name && <div>Відвантажив: {doc.Warehouse.Name}</div>}
                                    {doc.Operation === 'Movement' && doc.TargetWarehouse?.Name && <div>Отримав: {doc.TargetWarehouse.Name}</div>}
                                    {doc.Individual?.Name && <div>Відповідальний: {doc.Individual.Name}</div>}
                                </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div className={`wh-ops-doc-status ${statusKey.replace(' ', '_')}`}>
                                    {STATUS_LABEL[statusKey] || statusKey}
                                </div>
                                <Eye size={15} color="var(--text-secondary)" />
                            </div>
                        </div>
                    );
                })
            )}
        </div>

        <button className="wh-ops-create-btn" onClick={onCreate}>
            <Plus size={18} />
            New Document
        </button>
    </>
);

// ─────────────────────────────────────────
//  View existing document screen
// ─────────────────────────────────────────
const ViewDocScreen = ({ doc, profile, onBack, onEdit, onUpdateStatus }) => {
    const statusKey = doc.Status || 'New';
    const canChangeStatus = profile && doc.Individual && 
        (String(doc.Individual.Id).toLowerCase() === String(profile.id || profile.Id).toLowerCase());
    return (
        <div className="wh-ops-form">
            <button className="wh-ops-back-btn" onClick={onBack}>
                <ArrowLeft size={14} /> Back to list
            </button>

            {/* Document info */}
            <div className="wh-doc-view-header">
                <div className="wh-doc-view-row">
                    <span className="wh-form-label">Document #</span>
                    <span className="wh-doc-view-val">{doc.Number}</span>
                </div>
                <div className="wh-doc-view-row">
                    <span className="wh-form-label">Date</span>
                    <span className="wh-doc-view-val">{doc.Date}</span>
                </div>
                <div className="wh-doc-view-row">
                    <span className="wh-form-label">Operation</span>
                    <span className="wh-doc-view-val">{OP_LABEL[doc.Operation] || doc.Operation}</span>
                </div>
                <div className="wh-doc-view-row">
                    <span className="wh-form-label">Status</span>
                    <span className={`wh-ops-doc-status ${statusKey.replace(' ', '_')}`} style={{ fontSize: 13 }}>
                        {STATUS_LABEL[statusKey] || statusKey}
                    </span>
                </div>
                {doc.Warehouse?.Name && (
                    <div className="wh-doc-view-row">
                        <span className="wh-form-label">Warehouse (From)</span>
                        <span className="wh-doc-view-val">{doc.Warehouse.Name}</span>
                    </div>
                )}
                {doc.Operation === 'Movement' && doc.TargetWarehouse?.Name && (
                    <div className="wh-doc-view-row">
                        <span className="wh-form-label">Destination (To)</span>
                        <span className="wh-doc-view-val">{doc.TargetWarehouse.Name}</span>
                    </div>
                )}
                {doc.Individual?.Name && (
                    <div className="wh-doc-view-row">
                        <span className="wh-form-label">Responsible</span>
                        <span className="wh-doc-view-val">{doc.Individual.Name}</span>
                    </div>
                )}
                {doc.Operation === 'Movement' && doc.TargetIndividual?.Name && (
                    <div className="wh-doc-view-row">
                        <span className="wh-form-label">Responsible Receiver</span>
                        <span className="wh-doc-view-val">{doc.TargetIndividual.Name}</span>
                    </div>
                )}
            </div>

            {/* Products */}
            <div className="wh-form-group">
                <span className="wh-form-label">
                    Products ({(doc.Products || []).length})
                </span>
                {(!doc.Products || doc.Products.length === 0) ? (
                    <div className="wh-loading">No products in this document</div>
                ) : (
                    <div className="wh-view-products">
                        {doc.Products.map((p, idx) => (
                            <div key={p.Id || idx} className="wh-view-product-row">
                                <span className="wh-view-product-name">{p.Name}</span>
                                <span className="wh-view-product-qty">× {p.Count}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {canChangeStatus && statusKey === 'New' && (
                <div className="wh-form-group" style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                    <button className="wh-btn-save" style={{ flex: 1, backgroundColor: '#10b981', color: '#fff' }} onClick={() => onUpdateStatus('Confirmed')}>Confirm</button>
                    <button className="wh-btn-cancel" style={{ flex: 1, backgroundColor: '#ef4444', color: '#fff', border: 'none' }} onClick={() => onUpdateStatus('Cancelled')}>Cancel</button>
                </div>
            )}

            <div className="wh-form-footer" style={{ marginTop: 20 }}>
                <button className="wh-btn-cancel" style={{ flex: 1 }} onClick={onBack}>Close</button>
                {statusKey !== 'Confirmed' && (
                    <button className="wh-btn-save" style={{ flex: 1 }} onClick={() => onEdit(doc)}>Edit</button>
                )}
            </div>
        </div>
    );
};

// ─────────────────────────────────────────
//  Create / Edit form screen
// ─────────────────────────────────────────
const CreateScreen = ({ initialDoc, onBack, onSaved }) => {
    const isEdit = !!initialDoc;
    const isProduction = (op) => op === 'ProductionRequest';

    const [opType, setOpType] = useState(initialDoc ? initialDoc.Operation : null);
    const [warehouses, setWarehouses] = useState([]);
    const [warehouseId, setWarehouseId] = useState(
        initialDoc?.Warehouse?.Id || initialDoc?.Warehouse?.id || ''
    );
    const [targetWarehouseId, setTargetWarehouseId] = useState(
        initialDoc?.TargetWarehouse?.Id || initialDoc?.TargetWarehouse?.id || ''
    );
    const [loadingWH, setLoadingWH] = useState(false);

    const [colleagues, setColleagues] = useState([]);
    const [loadingColleagues, setLoadingColleagues] = useState(false);
    const [recipientId, setRecipientId] = useState(
        initialDoc?.TargetIndividual?.Id || initialDoc?.TargetIndividual?.id || ''
    );

    // Nomenclature items selected for Writeoff / Movement
    const [selectedItems, setSelectedItems] = useState(() => {
        if (!initialDoc?.Products || isProduction(initialDoc.Operation)) return [];
        return initialDoc.Products.map(p => ({
            id: p.Id, name: p.Name, qty: p.Count, maxQty: p.Count || 99999
        }));
    });

    // Specifications selected for ProductionRequest (full objects with components and qty).
    // For edit mode we seed only id/name/qty — components remain empty until the user opens
    // the picker, which loads full spec data and replaces these stubs via reconciliation.
    const [selectedSpecs, setSelectedSpecs] = useState(() => {
        if (!initialDoc?.Products || !isProduction(initialDoc.Operation)) return [];
        return initialDoc.Products.map(p => ({
            IdParent: p.Id,
            NameParent: p.Name,
            Сomponents: [],
            qty: p.Count
        }));
    });

    const [isSaving, setIsSaving] = useState(false);
    const [pickerOpen, setPickerOpen] = useState(false);

    useEffect(() => {
        setLoadingWH(true);
        fetchWarehouses().then(data => setWarehouses(data || [])).finally(() => setLoadingWH(false));
        setLoadingColleagues(true);
        fetchColleagues().then(data => setColleagues(data || [])).finally(() => setLoadingColleagues(false));
    }, []);

    const handleOpTypeChange = (key) => {
        if (opType === key) return;
        setOpType(key);
        setWarehouseId('');
        setTargetWarehouseId('');
        setRecipientId('');
        setSelectedItems([]);
        setSelectedSpecs([]);
    };

    const handleWarehouseChange = (newId) => {
        if (newId === warehouseId) return;
        setWarehouseId(newId);
        // Different warehouse → previous picks are no longer valid
        setSelectedItems([]);
        setSelectedSpecs([]);
    };

    // Aggregated component preview from selected specs (sums identical components across specs)
    const aggregatedItems = useMemo(() => {
        const agg = {};
        selectedSpecs.forEach(spec => {
            (spec.Сomponents || []).forEach(comp => {
                if (!comp.Id) return;
                if (!agg[comp.Id]) {
                    agg[comp.Id] = { id: comp.Id, name: comp.Name, qty: 0, maxQty: comp.Count };
                }
                agg[comp.Id].qty += (comp.CountСomponent || 1) * (spec.qty || 1);
            });
        });
        return Object.values(agg);
    }, [selectedSpecs]);

    // ── Picker confirm handlers (preserve existing qty for items that stay selected) ──
    const handleNomenclatureConfirm = (pickedItems) => {
        const existing = new Map(selectedItems.map(i => [i.id, i]));
        const reconciled = pickedItems.map(p => {
            const prev = existing.get(p.id);
            return {
                id: p.id,
                name: p.name,
                qty: prev ? prev.qty : 1,
                maxQty: p.count || 99999,
            };
        });
        setSelectedItems(reconciled);
        setPickerOpen(false);
    };

    const handleSpecConfirm = (pickedSpecs) => {
        const existing = new Map(selectedSpecs.map(s => [s.IdParent, s]));
        const reconciled = pickedSpecs.map(p => ({
            ...p,
            qty: existing.get(p.IdParent)?.qty ?? 1,
        }));
        setSelectedSpecs(reconciled);
        setPickerOpen(false);
    };

    // ── Selected items qty controls (Writeoff / Movement) ──
    const handleQtyChange = (id, delta) =>
        setSelectedItems(prev => prev.map(i =>
            i.id === id ? { ...i, qty: Math.max(1, i.qty + delta) } : i
        ));
    const handleQtyInput = (id, val) => {
        const n = parseInt(val);
        if (!isNaN(n)) setSelectedItems(prev => prev.map(i =>
            i.id === id ? { ...i, qty: Math.max(1, n) } : i
        ));
    };
    const handleRemoveItem = (id) =>
        setSelectedItems(prev => prev.filter(i => i.id !== id));

    // ── Selected specs qty controls (ProductionRequest) ──
    const handleSpecQtyChange = (id, delta) =>
        setSelectedSpecs(prev => prev.map(s =>
            s.IdParent === id ? { ...s, qty: Math.max(1, s.qty + delta) } : s
        ));
    const handleSpecQtyInput = (id, val) => {
        const n = parseInt(val);
        if (!isNaN(n)) setSelectedSpecs(prev => prev.map(s =>
            s.IdParent === id ? { ...s, qty: Math.max(1, n) } : s
        ));
    };
    const handleRemoveSpec = (id) =>
        setSelectedSpecs(prev => prev.filter(s => s.IdParent !== id));

    const hasSelection = isProduction(opType)
        ? selectedSpecs.length > 0
        : selectedItems.length > 0;

    const canSave = opType && (warehouseId || isEdit) && hasSelection &&
        (opType !== 'Movement' || targetWarehouseId || isEdit);

    const handleSave = async () => {
        if (!canSave) return;
        setIsSaving(true);
        try {
            const today = new Date().toISOString().split('T')[0];
            const payload = {
                id: initialDoc ? initialDoc.Id : '',
                date: initialDoc?.Date || today,
                Warehouse: warehouseId,
                TargetWarehouse: opType === 'Movement' ? targetWarehouseId : '',
                Recipient: opType === 'Movement' ? recipientId : '',
                Operation: opType,
                Status: initialDoc ? initialDoc.Status : 'New',
                products: isProduction(opType)
                    ? selectedSpecs.map(s => ({ id: s.IdParent, count: s.qty }))
                    : selectedItems.map(i => ({ id: i.id, count: i.qty }))
            };
            const result = await saveWarehouseOperation(payload);

            if (result && result.success === false) {
                alert('Error saving document: ' + (result.message || result.error || 'Unknown API error'));
            } else {
                alert('Document saved!');
                onSaved();
            }
        } catch (e) {
            alert('Save error: ' + (e.message || e));
        } finally {
            setIsSaving(false);
        }
    };

    const pickerLabel = isProduction(opType) ? 'Select specifications' : 'Add items';

    return (
        <div className="wh-ops-form">
            <button className="wh-ops-back-btn" onClick={onBack}>
                <ArrowLeft size={14} /> Back to list
            </button>

            {/* Operation type */}
            <div className="wh-form-group">
                <span className="wh-form-label">Operation Type</span>
                <div className="wh-op-pills">
                    {OPERATION_TYPES.map(op => (
                        <button
                            key={op.key}
                            className={`wh-op-pill ${opType === op.key ? 'active' : ''}`}
                            onClick={() => handleOpTypeChange(op.key)}
                        >
                            {op.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Warehouse */}
            {opType && (
                <div className="wh-form-group">
                    <span className="wh-form-label">Warehouse (From)</span>
                    {loadingWH ? (
                        <div className="wh-loading"><Loader2 size={14} /> Loading...</div>
                    ) : (
                        <select
                            className="wh-form-select"
                            value={warehouseId}
                            onChange={e => handleWarehouseChange(e.target.value)}
                        >
                            <option value="">-- Select warehouse --</option>
                            {warehouses.map(w => (
                                <option key={w.Id || w.id} value={w.Id || w.id}>
                                    {w.Name || w.name}
                                </option>
                            ))}
                        </select>
                    )}
                </div>
            )}

            {/* Target Warehouse (Only for Movement) */}
            {opType === 'Movement' && (
                <div className="wh-form-group">
                    <span className="wh-form-label">Destination Warehouse (To)</span>
                    {loadingWH ? (
                        <div className="wh-loading"><Loader2 size={14} /> Loading...</div>
                    ) : (
                        <select
                            className="wh-form-select"
                            value={targetWarehouseId}
                            onChange={e => setTargetWarehouseId(e.target.value)}
                        >
                            <option value="">-- Select destination warehouse --</option>
                            {warehouses.map(w => (
                                <option key={w.Id || w.id} value={w.Id || w.id}>
                                    {w.Name || w.name}
                                </option>
                            ))}
                        </select>
                    )}
                </div>
            )}

            {/* Recipient — only for Movement, optional */}
            {opType === 'Movement' && (
                <div className="wh-form-group">
                    <span className="wh-form-label">
                        Recipient (To)
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginLeft: 6 }}>(optional)</span>
                    </span>
                    {loadingColleagues ? (
                        <div className="wh-loading"><Loader2 size={14} /> Loading...</div>
                    ) : (
                        <select
                            className="wh-form-select"
                            value={recipientId}
                            onChange={e => setRecipientId(e.target.value)}
                        >
                            <option value="">-- Not specified --</option>
                            {colleagues.map(c => (
                                <option key={c.id || c.Id} value={c.id || c.Id}>
                                    {c.name || c.Name}
                                </option>
                            ))}
                        </select>
                    )}
                </div>
            )}

            {/* Open picker button */}
            {opType && warehouseId && (
                <div className="wh-form-group">
                    <button
                        type="button"
                        className="wh-btn-save"
                        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                        onClick={() => setPickerOpen(true)}
                    >
                        <Package size={16} />
                        {hasSelection ? 'Edit selection' : pickerLabel}
                    </button>
                </div>
            )}

            {/* Selected Specifications (ProductionRequest) */}
            {isProduction(opType) && selectedSpecs.length > 0 && (
                <div className="wh-form-group">
                    <span className="wh-form-label">Selected Specifications ({selectedSpecs.length})</span>
                    <div className="wh-selected-items">
                        {selectedSpecs.map(spec => (
                            <div key={spec.IdParent} className="wh-selected-item">
                                <span className="wh-selected-item-name">{spec.NameParent}</span>
                                <div className="wh-qty-control">
                                    <button className="wh-qty-btn" onClick={() => handleSpecQtyChange(spec.IdParent, -1)}>
                                        <Minus size={10} />
                                    </button>
                                    <input
                                        type="number"
                                        className="wh-qty-input"
                                        value={spec.qty}
                                        min={1}
                                        onChange={e => handleSpecQtyInput(spec.IdParent, e.target.value)}
                                    />
                                    <button className="wh-qty-btn" onClick={() => handleSpecQtyChange(spec.IdParent, +1)}>
                                        <Plus size={10} />
                                    </button>
                                </div>
                                <button className="wh-remove-btn" onClick={() => handleRemoveSpec(spec.IdParent)}>
                                    <X size={14} />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Components Preview (read-only, ProductionRequest only) */}
            {isProduction(opType) && aggregatedItems.length > 0 && (
                <div className="wh-form-group">
                    <span className="wh-form-label">Components Preview ({aggregatedItems.length})</span>
                    <div className="wh-view-products">
                        {aggregatedItems.map(item => (
                            <div key={item.id} className="wh-view-product-row">
                                <span className="wh-view-product-name">{item.name}</span>
                                <span className="wh-view-product-qty">× {item.qty}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Document Lines (Writeoff / Movement) */}
            {!isProduction(opType) && selectedItems.length > 0 && (
                <div className="wh-form-group">
                    <span className="wh-form-label">Document Lines ({selectedItems.length})</span>
                    <div className="wh-selected-items">
                        {selectedItems.map(item => (
                            <div key={item.id} className="wh-selected-item">
                                <span className="wh-selected-item-name">{item.name}</span>
                                <div className="wh-qty-control">
                                    <button className="wh-qty-btn" onClick={() => handleQtyChange(item.id, -1)}>
                                        <Minus size={10} />
                                    </button>
                                    <input
                                        type="number"
                                        className="wh-qty-input"
                                        value={item.qty}
                                        min={1}
                                        onChange={e => handleQtyInput(item.id, e.target.value)}
                                    />
                                    <button className="wh-qty-btn" onClick={() => handleQtyChange(item.id, +1)}>
                                        <Plus size={10} />
                                    </button>
                                </div>
                                <button className="wh-remove-btn" onClick={() => handleRemoveItem(item.id)}>
                                    <X size={14} />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="wh-form-footer">
                <button className="wh-btn-cancel" onClick={onBack}>Cancel</button>
                <button
                    className="wh-btn-save"
                    disabled={!canSave || isSaving}
                    onClick={handleSave}
                >
                    {isSaving ? 'Saving...' : 'Save'}
                </button>
            </div>

            {/* Picker modals (one is rendered at a time depending on opType) */}
            {isProduction(opType) ? (
                <SpecPickerModal
                    isOpen={pickerOpen}
                    warehouseId={warehouseId}
                    currentSelectedIds={selectedSpecs.map(s => s.IdParent)}
                    onClose={() => setPickerOpen(false)}
                    onConfirm={handleSpecConfirm}
                />
            ) : (
                <NomenclaturePickerModal
                    isOpen={pickerOpen}
                    warehouseId={warehouseId}
                    currentSelectedIds={selectedItems.map(i => i.id)}
                    onClose={() => setPickerOpen(false)}
                    onConfirm={handleNomenclatureConfirm}
                />
            )}
        </div>
    );
};

// ─────────────────────────────────────────
//  Main modal
// ─────────────────────────────────────────
const WarehouseOperationsModal = ({ isOpen, onClose }) => {
    const [screen, setScreen]       = useState('list');  // 'list' | 'create' | 'view'
    const [month, setMonth]         = useState(getCurrentMonth);
    const [docs, setDocs]           = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [viewDoc, setViewDoc]     = useState(null);
    const [profile, setProfile]     = useState(null);

    const loadDocs = (m) => {
        setIsLoading(true);
        fetchWarehouseOperations(m)
            .then(data => setDocs(Array.isArray(data) ? data : []))
            .catch(console.error)
            .finally(() => setIsLoading(false));
    };

    useEffect(() => {
        if (isOpen) { 
            setScreen('list'); 
            loadDocs(month); 
            fetchProfile().then(p => setProfile(p));
        }
    }, [isOpen]);

    useEffect(() => {
        if (isOpen && screen === 'list') loadDocs(month);
    }, [month]);

    const handleSaved = () => { setScreen('list'); loadDocs(month); };
    const handleView  = (doc) => { setViewDoc(doc); setScreen('view'); };
    const handleEdit  = (doc) => { setViewDoc(doc); setScreen('create'); };

    const handleUpdateStatus = async (newStatus) => {
        if (!viewDoc) return;
        try {
            const today = new Date().toISOString().split('T')[0];
            const payload = {
                id: viewDoc.Id,
                date: viewDoc.Date || today,
                Warehouse: viewDoc.Warehouse?.Id || '',
                TargetWarehouse: viewDoc.TargetWarehouse?.Id || '',
                Operation: viewDoc.Operation,
                Status: newStatus,
                products: (viewDoc.Products || []).map(i => ({ id: i.Id || i.id, count: i.Count || i.qty }))
            };
            const result = await saveWarehouseOperation(payload);
            
            if (result && result.success !== undefined) {
                if (result.success) {
                    alert(`Status updated to ${newStatus}`);
                    setScreen('list');
                    loadDocs(month);
                } else {
                    alert('Error: ' + (result.message || 'API Error'));
                }
            } else {
                alert(`Status updated to ${newStatus}`);
                setScreen('list');
                loadDocs(month);
            }
        } catch (e) {
            alert('Failed to update status');
        }
    };

    if (!isOpen) return null;

    return (
        <div className="wh-ops-overlay" onClick={onClose}>
            <div className="wh-ops-modal" onClick={e => e.stopPropagation()}>

                <div className="wh-ops-header">
                    <h2 className="wh-ops-title">
                        <Warehouse size={20} />
                        Warehouse Operations
                    </h2>
                    <button className="wh-ops-close" onClick={onClose}>
                        <X size={22} />
                    </button>
                </div>

                {screen === 'list' && (
                    <DocListScreen
                        month={month}
                        onMonthChange={setMonth}
                        docs={docs}
                        isLoading={isLoading}
                        onCreate={() => { setViewDoc(null); setScreen('create'); }}
                        onView={handleView}
                    />
                )}
                {screen === 'create' && (
                    <CreateScreen
                        initialDoc={viewDoc}
                        onBack={() => { setScreen('list'); setViewDoc(null); }}
                        onSaved={handleSaved}
                    />
                )}
                {screen === 'view' && viewDoc && (
                    <ViewDocScreen
                        doc={viewDoc}
                        profile={profile}
                        onBack={() => { setScreen('list'); setViewDoc(null); }}
                        onEdit={handleEdit}
                        onUpdateStatus={handleUpdateStatus}
                    />
                )}
            </div>
        </div>
    );
};

export default WarehouseOperationsModal;

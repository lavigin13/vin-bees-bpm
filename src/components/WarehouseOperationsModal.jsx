import React, { useState, useEffect, useMemo } from 'react';
import { X, Plus, Minus, ArrowLeft, CheckCircle2, Loader2, Warehouse, ChevronRight, Eye } from 'lucide-react';
import './WarehouseOperationsModal.css';
import {
    fetchWarehouseOperations,
    fetchWarehouses,
    fetchNomenclature,
    fetchNomenclatureSpec,
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
    const [opType, setOpType]           = useState(initialDoc ? initialDoc.Operation : null);
    const [warehouses, setWarehouses]   = useState([]);
    const [warehouseId, setWarehouseId] = useState('');
    const [targetWarehouseId, setTargetWarehouseId] = useState(initialDoc && initialDoc.TargetWarehouse ? initialDoc.TargetWarehouse : '');
    const [loadingWH, setLoadingWH]     = useState(false);

    const [colleagues, setColleagues]       = useState([]);
    const [loadingColleagues, setLoadingColleagues] = useState(false);
    const [recipientId, setRecipientId]     = useState(
        initialDoc?.TargetIndividual?.Id || initialDoc?.TargetIndividual?.id || ''
    );

    const [nomenclature, setNomenclature] = useState([]);
    const [nomSearch, setNomSearch]       = useState('');
    const [loadingNom, setLoadingNom]     = useState(false);

    const [specs, setSpecs]               = useState([]);
    const [loadingSpec, setLoadingSpec]   = useState(false);
    // map: { [IdParent]: qty }  — серцевина множинного вибору специфікацій
    const [selectedSpecsQty, setSelectedSpecsQty] = useState({});
    // specsById: { [IdParent]: spec } — швидкий пошук
    const [specsById, setSpecsById] = useState({});

    const [selectedItems, setSelectedItems] = useState(() => {
        if (!initialDoc || !initialDoc.Products) return [];
        return initialDoc.Products.map(p => ({
            id: p.Id, name: p.Name, qty: p.Count, maxQty: 99999
        }));
    });
    const [isSaving, setIsSaving] = useState(false);

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
        setNomenclature([]);
        setSpecs([]);
        setSpecsById({});
        setSelectedSpecsQty({});
        setSelectedItems([]);
        setNomSearch('');
    };

    useEffect(() => {
        if (!warehouseId) return;
        if (opType === 'ProductionRequest') {
            setLoadingSpec(true);
            setSpecs([]);
            setSpecsById({});
            setSelectedSpecsQty({});
            setSelectedItems([]);
            fetchNomenclatureSpec(warehouseId).then(data => {
                console.log("=== RAW SPEC DATA ===", JSON.stringify(data, null, 2));
                const arr = Array.isArray(data) ? data : (data?.items || data?.data || []);

                const firstItem = arr[0];
                const isAlreadyGrouped = firstItem && (firstItem.Сomponents || firstItem.Components);

                let parsedSpecs;
                if (isAlreadyGrouped) {
                    parsedSpecs = arr.map(g => ({
                        IdParent: g.IdParent || g.idParent || g.Id || g.id,
                        NameParent: g.NameParent || g.nameParent || g.Name || g.name || 'Специфікація',
                        Сomponents: (g.Сomponents || g.Components || g.components || []).map(c => ({
                            Id: c.Id || c.id,
                            Name: c.Name || c.name || 'Компонент',
                            Count: c.Count || c.count || 1,
                            CountСomponent: c.CountСomponent || c.CountComponent || c.countComponent || c.count_component || 1
                        }))
                    }));
                } else {
                    const grouped = {};
                    arr.forEach(row => {
                        const idParent = row.IdParent || row.idParent;
                        const idComp   = row.Id || row.id;
                        if (!idParent) return;
                        if (!grouped[idParent]) {
                            grouped[idParent] = {
                                IdParent: idParent,
                                NameParent: row.NameParent || row.nameParent || 'Специфікація ' + idParent.substring(0, 4),
                                Сomponents: []
                            };
                        }
                        if (idComp) {
                            grouped[idParent].Сomponents.push({
                                Id: idComp,
                                Name: row.Name || row.name || 'Компонент',
                                Count: row.Count || row.count || 1,
                                CountСomponent: row.CountСomponent || row.CountComponent || row.countComponent || row.count_component || 1
                            });
                        }
                    });
                    parsedSpecs = Object.values(grouped);
                }

                console.log('[SPEC] parsedSpecs:', JSON.stringify(parsedSpecs, null, 2));
                const byId = {};
                parsedSpecs.forEach(s => { byId[s.IdParent] = s; });
                console.log('[SPEC] specsById keys:', Object.keys(byId));
                setSpecs(parsedSpecs);
                setSpecsById(byId);
            }).finally(() => setLoadingSpec(false));
        } else if (opType === 'Writeoff' || opType === 'Movement') {
            setLoadingNom(true);
            fetchNomenclature(warehouseId).then(data => setNomenclature(data || []))
                .finally(() => setLoadingNom(false));
        }
    }, [warehouseId, opType]);

    // Агрегує компоненти з усіх вибраних специфікацій (сумує однакові компоненти)
    const buildAggregatedItems = (sqMap, byId) => {
        console.log('[BUILD] sqMap:', JSON.stringify(sqMap));
        console.log('[BUILD] byId keys:', Object.keys(byId));
        const agg = {};
        Object.entries(sqMap).forEach(([specId, qty]) => {
            const spec = byId[specId];
            console.log(`[BUILD] specId=${specId}, found spec:`, !!spec, 'components:', spec?.Сomponents?.length);
            if (!spec) return;
            (spec.Сomponents || []).forEach(comp => {
                console.log(`[BUILD] comp:`, JSON.stringify(comp));
                if (!comp.Id) return;
                if (!agg[comp.Id]) {
                    agg[comp.Id] = { id: comp.Id, name: comp.Name, qty: 0, maxQty: comp.Count };
                }
                agg[comp.Id].qty += comp.CountСomponent * qty;
            });
        });
        const result = Object.values(agg);
        console.log('[BUILD] result:', JSON.stringify(result));
        return result;
    };

    // Синхронізуємо selectedItems коли змінюється вибір специфікацій або словник специфікацій
    useEffect(() => {
        if (opType === 'ProductionRequest') {
            setSelectedItems(buildAggregatedItems(selectedSpecsQty, specsById));
        }
    }, [selectedSpecsQty, specsById]);

    const handleToggleSpec = (spec) => {
        setSelectedSpecsQty(prev => {
            const next = { ...prev };
            if (next[spec.IdParent] !== undefined) {
                delete next[spec.IdParent];
            } else {
                next[spec.IdParent] = 1;
            }
            return next;
        });
    };

    const handleSpecQtyChange = (specId, delta) => {
        setSelectedSpecsQty(prev => ({
            ...prev,
            [specId]: Math.max(1, (prev[specId] || 1) + delta)
        }));
    };

    const handleSpecQtyInput = (specId, val) => {
        const n = parseInt(val);
        if (!isNaN(n) && n >= 1) {
            setSelectedSpecsQty(prev => ({ ...prev, [specId]: n }));
        }
    };

    const handleAddNomItem = (item) => {
        setSelectedItems(prev => {
            if (prev.find(i => i.id === item.ID)) return prev;
            return [...prev, { id: item.ID, name: item.Name, qty: 1, maxQty: item.Count }];
        });
    };

    const handleQtyChange = (id, delta) =>
        setSelectedItems(prev => prev.map(i =>
            i.id === id ? { ...i, qty: Math.max(1, i.qty + delta) } : i
        ));

    const handleQtyInput = (id, val) => {
        const n = parseInt(val);
        if (!isNaN(n)) setSelectedItems(prev => prev.map(i => i.id === id ? { ...i, qty: Math.max(1, n) } : i));
    };

    const handleRemoveItem = (id) =>
        setSelectedItems(prev => prev.filter(i => i.id !== id));

    const filteredNom = useMemo(() => {
        if (!nomSearch.trim()) return nomenclature;
        const q = nomSearch.toLowerCase();
        return nomenclature.filter(n => n.Name.toLowerCase().includes(q));
    }, [nomenclature, nomSearch]);

    const hasSelectedSpecs = Object.keys(selectedSpecsQty).length > 0;

    const canSave = opType && (warehouseId || isEdit) &&
                    (opType === 'ProductionRequest' ? hasSelectedSpecs : selectedItems.length > 0) &&
                    (opType !== 'Movement' || targetWarehouseId || isEdit);

    const handleSave = async () => {
        if (!canSave) return;
        setIsSaving(true);
        try {
            const today = new Date().toISOString().split('T')[0];
            const payload = {
                id: initialDoc ? initialDoc.Id : "",
                date: initialDoc && initialDoc.Date ? initialDoc.Date : today,
                Warehouse: warehouseId,
                TargetWarehouse: opType === 'Movement' ? targetWarehouseId : "",
                Recipient: opType === 'Movement' ? recipientId : "",
                Operation: opType,
                Status: initialDoc ? initialDoc.Status : 'New',
                products: opType === 'ProductionRequest'
                    ? Object.entries(selectedSpecsQty).map(([specId, qty]) => ({ id: specId, count: qty }))
                    : selectedItems.map(i => ({ id: i.id, count: i.qty }))
            };
            const result = await saveWarehouseOperation(payload);

            if (result && result.success !== undefined) {
                if (result.success) {
                    alert('Document saved successfully!');
                    onSaved();
                } else {
                    alert('Error saving document: ' + (result.message || result.error || 'Unknown API error'));
                }
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
                            onChange={e => setWarehouseId(e.target.value)}
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

            {/* Production Request: multi-select specs with per-spec qty */}
            {opType === 'ProductionRequest' && warehouseId && (
                <div className="wh-form-group">
                    <span className="wh-form-label">
                        Вибір виробів
                        {hasSelectedSpecs && <span className="wh-spec-count-badge"> ({Object.keys(selectedSpecsQty).length} вибрано)</span>}
                    </span>
                    {loadingSpec ? (
                        <div className="wh-spec-loading">
                            <Loader2 size={16} className="spin" />
                            <span>Завантаження специфікацій...</span>
                        </div>
                    ) : specs.length === 0 ? (
                        <div className="wh-spec-empty">
                            Специфікації не знайдено для цього складу
                        </div>
                    ) : (
                        <div className="wh-nom-list">
                            {specs.map(spec => {
                                const qty = selectedSpecsQty[spec.IdParent];
                                const isSelected = qty !== undefined;
                                return (
                                    <div
                                        key={spec.IdParent}
                                        className={`wh-spec-product ${isSelected ? 'selected' : ''}`}
                                    >
                                        {/* Header row — toggle selection */}
                                        <div
                                            className="wh-spec-product-header"
                                            onClick={() => handleToggleSpec(spec)}
                                        >
                                            <span className="wh-spec-product-name">{spec.NameParent}</span>
                                            {isSelected
                                                ? <CheckCircle2 size={18} className="wh-spec-check" />
                                                : <ChevronRight size={16} color="var(--text-secondary)" />
                                            }
                                        </div>

                                        {/* Per-spec qty row — visible only when selected */}
                                        {isSelected && (
                                            <div
                                                className="wh-spec-qty-row"
                                                onClick={e => e.stopPropagation()}
                                            >
                                                <span className="wh-spec-qty-label">Кількість:</span>
                                                <button className="wh-qty-btn" onClick={() => handleSpecQtyChange(spec.IdParent, -1)}>
                                                    <Minus size={10} />
                                                </button>
                                                <input
                                                    type="number"
                                                    className="wh-qty-input"
                                                    value={qty}
                                                    min={1}
                                                    onChange={e => handleSpecQtyInput(spec.IdParent, e.target.value)}
                                                />
                                                <button className="wh-qty-btn" onClick={() => handleSpecQtyChange(spec.IdParent, +1)}>
                                                    <Plus size={10} />
                                                </button>
                                                <span className="wh-spec-qty-unit">шт.</span>
                                            </div>
                                        )}

                                        {/* Components preview */}
                                        {isSelected && spec.Сomponents && spec.Сomponents.length > 0 && (
                                            <div className="wh-spec-components">
                                                {spec.Сomponents.map(comp => (
                                                    <div key={comp.Id} className="wh-spec-comp-row">
                                                        <span className="wh-spec-comp-name">{comp.Name}</span>
                                                        <span className="wh-spec-comp-qty">× {comp.CountСomponent * qty}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* Write-off / Movement: nomenclature picker */}
            {(opType === 'Writeoff' || opType === 'Movement') && warehouseId && (
                <div className="wh-form-group">
                    <span className="wh-form-label">Add Nomenclature</span>
                    {loadingNom ? (
                        <div className="wh-loading"><Loader2 size={14} /> Loading...</div>
                    ) : (
                        <>
                            <input
                                className="wh-nom-search"
                                placeholder="Search..."
                                value={nomSearch}
                                onChange={e => setNomSearch(e.target.value)}
                            />
                            <div className="wh-nom-list">
                                {filteredNom.length === 0 ? (
                                    <div className="wh-loading" style={{ padding: 12 }}>Nothing found</div>
                                ) : (
                                    filteredNom.map(item => {
                                        const added = selectedItems.some(i => i.id === item.ID);
                                        return (
                                            <div key={item.ID} className="wh-nom-item">
                                                <span className="wh-nom-item-name">{item.Name}</span>
                                                <span className="wh-nom-item-count">in stock: {item.Count}</span>
                                                <button
                                                    className="wh-nom-add-btn"
                                                    onClick={() => handleAddNomItem(item)}
                                                    disabled={added}
                                                    style={added ? { opacity: 0.4 } : {}}
                                                >
                                                    {added ? '✓' : '+ Add'}
                                                </button>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* Selected items */}
            {selectedItems.length > 0 && (
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

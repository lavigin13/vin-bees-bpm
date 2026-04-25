import React, { useState, useEffect } from 'react';
import { Loader2, CheckCircle2, ChevronRight, ChevronDown } from 'lucide-react';
import { fetchNomenclatureSpec } from '../services/api';
import './ItemPickerModal.css';

/**
 * Defensive parsing of the /nomenclature/specification response.
 * The 1C backend has shipped at least two shapes:
 *   - Already grouped: [{ IdParent, NameParent, Сomponents: [...] }, ...]
 *   - Flat rows:       [{ IdParent, NameParent, Id, Name, Count, CountСomponent }, ...]
 * Plus tolerates both Cyrillic "Сomponents" and Latin "Components" keys
 * and various casings for IDs.
 */
const parseSpecs = (data) => {
    const arr = Array.isArray(data) ? data : (data?.items || data?.data || []);
    if (arr.length === 0) return [];

    const firstItem = arr[0];
    const isAlreadyGrouped = !!(firstItem.Сomponents || firstItem.Components || firstItem.components);

    if (isAlreadyGrouped) {
        return arr.map(g => ({
            IdParent: g.IdParent || g.idParent || g.Id || g.id,
            NameParent: g.NameParent || g.nameParent || g.Name || g.name || 'Specification',
            Сomponents: (g.Сomponents || g.Components || g.components || []).map(c => ({
                Id: c.Id || c.id,
                Name: c.Name || c.name || 'Component',
                Count: c.Count || c.count || 1,
                CountСomponent: c.CountСomponent || c.CountComponent || c.countComponent || c.count_component || 1,
            })),
        }));
    }

    const grouped = {};
    arr.forEach(row => {
        const idParent = row.IdParent || row.idParent;
        const idComp = row.Id || row.id;
        if (!idParent) return;
        if (!grouped[idParent]) {
            grouped[idParent] = {
                IdParent: idParent,
                NameParent:
                    row.NameParent ||
                    row.nameParent ||
                    `Specification ${String(idParent).slice(0, 4)}`,
                Сomponents: [],
            };
        }
        if (idComp) {
            grouped[idParent].Сomponents.push({
                Id: idComp,
                Name: row.Name || row.name || 'Component',
                Count: row.Count || row.count || 1,
                CountСomponent: row.CountСomponent || row.CountComponent || row.countComponent || row.count_component || 1,
            });
        }
    });
    return Object.values(grouped);
};

/**
 * Modal for picking specifications (used in Production Request operations).
 *
 * Props:
 *   isOpen
 *   warehouseId
 *   currentSelectedIds   — string[] of IdParent values already selected
 *   onClose
 *   onConfirm(specs)     — called with the full spec objects on Done
 */
const SpecPickerModal = ({
    isOpen,
    warehouseId,
    currentSelectedIds = [],
    onClose,
    onConfirm,
}) => {
    const [specs, setSpecs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [draftIds, setDraftIds] = useState(() => new Set(currentSelectedIds));
    const [expandedId, setExpandedId] = useState(null);

    useEffect(() => {
        if (!isOpen || !warehouseId) return;
        setLoading(true);
        setExpandedId(null);
        setDraftIds(new Set(currentSelectedIds));
        fetchNomenclatureSpec(warehouseId)
            .then(data => setSpecs(parseSpecs(data)))
            .catch(() => setSpecs([]))
            .finally(() => setLoading(false));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, warehouseId]);

    const toggleSpec = (id) => {
        setDraftIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const toggleExpand = (e, id) => {
        e.stopPropagation();
        setExpandedId(prev => (prev === id ? null : id));
    };

    const handleConfirm = () => {
        const selected = specs.filter(s => draftIds.has(s.IdParent));
        onConfirm(selected);
    };

    if (!isOpen) return null;

    return (
        <div className="picker-overlay" onClick={onClose}>
            <div className="picker-modal" onClick={e => e.stopPropagation()}>
                <div className="picker-header">
                    <h3>Select specifications</h3>
                    <div className="picker-header-actions">
                        <button className="picker-btn-cancel" onClick={onClose}>
                            Cancel
                        </button>
                        <button
                            className="picker-btn-done"
                            onClick={handleConfirm}
                            disabled={loading}
                        >
                            Done{draftIds.size > 0 ? ` (${draftIds.size})` : ''}
                        </button>
                    </div>
                </div>

                <div className="picker-list">
                    {loading ? (
                        <div className="picker-loading">
                            <Loader2 size={18} className="spin" /> Loading...
                        </div>
                    ) : specs.length === 0 ? (
                        <div className="picker-empty">No specifications for this warehouse</div>
                    ) : (
                        specs.map(spec => {
                            const isSelected = draftIds.has(spec.IdParent);
                            const isExpanded = expandedId === spec.IdParent;
                            const compCount = (spec.Сomponents || []).length;
                            return (
                                <div
                                    key={spec.IdParent}
                                    className={`picker-spec ${isSelected ? 'selected' : ''}`}
                                >
                                    <div
                                        className="picker-spec-header"
                                        onClick={() => toggleSpec(spec.IdParent)}
                                    >
                                        <span className="picker-item-name">{spec.NameParent}</span>
                                        {isSelected
                                            ? <CheckCircle2 size={20} className="picker-check" />
                                            : <ChevronRight size={16} color="var(--text-secondary)" />
                                        }
                                    </div>

                                    {compCount > 0 && (
                                        <button
                                            type="button"
                                            className="picker-spec-expand-btn"
                                            onClick={(e) => toggleExpand(e, spec.IdParent)}
                                        >
                                            {isExpanded ? (
                                                <><ChevronDown size={12} style={{ verticalAlign: 'middle' }} /> Hide components</>
                                            ) : (
                                                <><ChevronRight size={12} style={{ verticalAlign: 'middle' }} /> Show components ({compCount})</>
                                            )}
                                        </button>
                                    )}

                                    {isExpanded && compCount > 0 && (
                                        <div className="picker-spec-components">
                                            {spec.Сomponents.map((c, idx) => (
                                                <div key={c.Id || idx} className="picker-spec-comp">
                                                    <span>{c.Name}</span>
                                                    <span>× {c.CountСomponent}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
};

export default SpecPickerModal;

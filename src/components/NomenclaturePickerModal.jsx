import React, { useState, useEffect, useMemo } from 'react';
import { Search, Loader2, CheckCircle2, Plus } from 'lucide-react';
import { fetchNomenclature } from '../services/api';
import './ItemPickerModal.css';

/**
 * Normalise a nomenclature row from 1C — the backend has shipped fields in
 * a few different casings (ID/Id/id, Name/name, Count/count). We pick the
 * first defined value so the rest of the component can use stable shape.
 */
const normaliseItem = (raw) => ({
    id: raw.ID ?? raw.Id ?? raw.id ?? '',
    name: raw.Name ?? raw.name ?? '',
    count: raw.Count ?? raw.count ?? 0,
});

/**
 * Modal for picking nomenclature items (used in Writeoff / Movement operations).
 *
 * Props:
 *   isOpen           — visibility flag
 *   warehouseId      — required to fetch nomenclature for a specific warehouse
 *   currentSelectedIds — string[] of item IDs that are currently selected in the parent
 *   onClose          — close without saving
 *   onConfirm(items) — called on Done with the selected items in the
 *                      normalised shape: { id, name, count }
 */
const NomenclaturePickerModal = ({
    isOpen,
    warehouseId,
    currentSelectedIds = [],
    onClose,
    onConfirm,
}) => {
    const [nomenclature, setNomenclature] = useState([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [draftIds, setDraftIds] = useState(() => new Set(currentSelectedIds));

    useEffect(() => {
        if (!isOpen || !warehouseId) return;
        setLoading(true);
        setSearch('');
        setDraftIds(new Set(currentSelectedIds));
        fetchNomenclature(warehouseId)
            .then(data => {
                const arr = Array.isArray(data) ? data : (data?.items || data?.data || []);
                setNomenclature(arr.map(normaliseItem).filter(i => i.id));
            })
            .catch(() => setNomenclature([]))
            .finally(() => setLoading(false));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, warehouseId]);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return nomenclature;
        return nomenclature.filter(n => n.name.toLowerCase().includes(q));
    }, [nomenclature, search]);

    const toggleItem = (id) => {
        setDraftIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const handleConfirm = () => {
        const selected = nomenclature.filter(n => draftIds.has(n.id));
        onConfirm(selected);
    };

    if (!isOpen) return null;

    return (
        <div className="picker-overlay" onClick={onClose}>
            <div className="picker-modal" onClick={e => e.stopPropagation()}>
                <div className="picker-header">
                    <h3>Оберіть товари</h3>
                    <div className="picker-header-actions">
                        <button className="picker-btn-cancel" onClick={onClose}>
                            Скасувати
                        </button>
                        <button
                            className="picker-btn-done"
                            onClick={handleConfirm}
                            disabled={loading}
                        >
                            Готово{draftIds.size > 0 ? ` (${draftIds.size})` : ''}
                        </button>
                    </div>
                </div>

                <div className="picker-search">
                    <Search size={14} />
                    <input
                        type="text"
                        placeholder="Пошук за назвою..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>

                <div className="picker-list">
                    {loading ? (
                        <div className="picker-loading">
                            <Loader2 size={18} className="spin" /> Завантаження...
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="picker-empty">
                            {nomenclature.length === 0 ? 'Немає товарів на цьому складі' : 'Нічого не знайдено'}
                        </div>
                    ) : (
                        filtered.map(item => {
                            const isSelected = draftIds.has(item.id);
                            return (
                                <div
                                    key={item.id}
                                    className={`picker-item ${isSelected ? 'selected' : ''}`}
                                    onClick={() => toggleItem(item.id)}
                                >
                                    <div className="picker-item-info">
                                        <span className="picker-item-name">{item.name}</span>
                                        <span className="picker-item-meta">В наявності: {item.count}</span>
                                    </div>
                                    {isSelected
                                        ? <CheckCircle2 size={20} className="picker-check" />
                                        : <Plus size={18} color="var(--text-secondary)" />
                                    }
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
};

export default NomenclaturePickerModal;

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { X, Loader2, Warehouse, ChevronDown, Search, Download, BarChart3, Package, Check } from 'lucide-react';
import { fetchRemainingItems } from '../services/api';
import * as XLSX from 'xlsx';
import './RemainingItemsModal.css';

// ─────────────────────────────────────────
//  Excel export (.xlsx via SheetJS)
// ─────────────────────────────────────────
const exportToExcel = async (grouped) => {
    const rows = [];

    grouped.forEach(({ warehouseName, products }) => {
        products.forEach(p => {
            rows.push({
                'Warehouse': warehouseName,
                'Product': p.Name,
                'Qty': p.Count,
                'Unit': p.Unit || ''
            });
        });
    });

    const ws = XLSX.utils.json_to_sheet(rows);

    const colWidths = [
        { wch: Math.max(12, ...rows.map(r => r.Warehouse.length)) },
        { wch: Math.max(10, ...rows.map(r => r.Product.length)) },
        { wch: 10 },
        { wch: 10 }
    ];
    ws['!cols'] = colWidths;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Залишки');

    // Build filename
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const fileName = `Залишки ${pad(now.getDate())}.${pad(now.getMonth() + 1)}.${now.getFullYear()} ${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}.xlsx`;

    // Use native File System Access API — opens a real "Save As" dialog
    if (window.showSaveFilePicker) {
        try {
            const handle = await window.showSaveFilePicker({
                suggestedName: fileName,
                types: [{
                    description: 'Excel Workbook',
                    accept: { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'] }
                }]
            });
            const writable = await handle.createWritable();
            const wbOut = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
            await writable.write(wbOut);
            await writable.close();
            return;
        } catch (e) {
            if (e.name === 'AbortError') return; // User cancelled the dialog
            console.error('showSaveFilePicker failed:', e);
        }
    }

    // Fallback for browsers without File System Access API
    XLSX.writeFile(wb, fileName, { bookType: 'xlsx' });
};
const MultiSelect = ({ options, selected, onChange, placeholder }) => {
    const [isOpen, setIsOpen] = useState(false);
    const ref = useRef(null);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (ref.current && !ref.current.contains(e.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const toggle = (guid) => {
        const next = selected.includes(guid)
            ? selected.filter(id => id !== guid)
            : [...selected, guid];
        onChange(next);
    };

    const displayText = selected.length === 0
        ? placeholder
        : options
            .filter(o => selected.includes(o.GUID))
            .map(o => o.Name)
            .join(', ');

    return (
        <div className="ri-multi-select" ref={ref}>
            <button
                type="button"
                className={`ri-multi-select-trigger ${isOpen ? 'open' : ''}`}
                onClick={() => setIsOpen(prev => !prev)}
            >
                <span className="ri-multi-select-trigger-text">{displayText}</span>
                <ChevronDown size={14} style={{ color: '#6b7280', flexShrink: 0 }} />
            </button>
            {isOpen && (
                <div className="ri-multi-select-dropdown">
                    {options.length === 0 && (
                        <div style={{ padding: '10px 12px', color: '#6b7280', fontSize: '0.85rem' }}>
                            Немає опцій
                        </div>
                    )}
                    {options.map(opt => {
                        const isSel = selected.includes(opt.GUID);
                        return (
                            <div
                                key={opt.GUID}
                                className={`ri-multi-select-option ${isSel ? 'selected' : ''}`}
                                onClick={() => toggle(opt.GUID)}
                            >
                                <div className="ri-multi-select-check">
                                    {isSel && <Check size={10} color="#fff" />}
                                </div>
                                {opt.Name}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};


// ─────────────────────────────────────────
//  Main Modal
// ─────────────────────────────────────────
const RemainingItemsModal = ({ isOpen, onClose }) => {
    // Filter selections (GUIDs)
    const [selectedWarehouses, setSelectedWarehouses] = useState([]);
    const [selectedFolders, setSelectedFolders] = useState([]);
    const [selectedCategories, setSelectedCategories] = useState([]);

    // Available filter options (from API response)
    const [availableWarehouses, setAvailableWarehouses] = useState([]);
    const [availableFolders, setAvailableFolders] = useState([]);
    const [availableCategories, setAvailableCategories] = useState([]);

    // Report data
    const [products, setProducts] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [hasLoaded, setHasLoaded] = useState(false);

    // Search
    const [searchTerm, setSearchTerm] = useState('');

    // Collapsed warehouses
    const [collapsed, setCollapsed] = useState({});

    // Load data on first open with empty filters to get available options
    useEffect(() => {
        if (isOpen && !hasLoaded) {
            loadReport();
        }
    }, [isOpen]);

    const loadReport = async () => {
        setIsLoading(true);
        try {
            const data = await fetchRemainingItems({
                warehouses: selectedWarehouses,
                folders: selectedFolders,
                categories: selectedCategories
            });

            if (data) {
                // Update available filters
                if (data.warehouses) setAvailableWarehouses(data.warehouses);
                if (data.folders) setAvailableFolders(data.folders);
                if (data.categories) setAvailableCategories(data.categories);

                // Update products
                setProducts(data.products || []);
                setHasLoaded(true);
            }
        } catch (e) {
            console.error('Failed to fetch remaining items:', e);
        } finally {
            setIsLoading(false);
        }
    };

    // Group products by their Warehouse GUID field, resolving names from availableWarehouses
    const groupedProducts = useMemo(() => {
        let filtered = products;

        // Apply search filter
        if (searchTerm.trim()) {
            const term = searchTerm.toLowerCase();
            filtered = filtered.filter(p => p.Name.toLowerCase().includes(term));
        }

        // Build a lookup map for warehouse names
        const whNameMap = {};
        availableWarehouses.forEach(w => { whNameMap[w.GUID] = w.Name; });

        // Group by product.Warehouse (GUID)
        const groups = {};
        filtered.forEach(p => {
            const whGuid = p.Warehouse || 'unknown';
            if (!groups[whGuid]) {
                groups[whGuid] = {
                    warehouseGUID: whGuid,
                    warehouseName: whNameMap[whGuid] || 'Невідомий склад',
                    products: []
                };
            }
            groups[whGuid].products.push(p);
        });

        // Sort groups alphabetically by warehouse name
        return Object.values(groups).sort((a, b) => a.warehouseName.localeCompare(b.warehouseName));
    }, [products, searchTerm, availableWarehouses]);

    const totalProducts = groupedProducts.reduce((sum, g) => sum + g.products.length, 0);
    const totalQty = groupedProducts.reduce(
        (sum, g) => sum + g.products.reduce((s, p) => s + (p.Count || 0), 0), 0
    );

    const toggleCollapse = (key) => {
        setCollapsed(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const handleClose = () => {
        setHasLoaded(false);
        setProducts([]);
        setSelectedWarehouses([]);
        setSelectedFolders([]);
        setSelectedCategories([]);
        setSearchTerm('');
        setCollapsed({});
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="ri-overlay" onClick={handleClose}>
            <div className="ri-modal" onClick={e => e.stopPropagation()}>

                <div className="ri-header">
                    <h2 className="ri-title">
                        <BarChart3 size={20} />
                        Звіт по залишках
                    </h2>
                    <button className="ri-close" onClick={handleClose}>
                        <X size={22} />
                    </button>
                </div>

                <div className="ri-body">
                    {/* Filters */}
                    <div className="ri-filters">
                        <div className="ri-filter-row">
                            <span className="ri-filter-label">Склад</span>
                            <MultiSelect
                                options={availableWarehouses}
                                selected={selectedWarehouses}
                                onChange={setSelectedWarehouses}
                                placeholder="Всі склади"
                            />
                        </div>

                        {availableFolders.length > 0 && (
                            <div className="ri-filter-row">
                                <span className="ri-filter-label">Папка</span>
                                <MultiSelect
                                    options={availableFolders}
                                    selected={selectedFolders}
                                    onChange={setSelectedFolders}
                                    placeholder="Всі папки"
                                />
                            </div>
                        )}

                        <div className="ri-filter-row">
                            <span className="ri-filter-label">Категорія</span>
                            <MultiSelect
                                options={availableCategories}
                                selected={selectedCategories}
                                onChange={setSelectedCategories}
                                placeholder="Всі категорії"
                            />
                        </div>

                        <div className="ri-filter-actions">
                            <button
                                className="ri-btn-load"
                                onClick={loadReport}
                                disabled={isLoading}
                            >
                                {isLoading
                                    ? <><Loader2 size={16} className="ri-spin" /> Завантаження...</>
                                    : <><Search size={16} /> Завантажити звіт</>
                                }
                            </button>
                            <button
                                className="ri-btn-export"
                                onClick={() => exportToExcel(groupedProducts)}
                                disabled={!hasLoaded || totalProducts === 0}
                            >
                                <Download size={16} /> Excel
                            </button>
                        </div>
                    </div>

                    {/* Loading state */}
                    {isLoading && (
                        <div className="ri-loading">
                            <Loader2 size={20} className="ri-spin" />
                            Завантаження звіту...
                        </div>
                    )}

                    {/* Empty state */}
                    {!isLoading && hasLoaded && totalProducts === 0 && (
                        <div className="ri-empty">
                            <Package size={40} style={{ marginBottom: 12, opacity: 0.4 }} />
                            <div>Товарів не знайдено</div>
                        </div>
                    )}

                    {/* Report */}
                    {!isLoading && hasLoaded && totalProducts > 0 && (
                        <>
                            {/* Summary */}
                            <div className="ri-summary">
                                <div className="ri-summary-item">
                                    <span className="ri-summary-value">{totalProducts}</span>
                                    <span className="ri-summary-label">Товари</span>
                                </div>
                                <div className="ri-summary-item">
                                    <span className="ri-summary-value">{totalQty.toLocaleString()}</span>
                                    <span className="ri-summary-label">Загальна кіл-ть</span>
                                </div>
                                <div className="ri-summary-item">
                                    <span className="ri-summary-value">{groupedProducts.length}</span>
                                    <span className="ri-summary-label">Групи</span>
                                </div>
                            </div>

                            {/* Search */}
                            <div className="ri-search-row">
                                <input
                                    type="text"
                                    className="ri-search-input"
                                    placeholder="Пошук товарів..."
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                />
                            </div>

                            {/* Grouped products */}
                            <div className="ri-report">
                                {groupedProducts.map(group => {
                                    const isCollapsed = collapsed[group.warehouseGUID];
                                    return (
                                        <div key={group.warehouseGUID} className="ri-warehouse-group">
                                            <div
                                                className="ri-warehouse-header"
                                                onClick={() => toggleCollapse(group.warehouseGUID)}
                                            >
                                                <Warehouse size={16} className="ri-warehouse-icon" />
                                                <span className="ri-warehouse-name">
                                                    {group.warehouseName}
                                                </span>
                                                <span className="ri-warehouse-count">
                                                    {group.products.length} товарів
                                                </span>
                                                <ChevronDown
                                                    size={16}
                                                    className={`ri-chevron ${isCollapsed ? '' : 'open'}`}
                                                />
                                            </div>
                                            {!isCollapsed && (
                                                <div className="ri-products-list">
                                                    {group.products.map((product, idx) => (
                                                        <div key={product.GUID || idx} className="ri-product-row">
                                                            <span className="ri-product-name">
                                                                {product.Name}
                                                            </span>
                                                            <span className="ri-product-qty">
                                                                {product.Count.toLocaleString()}
                                                                {product.Unit && (
                                                                    <span className="ri-product-unit">{product.Unit}</span>
                                                                )}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default RemainingItemsModal;

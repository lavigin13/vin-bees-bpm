import React, { useState, useEffect, useRef } from 'react';
import { X, Plus, Minus, Check, FileText, ScanBarcode } from 'lucide-react';
import './WarehouseInventoryModal.css';
import { getProductByBarcode, getInventoryDocuments } from '../services/api';
import BarcodeScannerModal from './BarcodeScannerModal';

const WarehouseInventoryModal = ({ isOpen, onClose, onSaveInventory }) => {
    const [stage, setStage] = useState('select-document');
    const [documents, setDocuments] = useState([]);
    const [selectedDoc, setSelectedDoc] = useState(null);
    const [currentItem, setCurrentItem] = useState(null); // No longer needed for modal, can remove if you want full cleanup
    const [quantity, setQuantity] = useState(1); // No longer needed
    const [inventoryList, setInventoryList] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    
    // Scanner Modal State
    const [isScannerOpen, setIsScannerOpen] = useState(false);

    // Reset state when modal opens
    useEffect(() => {
        if (isOpen) {
            setStage('select-document');
            setSelectedDoc(null);
            setInventoryList([]);
            setCurrentItem(null);
            setIsScannerOpen(false);
            loadDocuments();
        }
    }, [isOpen]);

    const loadDocuments = async () => {
        setIsLoading(true);
        try {
            const docs = await getInventoryDocuments();
            setDocuments(docs || []);
        } catch (error) {
            console.error("Failed to load inventory docs", error);
            // Optional: Show error to user
        } finally {
            setIsLoading(false);
        }
    };

    const handleSelectDocument = (doc) => {
        setSelectedDoc(doc);
        // Load existing items if any
        if (doc.items && Array.isArray(doc.items)) {
            setInventoryList(doc.items.map(item => ({
                ...item,
                scannedQty: item.scannedQty || item.quantity || 0, // Ensure we have a quantity field
                // Ensure other required fields exist
                barcode: item.barcode || '',
                name: item.name || 'Unknown Item'
            })));
        } else {
            setInventoryList([]);
        }
    };

    const handleStartInventory = () => {
        if (!selectedDoc) return;
        setStage('scanning');
    };

    const handleScan = async (code) => {
        if (!code || !code.trim()) return;

        setIsLoading(true);
        try {
            const product = await getProductByBarcode(code);

            if (product) {
                // Directly add item instead of setting currentItem for review
                handleAddItemDirectly(product);
            } else {
                alert('Item not found');
            }
        } catch (error) {
            console.error(error);
            alert('Error searching for item');
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddItemDirectly = (product) => {
        setInventoryList(prev => {
            const existingIndex = prev.findIndex(item => item.barcode === product.barcode);
            if (existingIndex >= 0) {
                const newList = [...prev];
                newList[existingIndex].scannedQty += 1;
                return newList;
            } else {
                return [{
                    ...product,
                    scannedQty: 1,
                    timestamp: new Date().toISOString()
                }, ...prev];
            }
        });
    };

    const handleUpdateQuantity = (index, newQty) => {
        setInventoryList(prev => {
            const newList = [...prev];
            const safeQty = Math.max(1, newQty);
            newList[index] = { ...newList[index], scannedQty: safeQty };
            return newList;
        });
    };

    const handleFinish = (isDraft = false) => {
        if (onSaveInventory && selectedDoc) {
            onSaveInventory({
                documentId: selectedDoc.id,
                warehouseName: selectedDoc.warehouseName,
                items: inventoryList,
                date: new Date().toISOString(),
                isDraft: isDraft
            });
        }
        if (!isDraft) {
            onClose();
        } else {
            // Optional: Show feedback that draft was saved
            if (window.Telegram && window.Telegram.WebApp) {
                window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
            }
        }
    };

    if (!isOpen) return null;

    return (
        <div className="warehouse-modal-overlay" onClick={onClose}>
            <div className="warehouse-modal-content" onClick={e => e.stopPropagation()}>
                <div className="warehouse-header">
                    <h2>Warehouse Inventory</h2>
                    <button className="close-btn" onClick={onClose}>
                        <X size={24} />
                    </button>
                </div>

                <div className="warehouse-body">
                    {stage === 'select-document' ? (
                        <div className="warehouse-section">
                            <label>Select Inventory Document:</label>
                            
                            {isLoading ? (
                                <div style={{ color: '#9ca3af', padding: 20, textAlign: 'center' }}>Loading documents...</div>
                            ) : (
                                <div className="documents-list">
                                    {documents.length === 0 ? (
                                        <div style={{ color: '#9ca3af', padding: 20, textAlign: 'center' }}>No open inventory documents found.</div>
                                    ) : (
                                        documents.map(doc => (
                                            <div 
                                                key={doc.id} 
                                                className={`document-item ${selectedDoc?.id === doc.id ? 'selected' : ''}`}
                                                onClick={() => handleSelectDocument(doc)}
                                            >
                                                <FileText size={20} color={selectedDoc?.id === doc.id ? '#000' : '#fbbf24'} />
                                                <div className="doc-info">
                                                    <div className="doc-number">{doc.number}</div>
                                                    <div className="doc-wh">{doc.warehouseName}</div>
                                                </div>
                                                <div className="doc-date">{doc.date}</div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}
                            
                            <button 
                                className="finish-btn" 
                                disabled={!selectedDoc}
                                onClick={handleStartInventory}
                                style={{ marginTop: 'auto' }}
                            >
                                Start Scanning
                            </button>
                        </div>
                    ) : (
                        <div className="warehouse-section" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <label style={{ color: 'white', fontWeight: 600 }}>{selectedDoc?.number}</label>
                                    <span style={{ fontSize: '0.8rem', color: '#9ca3af' }}>{selectedDoc?.warehouseName}</span>
                                </div>
                                <span style={{ fontSize: '0.8rem', color: '#fbbf24', alignSelf: 'center' }}>
                                    {inventoryList.length} items
                                </span>
                            </div>

                                    <div className="inventory-table-container">
                                        <table className="inventory-table">
                                            <thead>
                                                <tr>
                                                    <th width="65%">Item</th>
                                                    <th width="35%" align="center">Qty</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {inventoryList.length === 0 ? (
                                                    <tr>
                                                        <td colSpan="2" style={{ textAlign: 'center', padding: '32px', color: '#6b7280' }}>
                                                            No items scanned yet.
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    inventoryList.map((item, idx) => (
                                                        <tr key={idx}>
                                                            <td className="item-cell">
                                                                <div className="item-name-text">{item.name}</div>
                                                                <div className="item-barcode-text">{item.barcode || item.id}</div>
                                                            </td>
                                                            <td className="qty-cell">
                                                                <div className="row-qty-control">
                                                                    <button 
                                                                        className="row-qty-btn" 
                                                                        onClick={() => handleUpdateQuantity(idx, item.scannedQty - 1)}
                                                                    >
                                                                        <Minus size={10} />
                                                                    </button>
                                                                    <input 
                                                                        type="number" 
                                                                        className="row-qty-input" 
                                                                        value={item.scannedQty}
                                                                        onChange={(e) => handleUpdateQuantity(idx, Number(e.target.value))}
                                                                    />
                                                                    <button 
                                                                        className="row-qty-btn"
                                                                        onClick={() => handleUpdateQuantity(idx, item.scannedQty + 1)}
                                                                    >
                                                                        <Plus size={10} />
                                                                    </button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))
                                                )}
                                            </tbody>
                                        </table>
                                    </div>

                            <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
                                <button className="scan-trigger-btn" onClick={() => setIsScannerOpen(true)}>
                                    <ScanBarcode size={24} />
                                    <span>Scan Barcode</span>
                                </button>
                                
                                <div style={{ display: 'flex', gap: 12 }}>
                                    <button 
                                        className="finish-btn" 
                                        onClick={() => handleFinish(true)} 
                                        style={{ marginTop: 0, background: '#374151', border: '1px solid #4b5563', color: 'white', flex: 1 }}
                                    >
                                        Save Draft
                                    </button>
                                    <button 
                                        className="finish-btn" 
                                        onClick={() => handleFinish(false)} 
                                        style={{ marginTop: 0, flex: 1 }}
                                    >
                                        Finish Inventory
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
            
            <BarcodeScannerModal
                isOpen={isScannerOpen}
                onClose={() => setIsScannerOpen(false)}
                onScan={handleScan}
            />
        </div>
    );
};

export default WarehouseInventoryModal;

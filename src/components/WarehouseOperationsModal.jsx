import React, { useState } from 'react';
import { X, Warehouse, ArrowDownToLine, ArrowUpFromLine, Truck } from 'lucide-react';
import './WarehouseOperationsModal.css';
import SupplierOrdersReceiving from './SupplierOrdersReceiving';
import InternalOrdersIssuing from './InternalOrdersIssuing';
import ShipmentsSending from './ShipmentsSending';

const WarehouseOperationsModal = ({ isOpen, onClose }) => {
    const [activeTab, setActiveTab] = useState('receiving');

    if (!isOpen) return null;

    return (
        <div className="wh-ops-overlay" onClick={onClose}>
            <div className="wh-ops-modal" onClick={e => e.stopPropagation()}>
                <div className="wh-ops-header">
                    <h2 className="wh-ops-title">
                        <Warehouse size={20} />
                        Складські операції
                    </h2>
                    <button className="wh-ops-close" onClick={onClose}>
                        <X size={22} />
                    </button>
                </div>

                <div className="wh-ops-tabs">
                    <button
                        className={`wh-ops-tab ${activeTab === 'receiving' ? 'active' : ''}`}
                        onClick={() => setActiveTab('receiving')}
                    >
                        <ArrowDownToLine size={16} /> Прийом (Постачальники)
                    </button>
                    <button
                        className={`wh-ops-tab ${activeTab === 'issuing' ? 'active' : ''}`}
                        onClick={() => setActiveTab('issuing')}
                    >
                        <ArrowUpFromLine size={16} /> Видача (Внутрішні заявки)
                    </button>
                    <button
                        className={`wh-ops-tab ${activeTab === 'shipment' ? 'active' : ''}`}
                        onClick={() => setActiveTab('shipment')}
                    >
                        <Truck size={16} /> Відправка
                    </button>
                </div>

                <div className="wh-ops-content">
                    {activeTab === 'receiving' && <SupplierOrdersReceiving />}
                    {activeTab === 'issuing' && <InternalOrdersIssuing />}
                    {activeTab === 'shipment' && <ShipmentsSending />}
                </div>
            </div>
        </div>
    );
};

export default WarehouseOperationsModal;

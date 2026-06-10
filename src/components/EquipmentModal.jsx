import React from 'react';
import { X } from 'lucide-react';
import Inventory from './Inventory';
import './CraftingModal.css'; // Reusing modal base
import './EquipmentModal.css';

const EquipmentModal = ({ isOpen, onClose, items, onTransferClick, onValidateClick, onReportMissing }) => {
    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content equipment-modal" onClick={e => e.stopPropagation()}>
                <button className="close-btn" onClick={onClose}><X size={24} /></button>
                <Inventory
                    items={items}
                    onTransferClick={onTransferClick}
                    onValidateClick={onValidateClick}
                    onReportMissing={onReportMissing}
                />
            </div>
        </div>
    );
};

export default EquipmentModal;

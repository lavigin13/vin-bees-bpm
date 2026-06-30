import React from 'react';
import { Laptop, Smartphone, Car, CreditCard, Armchair, Package, Battery, Cpu, Box, Hammer, Send, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import './Inventory.css';

const iconMap = {
    laptop: Laptop,
    phone: Smartphone,
    car: Car,
    card: CreditCard,
    chair: Armchair,
    battery: Battery,
    cpu: Cpu,
    box: Box,
    default: Package
};

const Inventory = ({ items = [], onTransferClick, onValidateClick, onReportMissing }) => {
    const filteredItems = (items || []).filter(item => item.type === 'equipment');

    return (
        <div className="inventory-container">
            <div className="inventory-header">
                <h2 className="section-title">Спорядження</h2>
            </div>

            <div className="inventory-grid">
                {filteredItems.map((item) => {
                    const Icon = iconMap[item.icon] || iconMap.default;
                    const isAudit = item.auditRequired;
                    const isMissing = item.status === 'missing';

                    return (
                        <div key={item.id} className={`inventory-item rarity-${item.rarity.toLowerCase()} ${isAudit ? 'audit-required' : ''}`} style={isMissing ? { opacity: 0.5, border: '2px dashed #ef4444' } : {}}>
                            {isAudit && (
                                <div className="audit-badge" title="Потрібна перевірка">
                                    <AlertTriangle size={14} strokeWidth={2.5} />
                                </div>
                            )}

                            <div className="item-icon-wrapper">
                                <Icon size={24} strokeWidth={1.5} />
                                {item.quantity > 1 && (
                                    <div className="item-quantity">{item.quantity}</div>
                                )}
                            </div>
                            <div className="item-details">
                                <div className="item-name">{item.name}</div>
                                <div className="item-rarity">
                                    {isMissing ? <span style={{ color: '#ef4444', fontWeight: 'bold' }}>ВІДСУТНІЙ</span> : item.rarity}
                                </div>
                            </div>

                            {isAudit ? (
                                <div className="validation-actions">
                                    <button
                                        className="missing-btn"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onReportMissing(item);
                                        }}
                                    >
                                        <XCircle size={14} /> Відсутній
                                    </button>
                                    <button
                                        className="validate-btn"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onValidateClick(item);
                                        }}
                                    >
                                        <CheckCircle size={14} /> ОК
                                    </button>
                                </div>
                            ) : !isMissing && (
                                <button
                                    className="item-action-btn"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onTransferClick(item);
                                    }}
                                    title="Передати предмет"
                                >
                                    <Send size={14} />
                                </button>
                            )}
                        </div>
                    );
                })}

                {/* Empty slots for RPG feel */}
                {[...Array(Math.max(0, 4 - filteredItems.length))].map((_, i) => (
                    <div key={`empty-${i}`} className="inventory-item empty-slot">
                        <div className="empty-plus">+</div>
                    </div>
                ))}
            </div>


        </div>
    );
};

export default Inventory;

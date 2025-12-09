import React from 'react';
import { X, ArrowDownCircle, Check, Ban, Package } from 'lucide-react';
import './CraftingModal.css';

const InboxModal = ({ isOpen, onClose, transfers, onAccept, onReject }) => {
    if (!isOpen) return null;

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <button className="close-btn" onClick={onClose}><X size={24} /></button>
                
                <h2 className="modal-title">
                    <ArrowDownCircle size={20} /> Incoming Transfers
                </h2>

                <div className="ingredients-list" style={{ marginTop: 20 }}>
                    {transfers.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: 40, opacity: 0.5 }}>
                            <Package size={48} style={{ margin: '0 auto 10px', opacity: 0.5 }} />
                            <p>No pending transfers</p>
                        </div>
                    ) : (
                        transfers.map(transfer => (
                            <div key={transfer.id} className="ingredient-row" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 10, padding: 12, background: 'rgba(255,255,255,0.05)', marginBottom: 10 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: 8 }}>
                                    <span style={{ fontWeight: 'bold', color: '#fbbf24' }}>From: {transfer.fromUser.name}</span>
                                    <span style={{ fontSize: 10, opacity: 0.6 }}>{new Date(transfer.timestamp).toLocaleTimeString()}</span>
                                </div>
                                
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%' }}>
                                    <div className={`preview-icon rarity-${transfer.item.rarity.toLowerCase()}`} style={{ width: 48, height: 48, fontSize: 20, minWidth: 48 }}>
                                        <Package size={24} />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 'bold' }}>{transfer.item.name}</div>
                                        <div style={{ fontSize: 12, opacity: 0.7, display: 'flex', gap: 8 }}>
                                            <span>Qty: {transfer.quantity}</span>
                                            <span className={`rarity-tag rarity-${transfer.item.rarity.toLowerCase()}`} style={{ fontSize: 10, padding: '0 4px', borderRadius: 4 }}>
                                                {transfer.item.rarity}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', gap: 10, width: '100%', marginTop: 5 }}>
                                    <button 
                                        className="craft-submit-btn" 
                                        style={{ background: 'rgba(239, 68, 68, 0.2)', border: '1px solid #ef4444', marginTop: 0, color: '#ef4444' }}
                                        onClick={() => onReject(transfer.id)}
                                    >
                                        Reject
                                    </button>
                                    <button 
                                        className="craft-submit-btn" 
                                        style={{ background: '#22c55e', marginTop: 0 }}
                                        onClick={() => onAccept(transfer)}
                                    >
                                        Accept
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default InboxModal;



import React from 'react';
import { X } from 'lucide-react';
import EditProfile from './EditProfile';
import './AskQuestionModal.css'; // Використовуємо існуючі стилі модалки для економії

const EditProfileModal = ({ isOpen, onClose, user, onSave }) => {
    if (!isOpen) return null;

    return (
        <div className="question-modal-overlay" onClick={onClose} style={{ zIndex: 1000}}>
            <div 
                className="question-modal-content" 
                onClick={e => e.stopPropagation()} 
                style={{ 
                    width: '90%', 
                    maxWidth: '500px', 
                    maxHeight: '90vh', 
                    overflowY: 'auto',
                    padding: '20px',
                    background: 'var(--card-bg)',
                    border: '1px solid var(--card-border)',
                }}
            >
                <div className="question-header" style={{ marginBottom: '15px' }}>
                    <h3 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '18px' }}>Налаштування профілю</h3>
                    <button className="close-btn" onClick={onClose}>
                        <X size={24} />
                    </button>
                </div>
                
                <div className="profile-modal-body">
                    <EditProfile user={user} onSave={(data) => {
                        onSave(data);
                        onClose(); // Закриваємо модалку після збереження
                    }} />
                </div>
            </div>
        </div>
    );
};

export default EditProfileModal;

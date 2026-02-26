import React, { useState } from 'react';
import { X, Send } from 'lucide-react';
import './AskQuestionModal.css';

const AskQuestionModal = ({ isOpen, onClose, onSend, month, year }) => {
    const [question, setQuestion] = useState('');
    const [isSending, setIsSending] = useState(false);

    if (!isOpen) return null;

    const handleSend = async () => {
        if (!question.trim()) return;
        
        setIsSending(true);
        await onSend(question);
        setIsSending(false);
        setQuestion('');
        onClose();
    };

    return (
        <div className="question-modal-overlay" onClick={onClose}>
            <div className="question-modal-content" onClick={e => e.stopPropagation()}>
                <div className="question-header">
                    <h3>Ask a Question</h3>
                    <button className="close-btn" onClick={onClose}>
                        <X size={24} />
                    </button>
                </div>
                
                <div className="question-body">
                    <p className="context-info">Regarding report for: {month}/{year}</p>
                    <textarea 
                        className="question-input"
                        placeholder="Type your question here..."
                        value={question}
                        onChange={(e) => setQuestion(e.target.value)}
                        autoFocus
                    />
                </div>

                <div className="question-footer">
                    <button 
                        className="send-btn" 
                        onClick={handleSend}
                        disabled={!question.trim() || isSending}
                    >
                        <Send size={16} />
                        {isSending ? 'Sending...' : 'Send'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AskQuestionModal;
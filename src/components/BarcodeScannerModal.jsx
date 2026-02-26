import React, { useState, useEffect, useRef } from 'react';
import { X, Scan, Camera, Search } from 'lucide-react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import './BarcodeScannerModal.css';

const BarcodeScannerModal = ({ isOpen, onClose, onScan }) => {
    const [barcode, setBarcode] = useState('');
    const [isCameraActive, setIsCameraActive] = useState(false);
    const scannerRef = useRef(null);
    const inputRef = useRef(null);

    useEffect(() => {
        if (isOpen) {
            setBarcode('');
            setIsCameraActive(false);
            if (inputRef.current) {
                inputRef.current.focus();
            }
        } else {
            stopScanner();
        }
        return () => stopScanner();
    }, [isOpen]);

    useEffect(() => {
        if (isCameraActive) {
            startScanner();
        } else {
            stopScanner();
        }
    }, [isCameraActive]);

    const startScanner = () => {
        setTimeout(() => {
            if (!scannerRef.current && document.getElementById('reader')) {
                scannerRef.current = new Html5QrcodeScanner(
                    "reader",
                    { 
                        fps: 10, 
                        qrbox: { width: 250, height: 250 },
                        aspectRatio: 1.0
                    },
                    false
                );
                
                scannerRef.current.render(handleScanSuccess, handleScanFailure);
            }
        }, 100);
    };

    const stopScanner = () => {
        if (scannerRef.current) {
            try {
                scannerRef.current.clear().catch(console.error);
            } catch (e) {
                console.error("Error clearing scanner", e);
            }
            scannerRef.current = null;
        }
    };

    const handleScanSuccess = (decodedText) => {
        onScan(decodedText);
        onClose();
    };

    const handleScanFailure = (error) => {
        // console.warn(error);
    };

    const handleManualSubmit = () => {
        if (barcode.trim()) {
            onScan(barcode);
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="scanner-modal-overlay" onClick={onClose}>
            <div className="scanner-modal-content" onClick={e => e.stopPropagation()}>
                <div className="scanner-header">
                    <h3>Scan Barcode</h3>
                    <button className="close-btn" onClick={onClose}>
                        <X size={24} />
                    </button>
                </div>

                <div className="scanner-body">
                    <div className="input-group">
                        <input
                            ref={inputRef}
                            type="text"
                            className="scanner-input"
                            placeholder="Enter barcode manually..."
                            value={barcode}
                            onChange={(e) => setBarcode(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleManualSubmit()}
                        />
                        <button className="search-btn" onClick={handleManualSubmit}>
                            <Search size={20} />
                        </button>
                    </div>

                    <div className="divider">
                        <span>OR</span>
                    </div>

                    {isCameraActive ? (
                        <div className="camera-container">
                            <div id="reader"></div>
                            <button className="stop-camera-btn" onClick={() => setIsCameraActive(false)}>
                                Stop Camera
                            </button>
                        </div>
                    ) : (
                        <button className="start-camera-btn" onClick={() => setIsCameraActive(true)}>
                            <Camera size={24} />
                            <span>Scan with Camera</span>
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default BarcodeScannerModal;



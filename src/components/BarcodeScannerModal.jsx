import React, { useState, useEffect, useRef } from 'react';
import { X, Camera, Search } from 'lucide-react';
import './BarcodeScannerModal.css';

const BarcodeScannerModal = ({ isOpen, onClose, onScan }) => {
    const [barcode, setBarcode] = useState('');
    const [isCameraActive, setIsCameraActive] = useState(false);
    const scannerRef = useRef(null);
    const inputRef = useRef(null);

    // Keep latest callbacks available to the async scanner without re-creating it
    const onScanRef = useRef(onScan);
    const onCloseRef = useRef(onClose);
    onScanRef.current = onScan;
    onCloseRef.current = onClose;

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
        if (!isCameraActive) {
            stopScanner();
            return;
        }

        let cancelled = false;
        // html5-qrcode is heavy — load it only when the camera is actually started.
        // The timeout gives React time to mount the #reader container first.
        const timer = setTimeout(async () => {
            const { Html5QrcodeScanner } = await import('html5-qrcode');
            if (cancelled || scannerRef.current || !document.getElementById('reader')) return;

            scannerRef.current = new Html5QrcodeScanner(
                "reader",
                {
                    fps: 10,
                    qrbox: { width: 250, height: 250 },
                    aspectRatio: 1.0
                },
                false
            );

            scannerRef.current.render(
                (decodedText) => {
                    onScanRef.current(decodedText);
                    onCloseRef.current();
                },
                () => { /* per-frame decode misses are expected — ignore */ }
            );
        }, 100);

        return () => {
            cancelled = true;
            clearTimeout(timer);
        };
    }, [isCameraActive]);

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
                    <h3>Сканувати штрихкод</h3>
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
                            placeholder="Введіть штрихкод вручну..."
                            value={barcode}
                            onChange={(e) => setBarcode(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleManualSubmit()}
                        />
                        <button className="search-btn" onClick={handleManualSubmit}>
                            <Search size={20} />
                        </button>
                    </div>

                    <div className="divider">
                        <span>АБО</span>
                    </div>

                    {isCameraActive ? (
                        <div className="camera-container">
                            <div id="reader"></div>
                            <button className="stop-camera-btn" onClick={() => setIsCameraActive(false)}>
                                Зупинити камеру
                            </button>
                        </div>
                    ) : (
                        <button className="start-camera-btn" onClick={() => setIsCameraActive(true)}>
                            <Camera size={24} />
                            <span>Сканувати камерою</span>
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default BarcodeScannerModal;

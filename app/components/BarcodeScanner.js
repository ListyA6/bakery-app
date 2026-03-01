"use client";

import { useState } from 'react';
import QrReader from 'react-qr-barcode-scanner';

export default function BarcodeScanner({ onScan, onClose }) {
  const [error, setError] = useState('');

  const handleScan = (data) => {
    if (data && data.text) {
      onScan(data.text);
    } else if (data) {
      // Handle case where data might be just a string
      onScan(data);
    }
  };

  const handleError = (err) => {
    console.error(err);
    setError('Camera error: Please make sure you have given camera permissions');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-4 rounded-lg max-w-lg w-full">
        <div className="flex justify-between mb-4">
          <h3 className="text-lg font-bold">Scan Barcode</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">✕</button>
        </div>
        
        {error ? (
          <div className="bg-red-50 p-4 rounded-lg text-red-600 mb-4">
            {error}
          </div>
        ) : (
          <div className="aspect-video relative bg-black rounded-lg overflow-hidden">
            <QrReader
              onScan={handleScan}
              onError={handleError}
              constraints={{ facingMode: 'environment' }}
              style={{ width: '100%', height: '100%' }}
            />
          </div>
        )}
        
        <p className="text-sm text-gray-500 mt-4">
          Position the barcode in front of the camera
        </p>
        <p className="text-xs text-gray-400 mt-1">
          Test barcodes: 123456789 (Flour), 987654321 (Sugar)
        </p>
      </div>
    </div>
  );
}
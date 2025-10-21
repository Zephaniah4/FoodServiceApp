import React, { useRef, useState, useEffect } from "react";

function StaffSignaturePad({ registrationId, onSave, onCancel }) {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    context.strokeStyle = '#000000';
    context.lineWidth = 2;
    context.lineCap = 'round';
  }, []);

  const startDrawing = (e) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const context = canvas.getContext('2d');
    
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    context.beginPath();
    context.moveTo(x, y);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const context = canvas.getContext('2d');
    
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    context.lineTo(x, y);
    context.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    context.clearRect(0, 0, canvas.width, canvas.height);
  };

  const saveSignature = () => {
    const canvas = canvasRef.current;
    const signatureData = canvas.toDataURL('image/png');
    onSave(signatureData);
  };

  return (
    <div style={{ textAlign: 'center' }}>
      <p style={{ marginBottom: '10px', fontSize: '14px', color: '#666' }}>
        Draw your signature in the box below
      </p>
      <canvas
        ref={canvasRef}
        width={400}
        height={150}
        style={{
          border: '2px solid #333',
          backgroundColor: '#fff',
          cursor: 'crosshair',
          display: 'block',
          margin: '0 auto'
        }}
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
      />
      <div style={{ marginTop: '15px', display: 'flex', gap: '10px', justifyContent: 'center' }}>
        <button
          onClick={clearCanvas}
          style={{
            padding: '8px 16px',
            fontSize: '14px',
            backgroundColor: '#f44336',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Clear
        </button>
        <button
          onClick={saveSignature}
          style={{
            padding: '8px 16px',
            fontSize: '14px',
            backgroundColor: '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Save Signature
        </button>
        <button
          onClick={onCancel}
          style={{
            padding: '8px 16px',
            fontSize: '14px',
            backgroundColor: '#757575',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

export default StaffSignaturePad;
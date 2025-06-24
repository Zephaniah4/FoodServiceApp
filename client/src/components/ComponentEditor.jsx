import React, { useState, useRef, useEffect, useCallback } from 'react';
import './ComponentEditor.css';

const ComponentEditor = ({ children, componentId, onSettingsChange }) => {
  const [isEditMode, setIsEditMode] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });  const [settings, setSettings] = useState(() => {
    // Initialize with saved settings if available
    const savedSettings = localStorage.getItem(`component-${componentId || 'daily-totals'}`);
    if (savedSettings) {
      try {
        return JSON.parse(savedSettings);
      } catch (error) {
        console.error('Error parsing saved settings:', error);
      }
    }
    // Return default settings if no saved settings
    return {
      position: { top: 20, left: 'auto', right: 20, bottom: 'auto' },
      size: { width: 224, height: 'auto' },
      colors: {
        background: '#f8f9fa',
        border: '#40692e',
        text: '#40692e',
        countText: '#2c5234',
        itemBackground: '#ffffff'
      },
      typography: {
        titleSize: 14,
        labelSize: 10,
        countSize: 19,
        fontFamily: 'Arial'
      },
      spacing: {
        padding: 16,
        borderRadius: 10,
        itemPadding: 10,
        gap: 10
      },
      borders: {
        borderWidth: 2,
        itemBorderWidth: 2,
        shadowBlur: 12
      },
      layout: {
        titleAlign: 'center',
        dateLayout: 'horizontal',
        totalsLayout: 'horizontal'
      },
      visible: true
    };
  });
  
  const componentRef = useRef(null);
  const [showControls, setShowControls] = useState(false);  // Update settings if componentId changes
  useEffect(() => {
    const savedSettings = localStorage.getItem(`component-${componentId}`);
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setSettings(parsed);
      } catch (error) {
        console.error('Error parsing saved settings:', error);
      }
    }
  }, [componentId]);

  // Save settings to localStorage when they change
  useEffect(() => {
    localStorage.setItem(`component-${componentId}`, JSON.stringify(settings));
    if (onSettingsChange) {
      onSettingsChange(settings);
    }
  }, [settings, componentId, onSettingsChange]);
  const handleMouseDown = (e) => {
    if (!isEditMode) return;
    
    // Don't start dragging if clicking on the controls panel or input elements
    if (e.target.closest('.controls-panel') || 
        e.target.tagName === 'INPUT' || 
        e.target.tagName === 'SELECT' ||
        e.target.tagName === 'BUTTON') {
      return;
    }
    
    const rect = componentRef.current.getBoundingClientRect();
    setIsDragging(true);
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
    e.preventDefault();
  };  const handleMouseMove = useCallback((e) => {
    if (!isDragging || !isEditMode) return;
    
    const parentRect = componentRef.current.parentElement.getBoundingClientRect();
    const newTop = e.clientY - parentRect.top - dragOffset.y;
    const newLeft = e.clientX - parentRect.left - dragOffset.x;
    
    setSettings(prev => {
      const newSettings = {
        ...prev,
        position: {
          ...prev.position,
          top: Math.max(0, newTop),
          left: Math.max(0, newLeft),
          right: 'auto'
        }
      };
      // Save immediately during drag
      localStorage.setItem(`component-${componentId}`, JSON.stringify(newSettings));
      return newSettings;
    });
  }, [isDragging, isEditMode, dragOffset.y, dragOffset.x, componentId]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);  const updateSetting = (path, value) => {
    setSettings(prev => {
      const newSettings = { ...prev };
      const keys = path.split('.');
      let current = newSettings;
      
      for (let i = 0; i < keys.length - 1; i++) {
        current = current[keys[i]];
      }
      current[keys[keys.length - 1]] = value;
        // Immediately save to localStorage
      localStorage.setItem(`component-${componentId}`, JSON.stringify(newSettings));
      
      return newSettings;
    });
  };
  const resetPosition = () => {
    const newSettings = {
      ...settings,
      position: { top: 20, left: 'auto', right: 20, bottom: 'auto' }
    };    setSettings(newSettings);
    localStorage.setItem(`component-${componentId}`, JSON.stringify(newSettings));
  };  const getPositionStyle = () => {
    const { position, size } = settings;    const style = {
      position: 'absolute',
      top: position.top !== 'auto' ? `${position.top}px` : 'auto',
      left: position.left !== 'auto' ? `${position.left}px` : 'auto',
      right: position.right !== 'auto' ? `${position.right}px` : 'auto',
      bottom: position.bottom !== 'auto' ? `${position.bottom}px` : 'auto',
      width: size.width !== 'auto' ? `${size.width}px` : 'auto',
      // Don't apply height to wrapper - let it be controlled by inner component
      cursor: isEditMode ? 'move' : 'default',
      display: settings.visible ? 'block' : 'none'
    };
    return style;
  };

  if (!settings.visible) {
    return null;
  }
  return (
    <>
      {/* Edit Mode Toggle Button - Always Visible */}
      <button
        className="edit-mode-toggle"        onClick={() => {
          setIsEditMode(!isEditMode);
        }}
        title={isEditMode ? "Exit Edit Mode" : "Enter Edit Mode"}
        style={{ 
          position: 'fixed',
          top: '60px',
          left: '10px',
          zIndex: 9999,
          background: isEditMode ? '#dc3545' : '#40692e'
        }}
      >
        {isEditMode ? '🔒' : '✏️'}
      </button>      {/* Component Wrapper */}
      <div
        ref={componentRef}
        className={`component-editor-wrapper ${isEditMode ? 'edit-mode' : ''}`}
        style={getPositionStyle()}
        onMouseDown={handleMouseDown}        onMouseEnter={() => {
          if (isEditMode) {
            setShowControls(true);
          }
        }}
        onMouseLeave={() => {
          setShowControls(false);
        }}
      >
        {/* Edit Mode Overlay */}
        {isEditMode && (
          <div className="edit-overlay">
            <div className="edit-handle">📋 EDIT MODE</div>
          </div>
        )}        {/* Component Content */}
        <div 
          style={{
            // Apply CSS variables to the component content itself
            '--bg-color': settings.colors.background,
            '--border-color': settings.colors.border,
            '--text-color': settings.colors.text,
            '--count-text-color': settings.colors.countText,
            '--item-bg-color': settings.colors.itemBackground,
            '--title-size': `${settings.typography.titleSize}px`,
            '--label-size': `${settings.typography.labelSize}px`,
            '--count-size': `${settings.typography.countSize}px`,
            '--font-family': settings.typography.fontFamily,
            '--component-padding': `${settings.spacing.padding}px`,
            '--component-border-radius': `${settings.spacing.borderRadius}px`,
            '--item-padding': `${settings.spacing.itemPadding}px`,
            '--content-gap': `${settings.spacing.gap}px`,
            '--component-border-width': `${settings.borders.borderWidth}px`,
            '--item-border-width': `${settings.borders.itemBorderWidth}px`,            '--component-shadow-blur': `${settings.borders.shadowBlur}px`,
            '--component-min-width': `${settings.size.width}px`,
            '--component-height': settings.size.height !== 'auto' ? `${settings.size.height}px` : 'auto',
            '--title-align': settings.layout.titleAlign,
            '--date-layout': settings.layout.dateLayout === 'vertical' ? 'block' : 'flex',
            '--totals-layout': settings.layout.totalsLayout === 'vertical' ? 'block' : 'flex'
          }}
        >
          {children}
        </div>{/* Controls Panel */}
        {isEditMode && (
          <div 
            className="controls-panel"
            style={{
              display: showControls ? 'block' : 'none'
            }}
            onMouseEnter={() => setShowControls(true)}
            onMouseLeave={() => setShowControls(false)}
          >            <div style={{ marginBottom: '8px', fontWeight: 'bold', color: '#40692e', textAlign: 'center' }}>
              📝 Component Editor
            </div>
            {/* Position Controls */}
            <div className="controls-section">
              <h4>📍 Position</h4>
              <div className="control-row">
                <label>Top:</label>
                <input
                  type="number"
                  value={settings.position.top}
                  onChange={(e) => updateSetting('position.top', parseInt(e.target.value))}
                />
              </div>
              <div className="control-row">
                <label>Right:</label>
                <input
                  type="number"
                  value={settings.position.right === 'auto' ? '' : settings.position.right}
                  onChange={(e) => updateSetting('position.right', e.target.value ? parseInt(e.target.value) : 'auto')}
                />
              </div>
              <button onClick={resetPosition} className="reset-btn">Reset Position</button>
            </div>            {/* Size Controls */}
            <div className="controls-section">
              <h4>📏 Size</h4>              <div className="control-row">
                <label>Width:</label>
                <input
                  type="number"
                  value={settings.size.width}
                  onChange={(e) => {
                    const newValue = parseInt(e.target.value) || 224;
                    updateSetting('size.width', newValue);
                  }}
                  min="150"
                  max="500"
                />
              </div>
              <div className="control-row">
                <label>Height:</label>
                <input
                  type="number"
                  value={settings.size.height === 'auto' ? '' : settings.size.height}
                  onChange={(e) => {
                    const newValue = e.target.value ? parseInt(e.target.value) : 'auto';
                    updateSetting('size.height', newValue);
                  }}
                  min="100"
                  max="800"
                  placeholder="auto"
                />
              </div>
            </div>

            {/* Colors */}
            <div className="controls-section">
              <h4>🎨 Colors</h4>
              <div className="control-row">
                <label>Background:</label>
                <input
                  type="color"
                  value={settings.colors.background}
                  onChange={(e) => updateSetting('colors.background', e.target.value)}
                />
              </div>
              <div className="control-row">
                <label>Border:</label>
                <input
                  type="color"
                  value={settings.colors.border}
                  onChange={(e) => updateSetting('colors.border', e.target.value)}
                />
              </div>
              <div className="control-row">
                <label>Text:</label>
                <input
                  type="color"
                  value={settings.colors.text}
                  onChange={(e) => updateSetting('colors.text', e.target.value)}
                />
              </div>
              <div className="control-row">
                <label>Numbers:</label>
                <input
                  type="color"
                  value={settings.colors.countText}
                  onChange={(e) => updateSetting('colors.countText', e.target.value)}
                />
              </div>
              <div className="control-row">
                <label>Item BG:</label>
                <input
                  type="color"
                  value={settings.colors.itemBackground}
                  onChange={(e) => updateSetting('colors.itemBackground', e.target.value)}
                />
              </div>
            </div>

            {/* Typography */}
            <div className="controls-section">
              <h4>🔤 Typography</h4>
              <div className="control-row">
                <label>Title Size:</label>
                <input
                  type="number"
                  value={settings.typography.titleSize}
                  onChange={(e) => updateSetting('typography.titleSize', parseInt(e.target.value))}
                  min="10"
                  max="24"
                />
              </div>
              <div className="control-row">
                <label>Label Size:</label>
                <input
                  type="number"
                  value={settings.typography.labelSize}
                  onChange={(e) => updateSetting('typography.labelSize', parseInt(e.target.value))}
                  min="8"
                  max="16"
                />
              </div>
              <div className="control-row">
                <label>Count Size:</label>
                <input
                  type="number"
                  value={settings.typography.countSize}
                  onChange={(e) => updateSetting('typography.countSize', parseInt(e.target.value))}
                  min="12"
                  max="32"
                />
              </div>
              <div className="control-row">
                <label>Font:</label>
                <select
                  value={settings.typography.fontFamily}
                  onChange={(e) => updateSetting('typography.fontFamily', e.target.value)}
                  style={{ padding: '4px', fontSize: '11px', borderRadius: '4px', border: '1px solid #ced4da' }}
                >
                  <option value="Arial">Arial</option>
                  <option value="Georgia">Georgia</option>
                  <option value="Times New Roman">Times</option>
                  <option value="Courier New">Courier</option>
                  <option value="Verdana">Verdana</option>
                  <option value="Helvetica">Helvetica</option>
                </select>
              </div>
            </div>

            {/* Spacing */}
            <div className="controls-section">
              <h4>📐 Spacing</h4>
              <div className="control-row">
                <label>Padding:</label>
                <input
                  type="number"
                  value={settings.spacing.padding}
                  onChange={(e) => updateSetting('spacing.padding', parseInt(e.target.value))}
                  min="5"
                  max="40"
                />
              </div>
              <div className="control-row">
                <label>Border Radius:</label>
                <input
                  type="number"
                  value={settings.spacing.borderRadius}
                  onChange={(e) => updateSetting('spacing.borderRadius', parseInt(e.target.value))}
                  min="0"
                  max="20"
                />
              </div>
              <div className="control-row">
                <label>Item Padding:</label>
                <input
                  type="number"
                  value={settings.spacing.itemPadding}
                  onChange={(e) => updateSetting('spacing.itemPadding', parseInt(e.target.value))}
                  min="5"
                  max="20"
                />
              </div>
              <div className="control-row">
                <label>Gap:</label>
                <input
                  type="number"
                  value={settings.spacing.gap}
                  onChange={(e) => updateSetting('spacing.gap', parseInt(e.target.value))}
                  min="5"
                  max="20"
                />
              </div>
            </div>

            {/* Borders & Effects */}
            <div className="controls-section">
              <h4>🔲 Borders & Effects</h4>
              <div className="control-row">
                <label>Border Width:</label>
                <input
                  type="number"
                  value={settings.borders.borderWidth}
                  onChange={(e) => updateSetting('borders.borderWidth', parseInt(e.target.value))}
                  min="0"
                  max="5"
                />
              </div>
              <div className="control-row">
                <label>Item Border:</label>
                <input
                  type="number"
                  value={settings.borders.itemBorderWidth}
                  onChange={(e) => updateSetting('borders.itemBorderWidth', parseInt(e.target.value))}
                  min="0"
                  max="5"
                />
              </div>
              <div className="control-row">
                <label>Shadow:</label>
                <input
                  type="number"
                  value={settings.borders.shadowBlur}
                  onChange={(e) => updateSetting('borders.shadowBlur', parseInt(e.target.value))}
                  min="0"
                  max="20"
                />
              </div>
            </div>

            {/* Layout */}
            <div className="controls-section">
              <h4>📋 Layout</h4>
              <div className="control-row">
                <label>Title Align:</label>
                <select
                  value={settings.layout.titleAlign}
                  onChange={(e) => updateSetting('layout.titleAlign', e.target.value)}
                  style={{ padding: '4px', fontSize: '11px', borderRadius: '4px', border: '1px solid #ced4da' }}
                >
                  <option value="left">Left</option>
                  <option value="center">Center</option>
                  <option value="right">Right</option>
                </select>
              </div>
              <div className="control-row">
                <label>Date Layout:</label>
                <select
                  value={settings.layout.dateLayout}
                  onChange={(e) => updateSetting('layout.dateLayout', e.target.value)}
                  style={{ padding: '4px', fontSize: '11px', borderRadius: '4px', border: '1px solid #ced4da' }}
                >
                  <option value="horizontal">Horizontal</option>
                  <option value="vertical">Vertical</option>
                </select>
              </div>
              <div className="control-row">
                <label>Totals Layout:</label>
                <select
                  value={settings.layout.totalsLayout}
                  onChange={(e) => updateSetting('layout.totalsLayout', e.target.value)}
                  style={{ padding: '4px', fontSize: '11px', borderRadius: '4px', border: '1px solid #ced4da' }}
                >
                  <option value="horizontal">Horizontal</option>
                  <option value="vertical">Vertical</option>
                </select>
              </div>
            </div>

            {/* Visibility */}
            <div className="controls-section">
              <h4>👁️ Visibility</h4>
              <div className="control-row">
                <label>
                  <input
                    type="checkbox"
                    checked={settings.visible}
                    onChange={(e) => updateSetting('visible', e.target.checked)}
                  />
                  Show Component
                </label>
              </div>
            </div>

            {/* Reset All */}
            <div className="controls-section">
              <button 
                onClick={() => {
                  localStorage.removeItem(`component-${componentId}`);
                  window.location.reload();
                }} 
                className="reset-all-btn"
              >
                🔄 Reset All Settings
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default ComponentEditor;

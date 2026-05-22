import React, { useState } from 'react';
import * as Icons from 'lucide-react';
import { X, Search } from 'lucide-react';

interface IconSelectorProps {
  currentIcon: string;
  onSelectIcon: (iconName: string) => void;
  onClose: () => void;
}

const AVAILABLE_ICONS = [
  'Plus', 'Trash', 'Edit', 'Home', 'Settings', 'Layers', 'Folder', 'Database',
  'Code', 'Shield', 'Check', 'Info', 'AlertTriangle', 'AlertCircle', 'ShoppingCart',
  'User', 'Users', 'Star', 'DollarSign', 'Calendar', 'MapPin', 'Eye', 'Play',
  'Sparkles', 'Menu', 'ArrowRight', 'ArrowLeft', 'Search', 'Bell', 'Mail', 'Lock',
  'Heart', 'FileText', 'Activity', 'BarChart2', 'Image', 'Video', 'Music', 'Cloud',
  'Download', 'Upload', 'Share2', 'CheckCircle2', 'PlusCircle', 'MinusCircle'
];

export const IconSelector: React.FC<IconSelectorProps> = ({
  currentIcon,
  onSelectIcon,
  onClose
}) => {
  const [search, setSearch] = useState('');

  const filteredIcons = AVAILABLE_ICONS.filter(name =>
    name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="modal-overlay">
      <div className="modal-container" style={{ maxWidth: '460px' }}>
        <div className="modal-header">
          <h3 style={{ fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Icons.Sparkles size={18} className="text-accent" style={{ color: '#6366f1' }} />
            Select Custom Icon
          </h3>
          <button className="icon-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }}>
              <Search size={16} />
            </span>
            <input
              type="text"
              className="form-input"
              style={{ paddingLeft: '36px' }}
              placeholder="Search icons..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(5, 1fr)',
              gap: '10px',
              maxHeight: '260px',
              overflowY: 'auto',
              padding: '4px'
            }}
          >
            {filteredIcons.map((iconName) => {
              // Dynamically resolve component reference
              const IconComponent = (Icons as any)[iconName] || Icons.HelpCircle;
              const isSelected = currentIcon === iconName;

              return (
                <button
                  key={iconName}
                  onClick={() => {
                    onSelectIcon(iconName);
                    onClose();
                  }}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    padding: '12px 6px',
                    borderRadius: '8px',
                    border: isSelected ? '1px solid #6366f1' : '1px solid rgba(255,255,255,0.06)',
                    background: isSelected ? 'rgba(99,102,241,0.1)' : 'rgba(255,255,255,0.02)',
                    cursor: 'pointer',
                    color: isSelected ? '#818cf8' : '#94a3b8',
                    transition: 'all 0.15s ease'
                  }}
                  title={iconName}
                  className="icon-selector-btn"
                >
                  <IconComponent size={20} />
                  <span style={{ fontSize: '0.65rem', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%', whiteSpace: 'nowrap' }}>
                    {iconName}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="modal-footer" style={{ padding: '12px 20px' }}>
          <button className="secondary-btn" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

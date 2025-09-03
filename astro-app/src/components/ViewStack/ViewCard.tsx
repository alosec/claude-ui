import { ReactNode } from 'react';
import './view-card.css';

interface ViewCardProps {
  title: string;
  expanded: boolean;
  color: string;
  children: ReactNode;
  onToggle: () => void;
  onMove: (direction: 'up' | 'down') => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
}

export default function ViewCard({
  title,
  expanded,
  color,
  children,
  onToggle,
  onMove,
  canMoveUp,
  canMoveDown
}: ViewCardProps) {
  return (
    <div 
      className={`view-card ${expanded ? 'expanded' : 'collapsed'}`}
      style={{ '--card-color': color } as React.CSSProperties}
    >
      <div className="view-card-header" onClick={onToggle}>
        <div className="view-card-title-section">
          <div className="view-card-expand-icon">
            {expanded ? '▼' : '▶'}
          </div>
          <h3 className="view-card-title">{title}</h3>
        </div>
        
        <div className="view-card-controls">
          <button
            className={`view-card-move-btn ${!canMoveUp ? 'disabled' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              if (canMoveUp) onMove('up');
            }}
            disabled={!canMoveUp}
            aria-label="Move up"
          >
            ↑
          </button>
          <button
            className={`view-card-move-btn ${!canMoveDown ? 'disabled' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              if (canMoveDown) onMove('down');
            }}
            disabled={!canMoveDown}
            aria-label="Move down"
          >
            ↓
          </button>
        </div>
      </div>
      
      {expanded && (
        <div className="view-card-content">
          {children}
        </div>
      )}
    </div>
  );
}
import { useState, useMemo } from 'react';
import './sessions-view.css';

interface Session {
  id: string;
  startTime: Date;
  endTime?: Date;
  interactionCount: number;
  lastActivity: Date;
  status: 'active' | 'completed' | 'idle';
}

// Placeholder session data sorted by most recent timestamp
const generateMockSessions = (): Session[] => {
  const now = new Date();
  const sessions: Session[] = [];
  
  // Generate 8 mock sessions with varying timestamps
  for (let i = 0; i < 8; i++) {
    const hoursAgo = Math.floor(Math.random() * 72) + 1; // 1-72 hours ago
    const startTime = new Date(now.getTime() - (hoursAgo * 60 * 60 * 1000));
    const interactionCount = Math.floor(Math.random() * 50) + 5;
    const lastActivity = new Date(startTime.getTime() + Math.random() * 2 * 60 * 60 * 1000);
    
    const isActive = i < 2 && Math.random() > 0.5;
    const endTime = isActive ? undefined : new Date(lastActivity.getTime() + Math.random() * 30 * 60 * 1000);
    
    sessions.push({
      id: `session-${Date.now()}-${i}`,
      startTime,
      endTime,
      interactionCount,
      lastActivity,
      status: isActive ? 'active' : (Math.random() > 0.3 ? 'completed' : 'idle')
    });
  }
  
  return sessions.sort((a, b) => b.lastActivity.getTime() - a.lastActivity.getTime());
};

const formatRelativeTime = (date: Date): string => {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffMins < 60) {
    return `${diffMins}m ago`;
  } else if (diffHours < 24) {
    return `${diffHours}h ago`;
  } else {
    return `${diffDays}d ago`;
  }
};

const formatDuration = (startTime: Date, endTime?: Date): string => {
  const end = endTime || new Date();
  const durationMs = end.getTime() - startTime.getTime();
  const durationMins = Math.floor(durationMs / (1000 * 60));
  const durationHours = Math.floor(durationMs / (1000 * 60 * 60));
  
  if (durationHours > 0) {
    const remainingMins = durationMins % 60;
    return `${durationHours}h ${remainingMins}m`;
  } else {
    return `${durationMins}m`;
  }
};

const getStatusIcon = (status: Session['status']): string => {
  switch (status) {
    case 'active': return '🟢';
    case 'completed': return '✅';
    case 'idle': return '⏸️';
    default: return '❓';
  }
};

const getStatusLabel = (status: Session['status']): string => {
  switch (status) {
    case 'active': return 'Active';
    case 'completed': return 'Completed';
    case 'idle': return 'Idle';
    default: return 'Unknown';
  }
};

export default function SessionsView() {
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(new Set());
  
  const sessions = useMemo(() => generateMockSessions(), []);
  
  const toggleSession = (sessionId: string) => {
    const newExpanded = new Set(expandedSessions);
    if (newExpanded.has(sessionId)) {
      newExpanded.delete(sessionId);
    } else {
      newExpanded.add(sessionId);
    }
    setExpandedSessions(newExpanded);
  };

  if (sessions.length === 0) {
    return (
      <div className="sessions-view-empty">
        <div className="empty-message">
          <span>💭</span>
          <p>No sessions found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="sessions-view">
      <div className="sessions-header">
        <div className="sessions-count">
          {sessions.length} session{sessions.length !== 1 ? 's' : ''}
        </div>
        <div className="sessions-summary">
          <span className="active-count">
            {sessions.filter(s => s.status === 'active').length} active
          </span>
        </div>
      </div>
      
      <div className="sessions-list">
        {sessions.map((session) => {
          const isExpanded = expandedSessions.has(session.id);
          
          return (
            <div 
              key={session.id} 
              className={`session-item ${session.status}`}
              onClick={() => toggleSession(session.id)}
            >
              <div className="session-header">
                <div className="session-main-info">
                  <span className="expand-icon">
                    {isExpanded ? '▼' : '▶'}
                  </span>
                  
                  <span className="status-icon">
                    {getStatusIcon(session.status)}
                  </span>
                  
                  <div className="session-title">
                    <span className="session-name">
                      Session {session.id.split('-').pop()}
                    </span>
                    <span className="session-time">
                      {formatRelativeTime(session.lastActivity)}
                    </span>
                  </div>
                </div>
                
                <div className="session-stats">
                  <span className="interaction-count">
                    {session.interactionCount} interactions
                  </span>
                </div>
              </div>
              
              {isExpanded && (
                <div className="session-details">
                  <div className="detail-row">
                    <span className="detail-label">Status:</span>
                    <span className="detail-value">{getStatusLabel(session.status)}</span>
                  </div>
                  
                  <div className="detail-row">
                    <span className="detail-label">Started:</span>
                    <span className="detail-value">
                      {session.startTime.toLocaleString()}
                    </span>
                  </div>
                  
                  <div className="detail-row">
                    <span className="detail-label">Duration:</span>
                    <span className="detail-value">
                      {formatDuration(session.startTime, session.endTime)}
                    </span>
                  </div>
                  
                  <div className="detail-row">
                    <span className="detail-label">Last Activity:</span>
                    <span className="detail-value">
                      {session.lastActivity.toLocaleString()}
                    </span>
                  </div>
                  
                  {session.endTime && (
                    <div className="detail-row">
                      <span className="detail-label">Ended:</span>
                      <span className="detail-value">
                        {session.endTime.toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
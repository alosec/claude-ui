import { useState, useRef } from 'react';
import ViewCard from './ViewCard';
import FileExplorerView from './FileExplorerView';
import GitView from './GitView';
import SessionsView from './SessionsView';
import type { FileSystemItem } from '../../services/FilesystemAdapter';
import type { GitStatus } from '../../services/GitAdapter';
import './view-stack.css';

interface ViewStackProps {
  fileTree: FileSystemItem[];
  gitStatus: GitStatus | null;
}

interface ViewConfig {
  id: string;
  title: string;
  component: 'file-explorer' | 'git' | 'sessions';
  expanded: boolean;
  color: string;
}

export default function ViewStack({ fileTree, gitStatus }: ViewStackProps) {
  const [viewConfigs, setViewConfigs] = useState<ViewConfig[]>([
    {
      id: 'file-explorer',
      title: 'Files',
      component: 'file-explorer',
      expanded: true,
      color: 'var(--card-color-1)'
    },
    {
      id: 'git',
      title: 'Git',
      component: 'git',
      expanded: false,
      color: 'var(--card-color-2)'
    },
    {
      id: 'sessions',
      title: 'Sessions',
      component: 'sessions',
      expanded: false,
      color: 'var(--card-color-3)'
    }
  ]);
  
  const [isMoving, setIsMoving] = useState(false);
  const movingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const toggleView = (viewId: string) => {
    setViewConfigs(configs => 
      configs.map(config => 
        config.id === viewId 
          ? { ...config, expanded: !config.expanded }
          : config
      )
    );
  };

  const moveView = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;
    
    setViewConfigs(configs => {
      const newConfigs = [...configs];
      const [movedView] = newConfigs.splice(fromIndex, 1);
      newConfigs.splice(toIndex, 0, movedView);
      return newConfigs;
    });
    
    // Trigger moving state
    setIsMoving(true);
    
    // Clear any existing timeout
    if (movingTimeoutRef.current) {
      clearTimeout(movingTimeoutRef.current);
    }
    
    // Set timeout to fade out moving state after 3 seconds
    movingTimeoutRef.current = setTimeout(() => {
      setIsMoving(false);
      movingTimeoutRef.current = null;
    }, 3000);
  };

  const renderViewContent = (viewConfig: ViewConfig) => {
    switch (viewConfig.component) {
      case 'file-explorer':
        return <FileExplorerView fileTree={fileTree} />;
      case 'git':
        return <GitView gitStatus={gitStatus} />;
      case 'sessions':
        return <SessionsView />;
      default:
        return null;
    }
  };

  return (
    <div className="view-stack">
      {viewConfigs.map((viewConfig, index) => (
        <ViewCard
          key={viewConfig.id}
          title={viewConfig.title}
          expanded={viewConfig.expanded}
          color={viewConfig.color}
          isMoving={isMoving}
          onToggle={() => toggleView(viewConfig.id)}
          onMove={(direction) => {
            const targetIndex = direction === 'up' ? index - 1 : index + 1;
            if (targetIndex >= 0 && targetIndex < viewConfigs.length) {
              moveView(index, targetIndex);
            }
          }}
          canMoveUp={index > 0}
          canMoveDown={index < viewConfigs.length - 1}
        >
          {renderViewContent(viewConfig)}
        </ViewCard>
      ))}
    </div>
  );
}
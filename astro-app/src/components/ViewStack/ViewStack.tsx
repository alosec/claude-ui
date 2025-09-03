import { useState } from 'react';
import ViewCard from './ViewCard';
import FileExplorerView from './FileExplorerView';
import GitChangesView from './GitChangesView';
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
  component: 'file-explorer' | 'git-changes';
  expanded: boolean;
  color: string;
}

export default function ViewStack({ fileTree, gitStatus }: ViewStackProps) {
  const [viewConfigs, setViewConfigs] = useState<ViewConfig[]>([
    {
      id: 'file-explorer',
      title: 'File Explorer',
      component: 'file-explorer',
      expanded: true,
      color: 'var(--card-color-1)'
    },
    {
      id: 'git-changes',
      title: 'Git Changes',
      component: 'git-changes',
      expanded: false,
      color: 'var(--card-color-2)'
    }
  ]);

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
  };

  const renderViewContent = (viewConfig: ViewConfig) => {
    switch (viewConfig.component) {
      case 'file-explorer':
        return <FileExplorerView fileTree={fileTree} />;
      case 'git-changes':
        return <GitChangesView gitStatus={gitStatus} />;
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
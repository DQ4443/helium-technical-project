'use client';

import { useState, useEffect, useCallback } from 'react';
import SideNav from './components/SideNav';
import Editor from './components/Editor';
import LocalizationTable from './components/LocalizationTable';
import { ComponentDB, ComponentEntry } from './lib/database';

export default function Home() {
  const [currentPage, setCurrentPage] = useState<'editor' | 'localization'>('editor');
  const [components, setComponents] = useState<ComponentEntry[]>([]);
  const [activeComponent, setActiveComponent] = useState<ComponentEntry | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [translationsVersion, setTranslationsVersion] = useState(0);

  const db = ComponentDB.getInstance();

  // Load components on mount
  const loadComponents = useCallback(async () => {
    try {
      const data = await db.getAll();
      setComponents(data);
    } catch (error) {
      console.error('Failed to load components:', error);
    } finally {
      setIsLoading(false);
    }
  }, [db]);

  useEffect(() => {
    loadComponents();
  }, [loadComponents]);

  const handleComponentSaved = (component: ComponentEntry) => {
    setComponents(prev => {
      const exists = prev.find(c => c.id === component.id);
      if (exists) {
        // Update existing
        return prev.map(c => c.id === component.id ? component : c);
      } else {
        // Add new at the beginning (most recent first)
        return [component, ...prev];
      }
    });
    setActiveComponent(component);
  };

  const handleComponentSelect = (component: ComponentEntry) => {
    setActiveComponent(component);
    setCurrentPage('editor');
  };

  const handleComponentDelete = async (id: string) => {
    try {
      await db.delete(id);
      setComponents(prev => prev.filter(c => c.id !== id));
      if (activeComponent?.id === id) {
        setActiveComponent(null);
      }
    } catch (error) {
      console.error('Failed to delete component:', error);
    }
  };

  const handleNewComponent = () => {
    setActiveComponent(null);
    setCurrentPage('editor');
  };

  // Called when translations are added/updated
  const handleTranslationsUpdated = () => {
    setTranslationsVersion(v => v + 1);
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-white dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen">
      <SideNav
        currentPage={currentPage}
        onPageChange={setCurrentPage}
        components={components}
        activeComponentId={activeComponent?.id || null}
        onComponentSelect={handleComponentSelect}
        onComponentDelete={handleComponentDelete}
        onNewComponent={handleNewComponent}
      />

      <main className="flex-1 ml-64">
        {currentPage === 'editor' && (
          <Editor
            activeComponent={activeComponent}
            onComponentSaved={handleComponentSaved}
            onNewComponent={handleNewComponent}
            onTranslationsUpdated={handleTranslationsUpdated}
          />
        )}
        {currentPage === 'localization' && (
          <LocalizationTable onTranslationsUpdated={handleTranslationsUpdated} />
        )}
      </main>
    </div>
  );
}

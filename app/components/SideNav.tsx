'use client';

import { ComponentEntry } from '../lib/database';

interface SideNavProps {
  currentPage: 'editor' | 'localization';
  onPageChange: (page: 'editor' | 'localization') => void;
  components: ComponentEntry[];
  activeComponentId: string | null;
  onComponentSelect: (component: ComponentEntry) => void;
  onComponentDelete: (id: string) => void;
  onNewComponent: () => void;
}

export default function SideNav({
  currentPage,
  onPageChange,
  components,
  activeComponentId,
  onComponentSelect,
  onComponentDelete,
  onNewComponent
}: SideNavProps) {
  return (
    <nav className="w-64 h-screen fixed left-0 top-0 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 flex flex-col">
      <div className="p-6">
        {/* Brand */}
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Component Creator</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Build React components with AI</p>
        </div>

        {/* Navigation */}
        <div className="space-y-2">
          <button
            onClick={() => onPageChange('editor')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
              currentPage === 'editor'
                ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            <span className="font-medium">Editor</span>
          </button>

          <button
            onClick={() => onPageChange('localization')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
              currentPage === 'localization'
                ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
            </svg>
            <span className="font-medium">Localization</span>
          </button>
        </div>
      </div>

      {/* Components List - Only show on editor page */}
      {currentPage === 'editor' && (
        <div className="flex-1 overflow-hidden flex flex-col border-t border-gray-200 dark:border-gray-700">
          <div className="p-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Saved Components</h2>
            <button
              onClick={onNewComponent}
              className="p-1.5 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
              title="New Component"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-4 pb-4">
            {components.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-12 h-12 mx-auto mb-3 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400">No saved components yet</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Create one using the chat!</p>
              </div>
            ) : (
              <div className="space-y-2">
                {components.map((component) => (
                  <div
                    key={component.id}
                    className={`group relative rounded-lg border transition-colors cursor-pointer ${
                      activeComponentId === component.id
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`}
                    onClick={() => onComponentSelect(component)}
                  >
                    <div className="p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <h3 className={`text-sm font-medium truncate ${
                            activeComponentId === component.id
                              ? 'text-blue-700 dark:text-blue-400'
                              : 'text-gray-900 dark:text-white'
                          }`}>
                            {component.name}
                          </h3>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {component.chat_history.length} messages
                          </p>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm('Delete this component?')) {
                              onComponentDelete(component.id);
                            }
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400 transition-all"
                          title="Delete component"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}

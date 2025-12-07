'use client';

import { useState, useEffect, useCallback } from 'react';
import { SandpackProvider, SandpackPreview, SandpackCodeEditor, useSandpack, useSandpackNavigation } from '@codesandbox/sandpack-react';
import LocaleSelector from './LocaleSelector';
import { LocalizationDB } from '../lib/database';

interface ComponentPreviewProps {
  componentCode: string;
  translationsVersion?: number;
  onCodeChange?: (code: string) => void;
  onSaveOnly?: (code: string) => void; // Save to DB without triggering re-render
  compareMode?: boolean;
  compareLocales?: string[];
}

// Inner component to access Sandpack context and provide save/preview functionality
function CodeEditorWithSave({ onSave }: { onSave: (code: string) => void }) {
  const { sandpack } = useSandpack();
  const { refresh } = useSandpackNavigation();
  const [isSaving, setIsSaving] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [copied, setCopied] = useState(false);

  // Preview button - refresh the Sandpack preview iframe
  const handlePreview = () => {
    setIsRefreshing(true);
    refresh();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  // Copy code to clipboard
  const handleCopy = async () => {
    const componentFile = sandpack.files['/Component.js'];
    if (componentFile) {
      await navigator.clipboard.writeText(componentFile.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Save button - save current code to database
  const handleSave = () => {
    const componentFile = sandpack.files['/Component.js'];
    if (componentFile) {
      setIsSaving(true);
      onSave(componentFile.code);
      setTimeout(() => setIsSaving(false), 1000);
    }
  };

  return (
    <div className="flex w-full h-full">
      <div className="w-1/2 h-full border-r border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col">
        {/* Header with buttons */}
        <div className="flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Component.js</span>
          <div className="flex items-center gap-2">
            {/* Copy button */}
            <button
              onClick={handleCopy}
              className={`flex items-center gap-1.5 px-2 py-1.5 text-xs font-medium rounded-md transition-colors ${
                copied
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                  : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-400'
              }`}
              title="Copy code"
            >
              {copied ? (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Copied!
                </>
              ) : (
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              )}
            </button>
            {/* Preview button */}
            <button
              onClick={handlePreview}
              disabled={isRefreshing}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                isRefreshing
                  ? 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                  : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300'
              }`}
            >
              {isRefreshing ? (
                <>
                  <svg className="w-3.5 h-3.5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Refreshing...
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Preview
                </>
              )}
            </button>
            {/* Save button */}
            <button
              onClick={handleSave}
              disabled={isSaving}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                isSaving
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                  : 'bg-blue-500 hover:bg-blue-600 text-white'
              }`}
            >
              {isSaving ? (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Saved!
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                  </svg>
                  Save Changes
                </>
              )}
            </button>
          </div>
        </div>
        {/* Code editor */}
        <div className="flex-1 overflow-hidden">
          <SandpackCodeEditor
            style={{ height: '100%' }}
            showTabs={false}
            showLineNumbers={true}
            showInlineErrors={true}
            wrapContent={true}
          />
        </div>
      </div>
      <div className="w-1/2 h-full">
        <SandpackPreview
          style={{ height: '100%', width: '100%' }}
          showOpenInCodeSandbox={false}
          showRefreshButton={true}
        />
      </div>
    </div>
  );
}

const ALL_LOCALES = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'ja', name: '日本語', flag: '🇯🇵' },
  { code: 'zh', name: '中文', flag: '🇨🇳' },
];

export default function ComponentPreview({
  componentCode,
  translationsVersion = 0,
  onCodeChange,
  onSaveOnly,
  compareMode = false,
  compareLocales = ['en', 'es', 'fr']
}: ComponentPreviewProps) {
  const [processedCode, setProcessedCode] = useState<string>('');
  const [currentLocale, setCurrentLocale] = useState<string>('en');
  const [sandpackKey, setSandpackKey] = useState(0);
  const [codeEditorKey, setCodeEditorKey] = useState(0);
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [englishFallback, setEnglishFallback] = useState<Record<string, string>>({});
  const [viewMode, setViewMode] = useState<'preview' | 'code' | 'compare'>('preview');
  const [allTranslations, setAllTranslations] = useState<Record<string, Record<string, string>>>({});
  const [selectedCompareLocales, setSelectedCompareLocales] = useState<string[]>(compareLocales);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const localizationDb = LocalizationDB.getInstance();

  // Handle save from code editor - use onSaveOnly to avoid re-render
  const handleCodeSave = useCallback((code: string) => {
    // Use onSaveOnly if available (saves to DB without triggering re-render)
    if (onSaveOnly) {
      onSaveOnly(code);
    } else {
      onCodeChange?.(code);
    }
  }, [onSaveOnly, onCodeChange]);

  // Load translations when locale or version changes
  useEffect(() => {
    const loadTranslations = async () => {
      try {
        // Always load English as fallback
        const enData = await localizationDb.getTranslations('en');
        setEnglishFallback(enData);

        // Load current locale translations
        const data = await localizationDb.getTranslations(currentLocale);
        setTranslations(data);
        console.log('Loaded translations for', currentLocale, ':', data);

        // Load all translations for compare mode
        const all: Record<string, Record<string, string>> = {};
        for (const locale of ALL_LOCALES) {
          all[locale.code] = await localizationDb.getTranslations(locale.code);
        }
        setAllTranslations(all);
      } catch (error) {
        console.error('Failed to load translations:', error);
      }
    };
    loadTranslations();
  }, [currentLocale, translationsVersion, localizationDb]);

  // Toggle a locale in compare view
  const toggleCompareLocale = useCallback((localeCode: string) => {
    setSelectedCompareLocales(prev => {
      if (prev.includes(localeCode)) {
        return prev.filter(l => l !== localeCode);
      } else {
        return [...prev, localeCode];
      }
    });
  }, []);

  useEffect(() => {
    if (!componentCode.trim()) {
      setProcessedCode('');
      return;
    }

    // Process the component code for Sandpack (external change from chat)
    let code = componentCode.trim();

    if (code) {
      // Ensure React import is present
      if (!code.includes('import React') && !code.includes('import * as React')) {
        code = `import React from 'react';\n${code}`;
      }

      // Simple hook detection and import fixing
      const needsHooks: string[] = [];
      if (code.includes('useState') && !code.includes('{ useState')) {
        needsHooks.push('useState');
      }
      if (code.includes('useEffect') && !code.includes('{ useEffect')) {
        needsHooks.push('useEffect');
      }

      if (needsHooks.length > 0) {
        code = code.replace(
          'import React from \'react\';',
          `import React, { ${needsHooks.join(', ')} } from 'react';`
        );
      }
    }

    setProcessedCode(code);
    // Force Sandpack to re-render with new code (only for external changes like new component from chat)
    setSandpackKey(prev => prev + 1);
    setCodeEditorKey(prev => prev + 1);
  }, [componentCode]);

  // Re-render when translations change (use serialized value to prevent infinite loop)
  const translationsJson = JSON.stringify(translations);
  const englishJson = JSON.stringify(englishFallback);
  useEffect(() => {
    // Always increment when translations change to ensure preview updates
    setSandpackKey(prev => prev + 1);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [translationsJson, englishJson]);

  // Show a test component when no code is provided
  const displayCode = processedCode || `import React from 'react';

export default function EmptyState({ t }) {
  return (
    <div style={{
      padding: '40px',
      textAlign: 'center',
      color: '#666',
      fontFamily: 'system-ui, sans-serif'
    }}>
      <div style={{
        width: '64px',
        height: '64px',
        margin: '0 auto 16px',
        backgroundColor: '#f3f4f6',
        borderRadius: '8px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="16,18 22,12 16,6"></polyline>
          <polyline points="8,6 2,12 8,18"></polyline>
        </svg>
      </div>
      <h3 style={{ margin: '0 0 8px', fontSize: '18px', fontWeight: '600' }}>
        Preview Ready
      </h3>
      <p style={{ margin: '0', fontSize: '14px' }}>
        Your component will appear here when generated
      </p>
    </div>
  );
}`;

  // Create a simple App component that renders the user's component with translations
  const appCode = `import React, { useState, useEffect } from 'react';
import Component from './Component';

// Translations from the database (current locale)
const translations = ${translationsJson};
// English fallback for missing translations
const englishFallback = ${englishJson};

// Translation function with English fallback
const t = (key) => {
  // First try current locale
  const value = translations[key];
  if (value && value.trim()) {
    return value;
  }
  // Fall back to English
  const englishValue = englishFallback[key];
  if (englishValue && englishValue.trim()) {
    return englishValue;
  }
  // Last resort: return key
  return key;
};

export default function App() {
  const [locale, setLocale] = useState('${currentLocale}');

  // Listen for locale change messages from parent
  useEffect(() => {
    const handleMessage = (event) => {
      if (event.data?.type === 'LOCALE_CHANGE') {
        setLocale(event.data.locale);
        // Note: In real app, we'd refetch translations here
        // For now, parent will re-render with new translations
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const demoProps = {
    items: [
      { label: 'Home', href: '#home' },
      { label: 'About', href: '#about' },
      { label: 'Services', href: '#services' },
      { label: 'Contact', href: '#contact' }
    ],
    children: 'Click me',
    onClick: () => console.log('Button clicked!'),
    title: 'Demo Title',
    description: 'This is a demo description.',
    placeholder: 'Enter text here...',
    text: 'Demo text',
    name: 'Demo Name',
    value: 'Demo Value',
    locale: locale,
    t: t
  };

  try {
    return (
      <div style={{ padding: '20px', fontFamily: 'system-ui, sans-serif' }}>
        <Component {...demoProps} />
      </div>
    );
  } catch (error) {
    return (
      <div style={{ padding: '20px', color: 'red' }}>
        <h3>Component Error</h3>
        <pre>{error.toString()}</pre>
      </div>
    );
  }
}`;

  // Helper to create Sandpack preview for a specific locale
  const createLocalePreview = (locale: string, localeTranslations: Record<string, string>) => {
    const localeAppCode = `import React, { useState, useEffect } from 'react';
import Component from './Component';

const translations = ${JSON.stringify(localeTranslations)};
const englishFallback = ${JSON.stringify(englishFallback)};

const t = (key) => {
  const value = translations[key];
  if (value && value.trim()) return value;
  const englishValue = englishFallback[key];
  if (englishValue && englishValue.trim()) return englishValue;
  return key;
};

export default function App() {
  const demoProps = {
    items: [
      { label: 'Home', href: '#home' },
      { label: 'About', href: '#about' },
      { label: 'Services', href: '#services' },
      { label: 'Contact', href: '#contact' }
    ],
    children: 'Click me',
    onClick: () => console.log('Button clicked!'),
    title: 'Demo Title',
    description: 'This is a demo description.',
    placeholder: 'Enter text here...',
    text: 'Demo text',
    name: 'Demo Name',
    value: 'Demo Value',
    locale: '${locale}',
    t: t
  };

  try {
    return (
      <div style={{ padding: '20px', fontFamily: 'system-ui, sans-serif' }}>
        <Component {...demoProps} />
      </div>
    );
  } catch (error) {
    return (
      <div style={{ padding: '20px', color: 'red' }}>
        <h3>Component Error</h3>
        <pre>{error.toString()}</pre>
      </div>
    );
  }
}`;
    return localeAppCode;
  };

  return (
    <div className={`h-full flex flex-col ${isFullscreen ? 'fixed inset-0 z-50 bg-white dark:bg-gray-900' : ''}`}>
      <div className="border-b border-gray-200 dark:border-gray-700 p-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* View Mode Tabs */}
            <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
              <button
                onClick={() => setViewMode('preview')}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  viewMode === 'preview'
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                Preview
              </button>
              <button
                onClick={() => setViewMode('code')}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  viewMode === 'code'
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                Code
              </button>
              <button
                onClick={() => setViewMode('compare')}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  viewMode === 'compare'
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                Localization
              </button>
            </div>
            {Object.keys(translations).length > 0 && viewMode !== 'compare' && (
              <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-1 rounded">
                {Object.keys(translations).length} translations
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {viewMode === 'preview' && (
              <LocaleSelector
                currentLocale={currentLocale}
                onLocaleChange={setCurrentLocale}
              />
            )}
            {/* Fullscreen button */}
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                </svg>
              )}
            </button>
          </div>
        </div>
        {/* Localization mode locale selector */}
        {viewMode === 'compare' && (
          <div className="mt-3 flex flex-wrap gap-2">
            {ALL_LOCALES.map(locale => (
              <button
                key={locale.code}
                onClick={() => toggleCompareLocale(locale.code)}
                className={`px-2 py-1 text-xs rounded-full transition-colors ${
                  selectedCompareLocales.includes(locale.code)
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                {locale.flag} {locale.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Preview Mode */}
      {viewMode === 'preview' && (
        <div className="flex-1 min-h-0" style={{ height: '100%', width: '100%' }}>
          <SandpackProvider
            key={sandpackKey}
            template="react"
            theme="light"
            files={{
              '/App.js': appCode,
              '/Component.js': displayCode,
              '/styles.css': `
                @tailwind base;
                @tailwind components;
                @tailwind utilities;
              `,
              'postcss.config.js': `
                module.exports = {
                  plugins: {
                    tailwindcss: {},
                    autoprefixer: {},
                  },
                }
              `,
              'tailwind.config.js': `
                module.exports = {
                  content: [
                    './pages/**/*.{js,ts,jsx,tsx}',
                    './components/**/*.{js,ts,jsx,tsx}',
                  ],
                  theme: {
                    extend: {},
                  },
                  plugins: [],
                }
              `,
            }}
            style={{
              height: '100%',
              width: '100%',
              border: 'none',
              borderRadius: '0'
            }}
            options={{
              autorun: true,
              externalResources: ['https://cdn.tailwindcss.com'],
            }}
          >
            <SandpackPreview
              style={{
                height: '100%',
                width: '100%',
                border: 'none',
                borderRadius: '0'
              }}
              showOpenInCodeSandbox={false}
              showRefreshButton={true}
              actionsChildren={null}
            />
          </SandpackProvider>
        </div>
      )}

      {/* Code Editor Mode */}
      {viewMode === 'code' && (
        <div className="flex-1 min-h-0 flex" style={{ height: '100%', width: '100%' }}>
          <SandpackProvider
            key={`code-${codeEditorKey}`}
            template="react"
            theme="light"
            files={{
              '/App.js': appCode,
              '/Component.js': displayCode,
            }}
            options={{
              autorun: true,
              recompileMode: 'immediate',
              recompileDelay: 300,
              externalResources: ['https://cdn.tailwindcss.com'],
              activeFile: '/Component.js',
            }}
          >
            <CodeEditorWithSave onSave={handleCodeSave} />
          </SandpackProvider>
        </div>
      )}

      {/* Multi-Language Comparison Mode */}
      {viewMode === 'compare' && (
        <div className="flex-1 min-h-0 overflow-auto p-4">
          <div className={`grid gap-4 h-full ${
            selectedCompareLocales.length <= 2 ? 'grid-cols-2' :
            selectedCompareLocales.length <= 3 ? 'grid-cols-3' :
            'grid-cols-2 lg:grid-cols-3'
          }`}>
            {selectedCompareLocales.map(localeCode => {
              const locale = ALL_LOCALES.find(l => l.code === localeCode);
              const localeTranslations = allTranslations[localeCode] || {};
              return (
                <div key={localeCode} className="flex flex-col border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-white dark:bg-gray-800">
                  <div className="bg-gray-50 dark:bg-gray-700 px-3 py-2 border-b border-gray-200 dark:border-gray-600 flex items-center gap-2">
                    <span>{locale?.flag}</span>
                    <span className="font-medium text-sm text-gray-900 dark:text-white">{locale?.name}</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">({Object.keys(localeTranslations).length} keys)</span>
                  </div>
                  <div className="flex-1 min-h-[300px]">
                    <SandpackProvider
                      key={`compare-${localeCode}-${sandpackKey}`}
                      template="react"
                      theme="light"
                      files={{
                        '/App.js': createLocalePreview(localeCode, localeTranslations),
                        '/Component.js': displayCode,
                      }}
                      options={{
                        autorun: true,
                        externalResources: ['https://cdn.tailwindcss.com'],
                      }}
                    >
                      <SandpackPreview
                        style={{ height: '100%', width: '100%' }}
                        showOpenInCodeSandbox={false}
                        showRefreshButton={false}
                      />
                    </SandpackProvider>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

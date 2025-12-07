'use client';

import { useState, useEffect, useCallback } from 'react';
import { SandpackProvider, SandpackPreview, SandpackCodeEditor } from '@codesandbox/sandpack-react';
import LocaleSelector from './LocaleSelector';
import { LocalizationDB } from '../lib/database';

interface ComponentPreviewProps {
  componentCode: string;
  translationsVersion?: number;
  onCodeChange?: (code: string) => void;
  compareMode?: boolean;
  compareLocales?: string[];
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
  compareMode = false,
  compareLocales = ['en', 'es', 'fr']
}: ComponentPreviewProps) {
  const [processedCode, setProcessedCode] = useState<string>('');
  const [currentLocale, setCurrentLocale] = useState<string>('en');
  const [sandpackKey, setSandpackKey] = useState(0);
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [englishFallback, setEnglishFallback] = useState<Record<string, string>>({});
  const [viewMode, setViewMode] = useState<'preview' | 'code' | 'compare'>('preview');
  const [allTranslations, setAllTranslations] = useState<Record<string, Record<string, string>>>({});
  const [selectedCompareLocales, setSelectedCompareLocales] = useState<string[]>(compareLocales);
  const localizationDb = LocalizationDB.getInstance();

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

    // Process the component code for Sandpack
    let code = componentCode.trim();

    if (code) {
      // Ensure React import is present
      if (!code.includes('import React') && !code.includes('import * as React')) {
        code = `import React from 'react';\n${code}`;
      }

      // Simple hook detection and import fixing
      const needsHooks = [];
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
    // Force Sandpack to re-render with new code
    setSandpackKey(prev => prev + 1);
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
    <div className="h-full flex flex-col">
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
                Compare
              </button>
            </div>
            {Object.keys(translations).length > 0 && viewMode !== 'compare' && (
              <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-1 rounded">
                {Object.keys(translations).length} translations
              </span>
            )}
          </div>
          {viewMode === 'preview' && (
            <LocaleSelector
              currentLocale={currentLocale}
              onLocaleChange={setCurrentLocale}
            />
          )}
        </div>
        {/* Compare mode locale selector */}
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
            key={`code-${sandpackKey}`}
            template="react"
            theme="light"
            files={{
              '/App.js': appCode,
              '/Component.js': displayCode,
            }}
            options={{
              autorun: true,
              externalResources: ['https://cdn.tailwindcss.com'],
              activeFile: '/Component.js',
            }}
          >
            <div className="flex w-full h-full">
              <div className="w-1/2 h-full border-r border-gray-200 dark:border-gray-700 overflow-hidden">
                <SandpackCodeEditor
                  style={{ height: '100%' }}
                  showTabs={false}
                  showLineNumbers={true}
                  showInlineErrors={true}
                  wrapContent={true}
                />
              </div>
              <div className="w-1/2 h-full">
                <SandpackPreview
                  style={{ height: '100%', width: '100%' }}
                  showOpenInCodeSandbox={false}
                  showRefreshButton={true}
                />
              </div>
            </div>
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

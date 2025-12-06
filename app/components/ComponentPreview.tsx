'use client';

import { useState, useEffect } from 'react';
import { SandpackProvider, SandpackPreview } from '@codesandbox/sandpack-react';
import LocaleSelector from './LocaleSelector';
import { LocalizationDB } from '../lib/database';

interface ComponentPreviewProps {
  componentCode: string;
  translationsVersion?: number;
}

export default function ComponentPreview({ componentCode, translationsVersion = 0 }: ComponentPreviewProps) {
  const [processedCode, setProcessedCode] = useState<string>('');
  const [currentLocale, setCurrentLocale] = useState<string>('en');
  const [sandpackKey, setSandpackKey] = useState(0);
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [englishFallback, setEnglishFallback] = useState<Record<string, string>>({});
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
      } catch (error) {
        console.error('Failed to load translations:', error);
      }
    };
    loadTranslations();
  }, [currentLocale, translationsVersion, localizationDb]);

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

  return (
    <div className="h-full flex flex-col">
      <div className="border-b border-gray-200 dark:border-gray-700 p-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Live Preview</h2>
            {Object.keys(translations).length > 0 && (
              <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-1 rounded">
                {Object.keys(translations).length} translations loaded
              </span>
            )}
          </div>
          <LocaleSelector
            currentLocale={currentLocale}
            onLocaleChange={setCurrentLocale}
          />
        </div>
      </div>

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
    </div>
  );
}

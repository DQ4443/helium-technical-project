'use client';

import { useChat } from '@ai-sdk/react';
import { useState, useEffect, useCallback } from 'react';
import ComponentPreview from './ComponentPreview';
import { ComponentDB, ComponentEntry, ChatMessage, LocalizationDB } from '../lib/database';

// Component suggestions for users who don't know what to build
const COMPONENT_SUGGESTIONS = [
  {
    category: 'UI Elements',
    items: [
      { name: 'Hero Section', prompt: 'Create a modern hero section with a headline, description, and call-to-action button' },
      { name: 'Pricing Card', prompt: 'Build a pricing card with plan name, price, features list, and subscribe button' },
      { name: 'Testimonial Card', prompt: 'Create a testimonial card with quote, author name, role, and avatar' },
      { name: 'Feature Grid', prompt: 'Design a 3-column feature grid with icons, titles, and descriptions' },
    ]
  },
  {
    category: 'Navigation',
    items: [
      { name: 'Navbar', prompt: 'Create a responsive navigation bar with logo, menu items, and mobile hamburger menu' },
      { name: 'Sidebar', prompt: 'Build a collapsible sidebar with navigation links and icons' },
      { name: 'Breadcrumbs', prompt: 'Create a breadcrumb navigation component' },
      { name: 'Tab Navigation', prompt: 'Design a horizontal tab navigation with active state' },
    ]
  },
  {
    category: 'Forms',
    items: [
      { name: 'Login Form', prompt: 'Create a login form with email, password fields, and submit button' },
      { name: 'Contact Form', prompt: 'Build a contact form with name, email, message fields' },
      { name: 'Search Bar', prompt: 'Create a search bar with icon and placeholder text' },
      { name: 'Newsletter Signup', prompt: 'Design a newsletter signup form with email input and subscribe button' },
    ]
  },
  {
    category: 'Data Display',
    items: [
      { name: 'Stats Card', prompt: 'Create a stats card showing a metric with icon, number, and trend indicator' },
      { name: 'User Profile Card', prompt: 'Build a user profile card with avatar, name, bio, and social links' },
      { name: 'Product Card', prompt: 'Design an e-commerce product card with image, title, price, and add to cart button' },
      { name: 'Blog Post Card', prompt: 'Create a blog post card with image, title, excerpt, author, and date' },
    ]
  },
];

interface EditorProps {
  activeComponent: ComponentEntry | null;
  onComponentSaved: (component: ComponentEntry) => void;
  onNewComponent: () => void;
  onTranslationsUpdated?: () => void;
}

export default function Editor({ activeComponent, onComponentSaved, onNewComponent, onTranslationsUpdated }: EditorProps) {
  const [input, setInput] = useState('');
  const [currentComponent, setCurrentComponent] = useState<string>('');
  const [componentName, setComponentName] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [existingKeys, setExistingKeys] = useState<string[]>([]);
  const [translationsVersion, setTranslationsVersion] = useState(0);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isEnhancingPrompt, setIsEnhancingPrompt] = useState(false);
  const [editMode, setEditMode] = useState<'new' | 'iterate'>('new');
  const [showPreview, setShowPreview] = useState(true);

  const componentDb = ComponentDB.getInstance();
  const localizationDb = LocalizationDB.getInstance();

  // Enhance a non-technical prompt into a more technical one
  const enhancePrompt = async (originalPrompt: string): Promise<string> => {
    setIsEnhancingPrompt(true);
    try {
      const response = await fetch('/api/enhance-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: originalPrompt })
      });
      const data = await response.json();
      return data.enhancedPrompt || originalPrompt;
    } catch (error) {
      console.error('Failed to enhance prompt:', error);
      return originalPrompt;
    } finally {
      setIsEnhancingPrompt(false);
    }
  };

  const handleEnhancePrompt = async () => {
    if (!input.trim()) return;
    const enhanced = await enhancePrompt(input);
    setInput(enhanced);
  };

  // Use a suggestion to start building
  const useSuggestion = (prompt: string, name: string) => {
    setInput(prompt);
    setComponentName(name);
    setShowSuggestions(false);
  };

  // Load existing translation keys on mount
  useEffect(() => {
    const loadKeys = async () => {
      try {
        const entries = await localizationDb.getAll();
        setExistingKeys(entries.map(e => e.key));
      } catch (error) {
        console.error('Failed to load translation keys:', error);
      }
    };
    loadKeys();
  }, [localizationDb, translationsVersion]);

  const { messages, setMessages, sendMessage } = useChat();

  // Load active component into editor when it changes
  useEffect(() => {
    if (activeComponent) {
      setCurrentComponent(activeComponent.code);
      setComponentName(activeComponent.name);
      setEditMode('iterate'); // Set to iterate mode when loading existing component

      // Convert stored chat history to useChat format
      const chatMessages = activeComponent.chat_history.map((msg, idx) => ({
        id: `loaded-${idx}`,
        role: msg.role as 'user' | 'assistant',
        parts: [{ type: 'text' as const, text: msg.content }],
        createdAt: new Date()
      }));
      setMessages(chatMessages);
      setHasUnsavedChanges(false);
    } else {
      // New component mode
      setCurrentComponent('');
      setComponentName('');
      setMessages([]);
      setHasUnsavedChanges(false);
      setEditMode('new');
    }
  }, [activeComponent, setMessages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    // Include existing translation keys in the message context
    let messageText = input;
    if (existingKeys.length > 0) {
      const keysContext = `[Available translation keys: ${existingKeys.join(', ')}]\n\n`;
      messageText = keysContext + input;
    }

    sendMessage({ text: messageText });
    setInput('');
    setHasUnsavedChanges(true);
  };

  // Extract translations from AI response and save to database
  const extractAndSaveTranslations = useCallback(async (text: string) => {
    const translationsRegex = /```translations\n([\s\S]*?)\n```/g;
    const matches = [...text.matchAll(translationsRegex)];

    if (matches.length > 0) {
      try {
        const translationsJson = matches[matches.length - 1][1];
        const translations = JSON.parse(translationsJson) as Record<string, string>;

        console.log('Extracted translations:', translations);

        // Get fresh list of existing keys from database
        const currentEntries = await localizationDb.getAll();
        const currentKeys = new Set(currentEntries.map(e => e.key));

        // Filter to only new keys
        const newTranslations: Record<string, string> = {};
        for (const [key, englishText] of Object.entries(translations)) {
          if (!currentKeys.has(key)) {
            newTranslations[key] = englishText;
          }
        }

        if (Object.keys(newTranslations).length === 0) {
          console.log('No new translation keys to add');
          return;
        }

        console.log('New translations to add:', newTranslations);

        // Call translation API to get all languages
        let autoTranslations: Record<string, Record<string, string>> = {};
        try {
          const response = await fetch('/api/translate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ texts: newTranslations })
          });
          const data = await response.json();
          autoTranslations = data.translations || {};
          console.log('Auto-translations received:', autoTranslations);
        } catch (translateError) {
          console.error('Auto-translation failed, using English only:', translateError);
        }

        // Save each translation to the database with all languages
        for (const [key, englishText] of Object.entries(newTranslations)) {
          const translated = autoTranslations[key] || {};
          const newEntry = {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            key,
            en: englishText,
            es: translated.es || '',
            fr: translated.fr || '',
            de: translated.de || '',
            ja: translated.ja || '',
            zh: translated.zh || ''
          };
          try {
            await localizationDb.create(newEntry);
            console.log('Created new translation key with auto-translations:', key, newEntry);
            currentKeys.add(key); // Prevent duplicates within same batch
          } catch (err) {
            // Key might already exist due to race condition, skip it
            console.log('Key already exists:', key);
          }
        }

        setTranslationsVersion(v => v + 1);
        onTranslationsUpdated?.();
      } catch (error) {
        console.error('Failed to parse or save translations:', error);
      }
    }
  }, [localizationDb, onTranslationsUpdated]);

  // Extract React component code from AI responses
  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    if (lastMessage && lastMessage.role === 'assistant') {
      const textPart = lastMessage.parts?.find(part => part.type === 'text');
      const text = textPart && 'text' in textPart ? textPart.text : '';

      console.log('Extracting code from message, text length:', text.length);

      // Look for React component code in code blocks (exclude translations blocks)
      const codeBlockRegex = /```(?:tsx?|jsx?|react)\n([\s\S]*?)\n```/g;
      const matches = [...text.matchAll(codeBlockRegex)];

      console.log('Found code blocks:', matches.length);

      if (matches.length > 0) {
        // Get the first code block (the component, not translations)
        const componentCode = matches[0][1];
        console.log('Component code extracted, length:', componentCode.length);
        if (componentCode.includes('export default') || componentCode.includes('function') || componentCode.includes('const')) {
          setCurrentComponent(componentCode);
          setHasUnsavedChanges(true);

          // Try to extract component name from the code
          const nameMatch = componentCode.match(/(?:export default function|function|const)\s+(\w+)/);
          if (nameMatch && !componentName) {
            setComponentName(nameMatch[1]);
          }
        }
      }

      // Also extract and save translations
      extractAndSaveTranslations(text);
    }
  }, [messages, componentName, extractAndSaveTranslations]);

  // Convert messages to our ChatMessage format for storage
  const convertMessagesToStorage = useCallback((): ChatMessage[] => {
    return messages.map(msg => {
      const textPart = msg.parts?.find(part => part.type === 'text');
      const content = textPart && 'text' in textPart ? textPart.text : '';
      return {
        role: msg.role as 'user' | 'assistant',
        content
      };
    });
  }, [messages]);

  const handleSave = async () => {
    if (!currentComponent || !componentName.trim()) {
      alert('Please enter a component name');
      return;
    }

    setIsSaving(true);
    try {
      const chatHistory = convertMessagesToStorage();

      if (activeComponent) {
        // Update existing component
        await componentDb.update(activeComponent.id, {
          name: componentName,
          code: currentComponent,
          chat_history: chatHistory
        });

        const updated: ComponentEntry = {
          ...activeComponent,
          name: componentName,
          code: currentComponent,
          chat_history: chatHistory,
          updated_at: new Date().toISOString()
        };
        onComponentSaved(updated);
      } else {
        // Create new component
        const newComponent: ComponentEntry = {
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          name: componentName,
          code: currentComponent,
          chat_history: chatHistory,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        await componentDb.create(newComponent);
        onComponentSaved(newComponent);
      }

      setHasUnsavedChanges(false);
    } catch (error) {
      console.error('Failed to save component:', error);
      alert('Failed to save component');
    } finally {
      setIsSaving(false);
    }
  };

  // Save to DB only (without triggering React state updates)
  const saveToDbOnly = useCallback(async (code: string) => {
    if (!activeComponent || !componentName.trim()) return;

    try {
      const chatHistory = convertMessagesToStorage();
      await componentDb.update(activeComponent.id, {
        name: componentName,
        code: code,
        chat_history: chatHistory
      });

      const updated: ComponentEntry = {
        ...activeComponent,
        name: componentName,
        code: code,
        chat_history: chatHistory,
        updated_at: new Date().toISOString()
      };
      onComponentSaved(updated);
    } catch (error) {
      console.error('Failed to save component:', error);
    }
  }, [activeComponent, componentName, convertMessagesToStorage, componentDb, onComponentSaved]);

  // Determine if we should show the preview panel
  const shouldShowPreview = currentComponent && showPreview;

  return (
    <div className="flex h-full">
      {/* Chat Section */}
      <div className={`flex flex-col relative transition-all duration-300 ${shouldShowPreview ? 'w-1/2' : 'w-full'}`}>
        {/* Header with component name and save */}
        <div className="border-b border-gray-200 dark:border-gray-700 p-4 flex items-center gap-4">
          <button
            onClick={onNewComponent}
            className="p-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            title="New Component"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
          <input
            type="text"
            value={componentName}
            onChange={(e) => {
              setComponentName(e.target.value);
              setHasUnsavedChanges(true);
            }}
            placeholder="Component Name"
            className="flex-1 px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleSave}
            disabled={!currentComponent || !componentName.trim() || isSaving}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
              hasUnsavedChanges && currentComponent && componentName.trim()
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isSaving ? (
              <>
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Saving...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                </svg>
                {activeComponent ? 'Update' : 'Save'}
              </>
            )}
          </button>
          {/* Toggle preview button */}
          {currentComponent && (
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="p-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              title={showPreview ? 'Hide Preview' : 'Show Preview'}
            >
              {showPreview ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                </svg>
              )}
            </button>
          )}
        </div>

        {/* Scrollable Messages Area */}
        <div className="flex-1 overflow-y-auto p-6 pb-32">
          <div className="max-w-2xl mx-auto">
            {messages.length === 0 && !activeComponent && (
              <>
                <div className="mb-8">
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    React Component Creator
                  </h1>
                  <p className="text-gray-600 dark:text-gray-400">
                    Describe the React component you want to create. Text will be automatically localized!
                  </p>
                </div>

                {/* Component Suggestions Toggle */}
                <button
                  onClick={() => setShowSuggestions(!showSuggestions)}
                  className="w-full mb-4 flex items-center justify-between px-4 py-3 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-lg border border-purple-200 dark:border-purple-800 hover:border-purple-300 dark:hover:border-purple-700 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">💡</span>
                    <div className="text-left">
                      <div className="font-medium text-gray-900 dark:text-white text-sm">Need inspiration?</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">Browse component suggestions</div>
                    </div>
                  </div>
                  <svg className={`w-5 h-5 text-gray-500 transition-transform ${showSuggestions ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Suggestions Panel */}
                {showSuggestions && (
                  <div className="mb-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                    {COMPONENT_SUGGESTIONS.map((category, idx) => (
                      <div key={category.category} className={idx > 0 ? 'border-t border-gray-200 dark:border-gray-700' : ''}>
                        <div className="px-4 py-2 bg-gray-50 dark:bg-gray-700">
                          <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{category.category}</h4>
                        </div>
                        <div className="p-2 grid grid-cols-2 gap-2">
                          {category.items.map(item => (
                            <button
                              key={item.name}
                              onClick={() => useSuggestion(item.prompt, item.name)}
                              className="text-left p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors border border-transparent hover:border-gray-200 dark:hover:border-gray-600"
                            >
                              <div className="font-medium text-sm text-gray-900 dark:text-white">{item.name}</div>
                              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{item.prompt}</div>
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Quick Examples (fallback) */}
                {!showSuggestions && (
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6 mb-6">
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Try these examples:</h3>
                    <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                      <div className="cursor-pointer hover:text-blue-600" onClick={() => setInput('Create a modern button component with hover effects')}>
                        • &quot;Create a modern button component with hover effects&quot;
                      </div>
                      <div className="cursor-pointer hover:text-blue-600" onClick={() => setInput('Build a user profile card with avatar and social links')}>
                        • &quot;Build a user profile card with avatar and social links&quot;
                      </div>
                      <div className="cursor-pointer hover:text-blue-600" onClick={() => setInput('Make a responsive navigation menu')}>
                        • &quot;Make a responsive navigation menu&quot;
                      </div>
                      <div className="cursor-pointer hover:text-blue-600" onClick={() => setInput('Design a pricing card component')}>
                        • &quot;Design a pricing card component&quot;
                      </div>
                    </div>
                  </div>
                )}

                {existingKeys.length > 0 && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 mb-6">
                    <h4 className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-2">
                      Available Translation Keys ({existingKeys.length})
                    </h4>
                    <div className="flex flex-wrap gap-1">
                      {existingKeys.slice(0, 10).map(key => (
                        <span key={key} className="text-xs bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-200 px-2 py-1 rounded">
                          {key}
                        </span>
                      ))}
                      {existingKeys.length > 10 && (
                        <span className="text-xs text-blue-600 dark:text-blue-400">
                          +{existingKeys.length - 10} more
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Edit Mode Indicator - show when editing existing component */}
            {activeComponent && messages.length > 0 && (
              <div className="mb-4 flex items-center gap-2 px-3 py-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                <svg className="w-4 h-4 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                <span className="text-sm text-amber-700 dark:text-amber-300">
                  Iterating on <strong>{activeComponent.name}</strong> - changes will update this component
                </span>
              </div>
            )}

            {messages.map(message => (
              <div key={message.id} className="mb-6">
                <div className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-3xl rounded-lg px-4 py-3 ${
                    message.role === 'user'
                      ? 'bg-blue-500 text-white ml-12'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white mr-12'
                  }`}>
                    <div className="text-sm font-medium mb-1">
                      {message.role === 'user' ? 'You' : 'AI Assistant'}
                    </div>
                    <div className="whitespace-pre-wrap">
                      {(() => {
                        const textPart = message.parts?.find(part => part.type === 'text');
                        return textPart && 'text' in textPart ? textPart.text : '';
                      })()}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Fixed Chat Input */}
        <div className="absolute bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 p-6">
          <div className="max-w-2xl mx-auto">
            <form onSubmit={handleSubmit}>
              <div className="relative flex items-end bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl shadow-lg hover:shadow-xl transition-shadow duration-200">
                <textarea
                  className="flex-1 px-6 py-4 bg-transparent text-lg placeholder-zinc-500 dark:placeholder-zinc-400 focus:outline-none resize-none min-h-[56px] max-h-32 overflow-y-auto"
                  value={input}
                  placeholder={activeComponent ? "Describe changes to the component..." : "Describe the React component you want to create..."}
                  onChange={e => setInput(e.currentTarget.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmit(e);
                    }
                  }}
                  rows={1}
                  style={{
                    height: 'auto',
                    minHeight: '56px',
                  }}
                  onInput={e => {
                    const target = e.target as HTMLTextAreaElement;
                    target.style.height = 'auto';
                    target.style.height = Math.min(target.scrollHeight, 128) + 'px';
                  }}
                />
                {/* Enhance Prompt Button */}
                <button
                  type="button"
                  onClick={handleEnhancePrompt}
                  disabled={!input.trim() || isEnhancingPrompt}
                  className="mr-1 mb-2 p-3 text-purple-500 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 disabled:text-zinc-300 dark:disabled:text-zinc-600 rounded-xl transition-colors duration-200 disabled:cursor-not-allowed"
                  title="Enhance prompt with technical details"
                >
                  {isEnhancingPrompt ? (
                    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                    </svg>
                  )}
                </button>
                <button
                  type="submit"
                  disabled={!input.trim()}
                  className="mr-2 mb-2 p-3 bg-blue-500 hover:bg-blue-600 disabled:bg-zinc-300 dark:disabled:bg-zinc-600 text-white rounded-xl transition-colors duration-200 disabled:cursor-not-allowed"
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="m22 2-7 20-4-9-9-4Z"/>
                    <path d="M22 2 11 13"/>
                  </svg>
                </button>
              </div>
              {/* Hint for enhance button */}
              <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 text-center">
                <span className="inline-flex items-center gap-1">
                  <svg className="w-3 h-3 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                  </svg>
                  Click the sparkle to enhance your prompt with technical details
                </span>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Preview Section - only show when there's a component and preview is enabled */}
      {shouldShowPreview && (
        <div className="w-1/2 border-l border-gray-200 dark:border-gray-700">
          <ComponentPreview
            componentCode={currentComponent}
            translationsVersion={translationsVersion}
            onSaveOnly={saveToDbOnly}
            onCodeChange={(code) => {
              // Update the current component code
              setCurrentComponent(code);
              setHasUnsavedChanges(true);
            }}
          />
        </div>
      )}
    </div>
  );
}

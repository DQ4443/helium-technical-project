'use client';

import { useChat } from '@ai-sdk/react';
import { useState, useEffect, useCallback } from 'react';
import ComponentPreview from './ComponentPreview';
import { ComponentDB, ComponentEntry, ChatMessage, LocalizationDB } from '../lib/database';

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

  const componentDb = ComponentDB.getInstance();
  const localizationDb = LocalizationDB.getInstance();

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

        let addedAny = false;

        // Save each translation to the database
        for (const [key, englishText] of Object.entries(translations)) {
          // Check if key already exists in database
          if (!currentKeys.has(key)) {
            const newEntry = {
              id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
              key,
              en: englishText,
              es: '',
              fr: '',
              de: '',
              ja: '',
              zh: ''
            };
            try {
              await localizationDb.create(newEntry);
              console.log('Created new translation key:', key);
              currentKeys.add(key); // Prevent duplicates within same batch
              addedAny = true;
            } catch (err) {
              // Key might already exist due to race condition, skip it
              console.log('Key already exists:', key);
            }
          }
        }

        // Only refresh if we actually added something
        if (addedAny) {
          setTranslationsVersion(v => v + 1);
          onTranslationsUpdated?.();
        }
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

  return (
    <div className="flex h-full">
      {/* Chat Section */}
      <div className="w-1/2 flex flex-col relative">
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
            </form>
          </div>
        </div>
      </div>

      {/* Preview Section */}
      <div className="w-1/2 border-l border-gray-200 dark:border-gray-700">
        <ComponentPreview
          componentCode={currentComponent}
          translationsVersion={translationsVersion}
        />
      </div>
    </div>
  );
}

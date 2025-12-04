'use client';

import { useChat } from '@ai-sdk/react';
import { useState, useEffect } from 'react';
import ComponentPreview from './ComponentPreview';

export default function Editor() {
  const [input, setInput] = useState('');
  const { messages, sendMessage } = useChat();
  const [currentComponent, setCurrentComponent] = useState<string>('');
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {

      sendMessage({ 
        text: `${input}` 
      });
      setInput('');
    }
  };

  // Extract React component code from AI responses
  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    if (lastMessage && lastMessage.role === 'assistant') {
      const text = lastMessage.parts.find(part => part.type === 'text')?.text || '';
      
      // Look for React component code in code blocks
      const codeBlockRegex = /```(?:tsx?|jsx?|react)?\n([\s\S]*?)\n```/g;
      const matches = [...text.matchAll(codeBlockRegex)];
      
      if (matches.length > 0) {
        // Get the last code block (most recent component)
        const componentCode = matches[matches.length - 1][1];
        if (componentCode.includes('export default') || componentCode.includes('function') || componentCode.includes('const')) {
          setCurrentComponent(componentCode);
        }
      }
    }
  }, [messages]);

  return (
    <div className="flex h-full">
      {/* Chat Section */}
      <div className="w-1/2 flex flex-col relative">
        {/* Scrollable Messages Area */}
        <div className="flex-1 overflow-y-auto p-6 pb-32">
          <div className="max-w-2xl mx-auto">
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                React Component Creator
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Describe the React component you want to create, and I&apos;ll build it for you with a live preview. (Beta - may take a tries to get a successful preview.)
              </p>
            </div>
            
            {messages.length === 0 && (
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6 mb-6">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Try these examples:</h3>
                <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                  <div>• &quot;Create a modern button component with hover effects&quot;</div>
                  <div>• &quot;Build a user profile card with avatar and social links&quot;</div>
                  <div>• &quot;Make a responsive navigation menu&quot;</div>
                  <div>• &quot;Design a pricing card component&quot;</div>
                </div>
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
                    {message.parts.map((part, i) => {
                      switch (part.type) {
                        case 'text':
                          return (
                            <div key={`${message.id}-${i}`} className="whitespace-pre-wrap">
                              {part.text}
                            </div>
                          );
                      }
                    })}
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
                  placeholder="Describe the React component you want to create..."
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
        <ComponentPreview componentCode={currentComponent} />
      </div>
    </div>
  );
}
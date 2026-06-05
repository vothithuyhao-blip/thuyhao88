import React, { useState } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { User, Bot, Copy, Check } from 'lucide-react';
import { Message } from '../types';

interface ChatMessageProps {
  message: Message;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  const markdownComponents = {
    code({ node, inline, className, children, ...props }: any) {
      const match = /language-(\w+)/.exec(className || '');
      return !inline && match ? (
        <SyntaxHighlighter
          {...props}
          children={String(children).replace(/\n$/, '')}
          style={vscDarkPlus}
          language={match[1]}
          PreTag="div"
          className="rounded-md"
        />
      ) : (
        <code {...props} className={`${className} bg-gray-100 px-1 py-0.5 rounded text-sm text-pink-600`}>
          {children}
        </code>
      );
    }
  };

  return (
    <div className={`p-4 flex gap-4 ${isUser ? 'bg-transparent flex-row-reverse' : 'bg-gray-50 rounded-3xl border border-gray-100'}`}>
      <div className={`h-12 w-12 rounded-full flex items-center justify-center shrink-0 ${isUser ? 'bg-blue-100 text-blue-600' : 'bg-gradient-to-br from-indigo-100 to-purple-100 shadow-inner border border-purple-200 text-2xl'}`}>
        {isUser ? <User size={24} className="stroke-2" /> : <span>👩‍🏫</span>}
      </div>
      <div className={`flex-1 min-w-0 prose prose-slate max-w-none ${isUser ? 'text-right' : ''}`}>
        {isUser ? (
           <div className="inline-block bg-blue-600 text-white rounded-2xl px-5 py-3 text-left">
             <Markdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
               {message.text}
             </Markdown>
           </div>
        ) : (
           <div className="relative group pr-8">
             <Markdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
               {message.text}
             </Markdown>
             <button 
               onClick={handleCopy}
               className="absolute top-0 right-0 p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
               title="Copy message"
             >
               {copied ? <Check size={18} className="text-green-600" /> : <Copy size={18} />}
             </button>
           </div>
        )}
      </div>
    </div>
  );
}

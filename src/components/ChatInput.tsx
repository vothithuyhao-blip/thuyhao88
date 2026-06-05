import React, { useState, useRef, useEffect } from 'react';
import { Send, Mic, MicOff } from 'lucide-react';

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled: boolean;
}

export function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);
  const originalInputRef = useRef('');

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'vi-VN';

      recognition.onresult = (event: any) => {
        let currentTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript;
        }
        
        setInput(originalInputRef.current + (originalInputRef.current && currentTranscript ? ' ' : '') + currentTranscript);
      };

      recognition.onerror = (event: any) => {
        console.error("Speech recognition error", event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  const toggleListening = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!recognitionRef.current) {
      alert('Trình duyệt của bạn không hỗ trợ tính năng nhận diện giọng nói (Web Speech API).');
      return;
    }
    
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      originalInputRef.current = input;
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    }
    if (input.trim() && !disabled) {
      onSend(input.trim());
      setInput('');
      originalInputRef.current = '';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="relative w-full max-w-4xl mx-auto flex items-end gap-2 bg-white border border-gray-200 rounded-2xl shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] p-2 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 transition-all">
      <textarea
        ref={textareaRef}
        value={input}
        onChange={(e) => {
          setInput(e.target.value);
          originalInputRef.current = e.target.value;
        }}
        onKeyDown={handleKeyDown}
        placeholder="Nhập câu hỏi để bắt đầu..."
        className="w-full max-h-[200px] bg-transparent border-0 focus:ring-0 resize-none py-3 px-4 text-gray-900 placeholder:text-gray-400 outline-none"
        rows={1}
        disabled={disabled}
      />
      <button
        type="button"
        onClick={toggleListening}
        disabled={disabled}
        className={`p-3 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0 mb-1 mr-1 ${isListening ? 'bg-red-100 text-red-600 hover:bg-red-200' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
        title={isListening ? "Dừng ghi âm" : "Bắt đầu ghi âm"}
      >
        {isListening ? <MicOff size={18} /> : <Mic size={18} />}
      </button>
      <button
        type="submit"
        disabled={!input.trim() || disabled}
        className="p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0 mb-1 mr-1"
      >
        <Send size={18} />
      </button>
    </form>
  );
}

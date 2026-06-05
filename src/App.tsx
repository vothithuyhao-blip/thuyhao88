import React, { useState, useRef, useEffect } from 'react';
import { Download, Trash2, Settings, Key, BookOpen, Atom, Lightbulb, Code2, GraduationCap, UserCircle } from 'lucide-react';
import { ChatMessage } from './components/ChatMessage';
import { ChatInput } from './components/ChatInput';
import { Message, UserInfo } from './types';

const TOPICS = [
  { id: '10', label: 'Lớp 10', icon: Code2, color: 'text-blue-600', bg: 'bg-blue-100' },
  { id: '11', label: 'Lớp 11', icon: BookOpen, color: 'text-green-600', bg: 'bg-green-100' },
  { id: '12', label: 'Lớp 12', icon: GraduationCap, color: 'text-orange-600', bg: 'bg-orange-100' },
  { id: 'stem', label: 'STEM', icon: Atom, color: 'text-purple-600', bg: 'bg-purple-100' },
  { id: 'other', label: 'Vấn đề khác', icon: Lightbulb, color: 'text-pink-600', bg: 'bg-pink-100' },
];

export default function App() {
  const [userInfo, setUserInfo] = useState<UserInfo | null>(() => {
    const saved = localStorage.getItem('user_info');
    return saved ? JSON.parse(saved) : null;
  });

  const [inputName, setInputName] = useState('');
  const [inputClass, setInputClass] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('');

  const [messages, setMessages] = useState<Message[]>(() => {
    const saved = localStorage.getItem('chat_history');
    if (saved) {
        try { return JSON.parse(saved); } catch { /* ignore */ }
    }
    return [];
  });
  
  const [showApiKeyModal, setShowApiKeyModal] = useState(() => {
    return !(localStorage.getItem('gemini_api_key') || localStorage.getItem('skipped_api_key') === 'true');
  });
  const [apiKeyInput, setApiKeyInput] = useState(() => localStorage.getItem('gemini_api_key') || '');
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('gemini_api_key') || '');
  
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem('chat_history', JSON.stringify(messages));
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleStart = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputName.trim() || !inputClass.trim() || !selectedTopic) return;
    const info = { name: inputName.trim(), className: inputClass.trim(), topic: selectedTopic };
    setUserInfo(info);
    localStorage.setItem('user_info', JSON.stringify(info));
    
    const topicLabel = TOPICS.find(t => t.id === info.topic)?.label || '';
    const initialMsg = `Chào **${info.name}** học lớp **${info.className}**! Cô là **Trợ lý Tri thức số - cô Thuý Hào** đây 👩‍🏫.\nHôm nay em muốn tìm hiểu về \`${topicLabel}\` đúng không? Cứ mạnh dạn chia sẻ nhé, cô trò mình cùng "chiến" nào! 🚀`;
    const initial: Message[] = [{ id: 'initial', role: 'model', text: initialMsg }];
    setMessages(initial);
    localStorage.setItem('chat_history', JSON.stringify(initial));
  };

  const handleResetUser = () => {
    if (window.confirm('Em có muốn thay đổi thông tin cá nhân (Tên, Lớp, Chủ đề) không? Lịch sử trò chuyện sẽ bị xoá.')) {
      setUserInfo(null);
      setMessages([]);
      localStorage.removeItem('user_info');
      localStorage.removeItem('chat_history');
    }
  };

  const handleSaveApiKey = () => {
    localStorage.setItem('gemini_api_key', apiKeyInput.trim());
    setApiKey(apiKeyInput.trim());
    setShowApiKeyModal(false);
  };

  const handleSkipApiKey = () => {
    localStorage.setItem('skipped_api_key', 'true');
    setShowApiKeyModal(false);
  };

  const handleSend = async (messageText: string) => {
    const newUserMsg: Message = { id: Date.now().toString(), role: 'user', text: messageText };
    setMessages(prev => [...prev, newUserMsg]);
    setIsLoading(true);

    const newBotMsgId = (Date.now() + 1).toString();
    setMessages(prev => [...prev, { id: newBotMsgId, role: 'model', text: '' }]);

    try {
      const chatHistory = messages.filter(m => m.id !== 'initial');
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(apiKey ? { 'x-api-key': apiKey } : {})
        },
        body: JSON.stringify({ history: chatHistory, message: messageText, userInfo })
      });

      if (!response.ok) throw new Error('Network response was not ok');

      const reader = response.body?.getReader();
      const decoder = new TextDecoder('utf-8');

      if (reader) {
        let buffer = '';
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';
          
          for (const line of lines) {
            const trimmedLine = line.trim();
            if (trimmedLine.startsWith('data: ') && trimmedLine !== 'data: [DONE]') {
              try {
                const data = JSON.parse(trimmedLine.slice(6));
                setMessages(prev => prev.map(msg => 
                  msg.id === newBotMsgId 
                    ? { ...msg, text: msg.text + data.text }
                    : msg
                ));
              } catch (e) {
                console.error("Error parsing chunk", e, trimmedLine);
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Error fetching chat:', error);
      setMessages(prev => [...prev, { 
        id: (Date.now() + 2).toString(), 
        role: 'model', 
        text: 'Có lỗi kết nối hệ thống. Em thử lại nhé! 😅' 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    if (window.confirm('Em có chắc muốn xoá lịch sử trò chuyện này không?')) {
      const topicLabel = TOPICS.find(t => t.id === userInfo?.topic)?.label || '';
      const initialMsg = `Chào **${userInfo?.name}** học lớp **${userInfo?.className}**! Cô là **Trợ lý Tri thức số - cô Thuý Hào** đây 👩‍🏫.\nHôm nay em muốn tìm hiểu về \`${topicLabel}\` đúng không? Cứ mạnh dạn chia sẻ nhé, cô trò mình cùng "chiến" nào! 🚀`;
      const initial: Message[] = [{ id: 'initial', role: 'model', text: initialMsg }];
      setMessages(initial);
      localStorage.setItem('chat_history', JSON.stringify(initial));
    }
  };

  const handleExport = () => {
    const textContext = messages.map(m => `${m.role === 'user' ? 'Học sinh' : 'Cô Thuý Hào'}:\n${m.text}\n\n`).join('---\n');
    const blob = new Blob([textContext], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chat-history-co-thuy-hao-${new Date().toISOString().slice(0,10)}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!userInfo) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-blue-50 flex items-center justify-center p-4 font-sans relative overflow-hidden">
        {/* API Key Modal on Welcome Screen */}
        {showApiKeyModal && (
          <div className="absolute inset-0 bg-white/60 flex items-center justify-center z-50 p-4 backdrop-blur-md">
            <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl border border-gray-100">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-blue-100 text-blue-600 rounded-xl">
                  <Key size={24} />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">Cấu hình API Key</h2>
              </div>
              <p className="text-gray-600 mb-6 text-sm leading-relaxed">
                Bạn có thể sử dụng Gemini API key của riêng mình để đảm bảo tốc độ và không bị giới hạn từ hệ thống. Nếu bạn chưa có, hãy bấm "Bỏ qua".
              </p>
              <input
                type="password"
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                placeholder="Nhập Gemini API Key của bạn..."
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 mb-6 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white outline-none transition-all"
              />
              <div className="flex flex-col sm:flex-row justify-end gap-3">
                <button
                  onClick={handleSkipApiKey}
                  className="px-6 py-3 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl font-medium transition-colors w-full sm:w-auto"
                >
                  Bỏ qua
                </button>
                <button
                  onClick={handleSaveApiKey}
                  disabled={!apiKeyInput.trim()}
                  className="px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors w-full sm:w-auto shadow-md shadow-blue-500/20"
                >
                  Lưu API Key
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white/90 backdrop-blur-xl p-8 sm:p-10 rounded-[2rem] shadow-2xl w-full max-w-xl border border-white">
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-28 h-28 bg-gradient-to-tr from-blue-100 to-purple-100 rounded-full mb-6 shadow-inner border border-white">
              <span className="text-6xl">👩‍🏫</span>
            </div>
            <h1 className="text-4xl font-extrabold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-3">
              Trợ lý Tri thức số
            </h1>
            <p className="text-gray-600 font-medium text-lg">Cô Thuý Hào luôn sẵn sàng hỗ trợ em!</p>
          </div>

          <form onSubmit={handleStart} className="space-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 ml-1">Tên của em là gì?</label>
                <input 
                  type="text" 
                  value={inputName} 
                  onChange={e => setInputName(e.target.value)}
                  placeholder="VD: Hải Nam" 
                  className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white outline-none transition-all text-gray-800 font-medium"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 ml-1">Em học Lớp mấy?</label>
                <input 
                  type="text" 
                  value={inputClass} 
                  onChange={e => setInputClass(e.target.value)}
                  placeholder="VD: 10A1" 
                  className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white outline-none transition-all text-gray-800 font-medium"
                  required
                />
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-sm font-bold text-gray-700 ml-1">Em đang quan tâm chủ đề nào?</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {TOPICS.map(topic => {
                  const Icon = topic.icon;
                  const isSelected = selectedTopic === topic.id;
                  return (
                    <button
                      key={topic.id}
                      type="button"
                      onClick={() => setSelectedTopic(topic.id)}
                      className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all duration-200 ${
                        isSelected 
                          ? `border-blue-500 bg-blue-50 shadow-md shadow-blue-500/10 scale-[1.02]` 
                          : `border-gray-100 bg-white hover:border-gray-200 hover:bg-gray-50`
                      }`}
                    >
                      <div className={`p-3 rounded-xl mb-3 ${isSelected ? topic.bg : 'bg-gray-100'} ${isSelected ? topic.color : 'text-gray-500'}`}>
                        <Icon size={26} strokeWidth={2.5} />
                      </div>
                      <span className={`text-sm tracking-wide ${isSelected ? 'text-blue-700 font-bold' : 'text-gray-600 font-semibold'}`}>
                        {topic.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              type="submit"
              disabled={!inputName.trim() || !inputClass.trim() || !selectedTopic}
              className="w-full py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-2xl font-bold text-lg hover:shadow-xl hover:shadow-blue-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed transform hover:-translate-y-1 active:translate-y-0"
            >
              Bắt đầu học thôi! 🚀
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50/50 font-sans">
      {showApiKeyModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-blue-100 text-blue-600 rounded-xl">
                <Key size={24} />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Cấu hình API Key</h2>
            </div>
            <p className="text-gray-600 mb-6 text-sm leading-relaxed">
              Bạn có thể sử dụng Gemini API key của riêng mình để đảm bảo tốc độ và không bị giới hạn hệ thống.
            </p>
            <input
              type="password"
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              placeholder="Nhập Gemini API Key của bạn..."
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 mb-6 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white outline-none transition-all"
            />
            <div className="flex flex-col sm:flex-row justify-end gap-3">
              <button
                onClick={() => setShowApiKeyModal(false)}
                className="px-5 py-2.5 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl font-medium transition-colors w-full sm:w-auto"
              >
                Huỷ
              </button>
              <button
                onClick={handleSaveApiKey}
                disabled={!apiKeyInput.trim()}
                className="px-5 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors w-full sm:w-auto"
              >
                Lưu API Key
              </button>
            </div>
          </div>
        </div>
      )}

      <header className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex h-12 w-12 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 items-center justify-center border border-purple-200 text-2xl shadow-inner">
            👩‍🏫
          </div>
          <div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Trợ lý Tri thức số - cô Thuý Hào</h1>
            <p className="text-sm text-gray-500 font-medium">Hỗ trợ môn Tin học, Lập trình & STEM</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleResetUser} className="p-2 sm:px-4 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-full sm:rounded-xl transition-colors flex items-center gap-2" title="Đổi thông tin cá nhân">
            <UserCircle size={20} />
            <span className="text-sm font-bold hidden sm:block">{userInfo.name} - {userInfo.className}</span>
          </button>
          <div className="w-px h-6 bg-gray-200 mx-1 hidden sm:block"></div>
          <button onClick={() => setShowApiKeyModal(true)} className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-full transition-colors" title="Cài đặt API Key">
            <Settings size={20} />
          </button>
          <button onClick={handleExport} className="p-2 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded-full transition-colors flex items-center gap-2 px-3" title="Xuất nội dung trò chuyện">
            <Download size={20} />
            <span className="text-sm font-semibold hidden lg:block">Xuất bài</span>
          </button>
          <button onClick={handleClear} className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors" title="Xoá cuộc trò chuyện">
            <Trash2 size={20} />
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto w-full max-w-4xl mx-auto p-4 md:p-6 space-y-6 scroll-smooth">
        {messages.map(msg => (
          <ChatMessage key={msg.id} message={msg} />
        ))}
        {isLoading && (
          <div className="flex items-center gap-2 text-gray-400 p-4">
            <div className="w-2 h-2 rounded-full bg-blue-600 animate-bounce" />
            <div className="w-2 h-2 rounded-full bg-blue-600 animate-bounce" style={{ animationDelay: '0.2s' }} />
            <div className="w-2 h-2 rounded-full bg-blue-600 animate-bounce" style={{ animationDelay: '0.4s' }} />
          </div>
        )}
        <div ref={messagesEndRef} />
      </main>

      <div className="p-4 bg-white border-t border-gray-200 shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.05)]">
        <ChatInput onSend={handleSend} disabled={isLoading} />
        <p className="text-xs text-center text-gray-400 mt-3 font-medium tracking-wide">
          Luôn nỗ lực tự suy nghĩ nhé các coder tương lai! Trợ lý ảo có thể mang lại gợi ý tuyệt vời nhưng hãy tự mình thực hành để nhớ bài lâu hơn.
        </p>
      </div>
    </div>
  );
}

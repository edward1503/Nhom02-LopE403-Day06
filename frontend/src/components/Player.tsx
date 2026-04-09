import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  PlayCircle,
  Pause,
  SkipForward,
  Volume2,
  Captions,
  Settings,
  Maximize,
  Bot,
  Send,
  List,
  FileText,
  Lightbulb,
  ChevronLeft,
  ChevronRight,
  PanelLeftClose,
  PanelRightClose,
  Minimize2,
  Maximize2,
  RotateCcw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

// --- Types ---
interface Lesson {
  id: number;
  originalId: string; // The backend ID like "lecture-1"
  title: string;
  duration: string;
  status: 'completed' | 'playing' | 'locked';
  videoUrl?: string; // Add video url type
}

interface ChatMessage {
  id: number;
  role: 'ai' | 'user';
  content: string;
  isError?: boolean;
  historyId?: number;
  confidenceScore?: number;
  sourceCitation?: string;
  status?: 'pending' | 'understood' | 'reported';
}

interface Chapter {
  title: string;
  start_time: string;
  end_time?: string;
  summary?: string;
}

// --- Components ---

const Header = ({ onNavigate }: { onNavigate: (view: string) => void }) => (
  <header className="h-16 bg-surface-container-low shrink-0 flex items-center justify-between px-6 z-20 border-b border-outline-variant/10">
    <button
      onClick={() => onNavigate('landing')}
      className="flex items-center gap-3 text-on-surface-variant hover:text-on-surface transition-colors group"
    >
      <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
      <span className="font-label text-xs uppercase tracking-[0.05em] font-semibold">Back to Course</span>
    </button>
    <div className="flex items-center gap-4">
      <div className="font-label text-xs uppercase tracking-[0.05em] text-on-surface-variant hidden sm:block">
        CS231N: Deep Learning
      </div>
      <div className="w-8 h-8 rounded-full bg-surface-container-highest overflow-hidden ring-1 ring-outline-variant/15 cursor-pointer">
        <img
          alt="User Avatar"
          className="w-full h-full object-cover"
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuAbOySjIso_LcLPsBy2NpjWURdw_bqQaHZOti58VunfPZSMSfHDJYBoOYbO3rSctAAZGDIXnfyg_lMSvymC0IqtNqz5WqZOpU79Heu9-BGK0DSakgZICBTN99ffzNy_goznPqtVSufQK2nj5hiqOSuLvySKsNLr6MJvKtOoMuiPEZIlF8LPYprA7IhkCmpBJs2VMOtE18qEH3es-dcOvq3wjYPwNRD1RLYS5QcDpq30KLwh_skH3SYwkolTJwVj4fRG80I3xBNrfkK_"
          referrerPolicy="no-referrer"
        />
      </div>
    </div>
  </header>
);

const CourseSidebar = ({
  lessons,
  onSelectLesson,
  isCollapsed,
  onToggle
}: {
  lessons: Lesson[],
  onSelectLesson: (id: number) => void,
  isCollapsed: boolean,
  onToggle: () => void
}) => (
  <motion.aside
    initial={false}
    animate={{ width: isCollapsed ? 64 : 288 }}
    transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
    className="bg-surface-container-low shrink-0 flex flex-col hidden lg:flex relative z-10 border-r border-outline-variant/5 overflow-hidden"
  >
    <div className="p-6 pb-4 flex items-center justify-between">
      {!isCollapsed && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex-1 min-w-0"
        >
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-headline text-lg font-medium text-on-surface truncate">Lectures & Info</h2>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <div className="h-1 bg-surface-container-highest rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary/40 rounded-full transition-all duration-300" 
                  style={{ width: `${lessons.length > 0 ? (lessons.filter(l => l.status === 'completed').length / lessons.length) * 100 : 0}%` }}
                ></div>
              </div>
            </div>
            <span className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant">
              {lessons.filter(l => l.status === 'completed').length}/{lessons.length} COMPLETED
            </span>
          </div>
        </motion.div>
      )}
      <button
        onClick={onToggle}
        className={`p-2 rounded-lg hover:bg-surface-container transition-colors text-on-surface-variant shrink-0 ${isCollapsed ? 'mx-auto' : 'ml-2'}`}
      >
        {isCollapsed ? <ChevronRight className="w-5 h-5" /> : <PanelLeftClose className="w-5 h-5" />}
      </button>
    </div>

    {!isCollapsed && (
      <motion.nav
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex-1 overflow-y-auto px-4 pb-6 space-y-1 min-w-[288px]"
      >
        {lessons.map((lesson) => (
          <button
            key={lesson.id}
            onClick={() => onSelectLesson(lesson.id)}
            className={`w-full flex items-start gap-3 p-3 rounded-lg transition-colors group relative overflow-hidden ${lesson.status === 'playing' ? 'bg-surface-container-highest' : 'hover:bg-surface-container'}`}
          >
            {lesson.status === 'playing' && (
              <motion.div layoutId="activeHighlight" className="absolute left-0 top-2 bottom-2 w-1 bg-primary rounded-r-full" />
            )}
            <div className="shrink-0 w-6 flex justify-center">
              {lesson.status === 'completed' && <CheckCircle2 className="w-5 h-5 text-primary mt-0.5" />}
              {lesson.status === 'playing' && <PlayCircle className="w-5 h-5 text-primary mt-0.5 animate-pulse" />}
              {lesson.status === 'locked' && <PlayCircle className="w-5 h-5 text-on-surface-variant/40 mt-0.5" />}
            </div>
            <div className="flex-1 text-left min-w-0">
              <h3 className={`font-body text-sm font-medium leading-snug break-words ${
                lesson.status === 'completed' ? 'text-primary' :
                lesson.status === 'playing' ? 'text-on-surface' : 'text-on-surface-variant group-hover:text-on-surface'
              }`}>
                {lesson.title}
              </h3>
              <p className={`font-label text-xs mt-1 tracking-wide ${lesson.status === 'playing' ? 'text-primary' : 'text-on-surface-variant/60'}`}>
                {lesson.duration} {lesson.status === 'playing' ? '• Playing' : lesson.status === 'completed' ? '• Done' : '• Ready'}
              </p>
            </div>
          </button>
        ))}
      </motion.nav>
    )}
  </motion.aside>
);

const VideoPlayer = ({ videoUrl, videoRef, lectureId }: { videoUrl?: string, videoRef: React.RefObject<HTMLVideoElement | null>, lectureId?: string }) => (
  <div className="flex-1 bg-black m-4 rounded-xl overflow-hidden relative group">
    {videoUrl ? (
      <video crossOrigin="anonymous" ref={videoRef as any} src={videoUrl} controls autoPlay className="w-full h-full object-contain">
        {lectureId && <track kind="subtitles" src={`/api/lectures/${lectureId}/subtitles.vtt`} srcLang="en" label="English" default />}
      </video>
    ) : (
      <>
        {/* Video Placeholder Background fallback */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('https://images.unsplash.com/photo-1555949963-aa79dcee981c?q=80&w=2070&auto=format&fit=crop')" }}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-surface-container-lowest via-transparent to-transparent opacity-80"></div>
          <div className="absolute inset-0 flex items-center justify-center font-headline text-on-surface-variant">
            Please pick a lecture to play from the sidebar.
          </div>
        </div>
      </>
    )}
  </div>
);

const AIChatbot = ({
  isCollapsed,
  onToggle,
  lectureId,
  getCurrentTimestamp,
  videoRef
}: {
  isCollapsed: boolean;
  onToggle: () => void;
  lectureId?: string;
  getCurrentTimestamp: () => number;
  videoRef: React.RefObject<HTMLVideoElement | null>;
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [reportingId, setReportingId] = useState<number | null>(null);
  const [correctionText, setCorrectionText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const submitSignal = async (status: 'understood' | 'reported', historyId?: number, msgId?: number) => {
    if (!historyId) return;
    try {
      await fetch('/api/lectures/signal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          history_id: historyId,
          status,
          correction_exact: status === 'reported' ? correctionText : undefined
        }),
      });
      
      setMessages(prev => prev.map(m => 
        m.id === msgId ? { ...m, status } : m
      ));
      setReportingId(null);
      setCorrectionText('');
    } catch (e) {
      console.error("Signal failed:", e);
    }
  };

  const captureFrame = (): string | null => {
    const video = videoRef.current;
    if (!video) return null;

    try {
      if (!canvasRef.current) {
        canvasRef.current = document.createElement('canvas');
      }
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;
      
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      // Return base64 without prefix data:image/jpeg;base64,
      return canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
    } catch (e) {
      console.error("Frame capture failed:", e);
      return null;
    }
  };

  // Auto scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking]);

  // Reset chat on lecture change
  useEffect(() => {
    setMessages([{ id: 1, role: 'ai', content: "Hello! I'm Learning Hub AI. Ask me anything about this video, and I'll use the lecture context to explain it." }]);
  }, [lectureId]);

  const handleSend = async (retryContent?: string) => {
    const questionToAsk = retryContent || input;
    if (!questionToAsk.trim() || isThinking || !lectureId) return;

    if (retryContent) {
      // Remove the error message from history
      setMessages(prev => prev.filter(m => !m.isError));
    } else {
      const userMsg: ChatMessage = { id: Date.now(), role: 'user', content: input };
      setMessages(prev => [...prev, userMsg]);
      setInput('');
    }
    
    setIsThinking(true);

    try {
      const imageBase64 = captureFrame();
      const historyPayload = messages
        .filter(m => m.id !== 1 && !m.isError)
        .map(m => ({ role: m.role, content: m.content }))
        .slice(-6);

      console.log("Sending Request to AI...", { lecture_id: lectureId, qs: input, history_len: historyPayload.length });

      const response = await fetch('/api/lectures/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lecture_id: lectureId,
          current_timestamp: getCurrentTimestamp(),
          question: questionToAsk,
          image_base64: imageBase64,
          chat_history: historyPayload
        }),
      });

      if (!response.ok) throw new Error("Failed to connect to AI");
      if (!response.body) throw new Error("No response body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      const aiMessageId = Date.now() + 1;
      
      // We'll wait for the first chunk or handle it carefully below
      let aiResponseContent = "";
      let isFirstChunk = true;
      let done = false;
      
      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) {
          const chunk = decoder.decode(value, { stream: true });
          aiResponseContent += chunk;

          // Strip metadata markers from visible content
          let displayContent = aiResponseContent;
          
          // Extracts confidence/source
          const metaMatch = displayContent.match(/###FRONTMETA###(.*?)###FRONTMETA_END###/);
          let metaData: any = null;
          if (metaMatch) {
            try { metaData = JSON.parse(metaMatch[1]); } catch(e) {}
            displayContent = displayContent.replace(/###FRONTMETA###.*?###FRONTMETA_END###/g, '');
          }

          // Extracts DB ID
          const idMatch = displayContent.match(/###HISTORYID###(.*?)###HISTORYID_END###/);
          let historyId: number | undefined = undefined;
          if (idMatch) {
            historyId = parseInt(idMatch[1]);
            displayContent = displayContent.replace(/###HISTORYID###.*?###HISTORYID_END###/g, '');
          }

          if (isFirstChunk) {
            setIsThinking(false);
            isFirstChunk = false;
            setMessages(prev => [...prev, { 
              id: aiMessageId, 
              role: 'ai', 
              content: displayContent,
              confidenceScore: metaData?.confidence_score,
              sourceCitation: metaData?.source_citation,
              historyId: historyId,
              status: 'pending'
            }]);
          } else {
            setMessages(prev => prev.map(m => 
              m.id === aiMessageId ? { 
                ...m, 
                content: displayContent,
                confidenceScore: metaData?.confidence_score || m.confidenceScore,
                sourceCitation: metaData?.source_citation || m.sourceCitation,
                historyId: historyId || m.historyId
              } : m
            ));
          }
        }
      }
    } catch (error) {
      console.error("HandleSend Error Catch:", error);
      setIsThinking(false);
      setMessages(prev => [...prev, { id: Date.now(), role: 'ai', content: "Sorry, I ran into an error connecting to the API.", isError: true }]);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 flex flex-col items-end z-50 pointer-events-none">
      <AnimatePresence>
        {!isCollapsed && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="w-[340px] bg-surface-variant/70 backdrop-blur-2xl rounded-xl shadow-[0_0_50px_rgba(205,189,255,0.08)] ring-1 ring-outline-variant/20 overflow-hidden flex flex-col mb-4 pointer-events-auto"
          >
            {/* Chat Header */}
            <div className="px-4 py-3 border-b border-outline-variant/15 flex items-center justify-between bg-surface-container-highest/50">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary to-primary-container flex items-center justify-center relative">
                  <Bot className="w-3.5 h-3.5 text-on-primary" />
                  <div className="absolute inset-0 rounded-full animate-ping bg-primary opacity-20"></div>
                </div>
                <span className="font-label text-[10px] uppercase tracking-[0.08em] font-semibold text-primary">Learning Hub AI</span>
              </div>
              <button
                onClick={onToggle}
                className="text-on-surface-variant hover:text-on-surface p-1 rounded-md hover:bg-surface-container transition-colors"
              >
                <Minimize2 className="w-4 h-4" />
              </button>
            </div>

            {/* Chat Messages */}
            <div className="p-4 space-y-4 max-h-[280px] overflow-y-auto scrollbar-thin scrollbar-thumb-outline-variant/30 scrollbar-track-transparent">
              {messages.filter(m => m.content).map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, x: msg.role === 'ai' ? -10 : 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
                >
                  {msg.role === 'ai' && (
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary to-primary-container shrink-0 flex items-center justify-center mt-1">
                      <Bot className="w-3.5 h-3.5 text-on-primary" />
                    </div>
                  )}
                  <div className={`p-3 rounded-xl text-sm font-body leading-relaxed max-w-[90%] overflow-x-auto ${msg.role === 'ai'
                      ? 'bg-surface-container-lowest rounded-tl-sm border border-outline-variant/10 text-on-surface/90 chat-prose'
                      : 'bg-primary/10 border border-primary/20 rounded-tr-sm text-on-surface'
                    }`}>
                    {msg.role === 'user' ? (
                      <div className="whitespace-pre-wrap">{msg.content}</div>
                    ) : (
                      <>
                        {/* Confidence & Source Badge */}
                        {msg.role === 'ai' && msg.content && !msg.isError && (
                          <div className="flex flex-wrap gap-2 mb-2">
                             {msg.confidenceScore !== undefined && (
                               <div className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 ${
                                 msg.confidenceScore >= 0.8 
                                   ? 'bg-green-500/10 text-green-500 border border-green-500/20' 
                                   : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                               }`}>
                                 {msg.confidenceScore >= 0.8 ? <CheckCircle2 className="w-2.5 h-2.5" /> : <RotateCcw className="w-2.5 h-2.5" />}
                                 {Math.round(msg.confidenceScore * 100)}% Confidence
                               </div>
                             )}
                             {msg.sourceCitation && (
                               <div className="px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 text-[10px] font-bold flex items-center gap-1">
                                 <FileText className="w-2.5 h-2.5" />
                                 Source: {msg.sourceCitation}
                               </div>
                             )}
                          </div>
                        )}

                        <ReactMarkdown
                          remarkPlugins={[remarkMath]}
                          rehypePlugins={[rehypeKatex]}
                          components={{
                            p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                            ul: ({ children }) => <ul className="list-disc pl-4 mb-2">{children}</ul>,
                            ol: ({ children }) => <ol className="list-decimal pl-4 mb-2">{children}</ol>,
                            code: ({ children }) => <code className="bg-surface-container-highest px-1 rounded font-mono text-xs">{children}</code>,
                            pre: ({ children }) => <pre className="bg-surface-container-highest p-2 rounded-lg my-2 overflow-x-auto font-mono text-xs border border-outline-variant/10">{children}</pre>
                          }}
                        >
                          {msg.content}
                        </ReactMarkdown>

                        {/* Learning Signals / Feedback */}
                        {msg.role === 'ai' && msg.historyId && !msg.isError && (
                          <div className="mt-3 pt-3 border-t border-outline-variant/10 flex flex-col gap-2">
                            {msg.status === 'pending' && reportingId !== msg.id && (
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => submitSignal('understood', msg.historyId, msg.id)}
                                  className="flex items-center gap-1.5 px-2 py-1 bg-green-500/10 text-green-600 rounded-md text-[10px] font-bold hover:bg-green-500/20 transition-colors"
                                >
                                  <CheckCircle2 className="w-3 h-3" />
                                  Understood
                                </button>
                                <button
                                  onClick={() => setReportingId(msg.id)}
                                  className="flex items-center gap-1.5 px-2 py-1 bg-red-500/10 text-red-600 rounded-md text-[10px] font-bold hover:bg-red-500/20 transition-colors"
                                >
                                  <RotateCcw className="w-3 h-3" />
                                  Report Error
                                </button>
                              </div>
                            )}

                            {msg.status === 'understood' && (
                              <div className="text-[10px] font-bold text-green-600 flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" />
                                Correct and Understood
                              </div>
                            )}

                            {msg.status === 'reported' && (
                              <div className="text-[10px] font-bold text-red-600 flex items-center gap-1">
                                <RotateCcw className="w-3 h-3" />
                                Error Reported
                              </div>
                            )}

                            {reportingId === msg.id && (
                              <div className="bg-surface-container p-2 rounded-lg border border-outline-variant/20 space-y-2">
                                <p className="text-[10px] font-bold text-on-surface-variant">What is the correct answer?</p>
                                <textarea
                                  className="w-full bg-surface-container-lowest border-none rounded p-2 text-xs focus:ring-1 focus:ring-primary outline-none"
                                  rows={2}
                                  placeholder="Type correction here..."
                                  value={correctionText}
                                  onChange={(e) => setCorrectionText(e.target.value)}
                                />
                                <div className="flex justify-end gap-2">
                                  <button onClick={() => setReportingId(null)} className="px-2 py-1 text-[10px] font-bold">Cancel</button>
                                  <button 
                                    onClick={() => submitSignal('reported', msg.historyId, msg.id)}
                                    className="px-2 py-1 bg-primary text-on-primary rounded text-[10px] font-bold"
                                  >
                                    Submit
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {msg.isError && (
                          <div className="mt-3">
                            <button
                              onClick={() => {
                                const msgIndex = messages.findIndex(m => m.id === msg.id);
                                const lastUserMsg = messages.slice(0, msgIndex).reverse().find(m => m.role === 'user');
                                handleSend(lastUserMsg?.content);
                              }}
                              className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary rounded-lg text-xs font-semibold hover:bg-primary/20 transition-colors"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              Retry
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </motion.div>
              ))}
              {isThinking && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex gap-3"
                >
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary to-primary-container shrink-0 flex items-center justify-center mt-1">
                    <Bot className="w-3.5 h-3.5 text-on-primary" />
                  </div>
                  <div className="bg-surface-container-lowest p-3 rounded-xl rounded-tl-sm border border-outline-variant/10 flex gap-2 items-center">
                    <span className="text-xs text-on-surface-variant font-medium mr-1">Learning Hub AI is thinking</span>
                    <div className="flex gap-1">
                      <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </motion.div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Chat Input */}
            <div className="p-3 bg-surface-container-highest/30">
              <div className="bg-surface-container-lowest rounded-xl flex items-center p-2 ring-1 ring-outline-variant/20 focus-within:ring-primary/50 transition-shadow">
                <input
                  className="bg-transparent border-none w-full text-sm font-body text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none p-1"
                  placeholder="Ask about this concept..."
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  disabled={isThinking || !lectureId}
                />
                <button
                  onClick={() => handleSend()}
                  disabled={isThinking || !lectureId}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors shrink-0 ${isThinking || !lectureId ? 'bg-surface-container-highest text-on-surface-variant/30' : 'bg-primary/10 hover:bg-primary/20 text-primary'
                    }`}
                >
                  <Send className="w-4.5 h-4.5" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {isCollapsed && (
        <button
          onClick={onToggle}
          className="w-14 h-14 rounded-2xl bg-surface-variant/60 backdrop-blur-xl border border-outline-variant/20 flex items-center justify-center shadow-[0_0_30px_rgba(205,189,255,0.1)] hover:scale-105 transition-transform group pointer-events-auto"
        >
          <Bot className="w-6 h-6 text-primary group-hover:text-primary-container transition-colors" />
        </button>
      )}
    </div>
  );
};

const RightSidebar = ({ 
  isCollapsed, 
  onToggle, 
  lectureId, 
  videoRef,
  chapters,
  activeChapterIndex
}: { 
  isCollapsed: boolean, 
  onToggle: () => void, 
  lectureId?: string, 
  videoRef: React.RefObject<HTMLVideoElement | null>,
  chapters: any[],
  activeChapterIndex: number
}) => {
  const [slides, setSlides] = useState<{name: string, url: string}[]>([]);
  const outlineContainerRef = useRef<HTMLDivElement>(null);

  // Scroll to active chapter
  useEffect(() => {
    if (activeChapterIndex >= 0 && outlineContainerRef.current) {
      const activeEl = outlineContainerRef.current.children[activeChapterIndex] as HTMLElement;
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }, [activeChapterIndex]);

  useEffect(() => {
    if (!lectureId) {
      setSlides([]);
      return;
    }
      
    // Fetch dynamic slides
    fetch(`/api/lectures/${lectureId}/slides`)
      .then(res => res.json())
      .then(data => setSlides(data))
      .catch(err => {
        console.error("Slides fetch error:", err);
        setSlides([]);
      });
  }, [lectureId]);

  return (
    <motion.aside
      initial={false}
      animate={{ width: isCollapsed ? 64 : 320 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="bg-surface-container-low shrink-0 flex flex-col relative z-10 border-l border-outline-variant/5 overflow-hidden"
    >
      {/* Unified Header */}
      <div className="p-4 border-b border-outline-variant/10 shrink-0 flex items-center justify-between">
        {!isCollapsed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-2 px-3 min-w-0"
          >
            <List className="w-4 h-4 text-primary shrink-0" />
            <span className="font-label text-xs uppercase tracking-widest font-bold text-on-surface truncate">Course Insights</span>
          </motion.div>
        )}
        <button
          onClick={onToggle}
          className={`p-2 rounded-lg hover:bg-surface-container transition-colors text-on-surface-variant shrink-0 ${isCollapsed ? 'mx-auto' : 'mr-2'}`}
        >
          {isCollapsed ? <ChevronLeft className="w-5 h-5" /> : <PanelRightClose className="w-5 h-5" />}
        </button>
      </div>

      {/* Sidebar Content Area */}
      {!isCollapsed && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex-1 overflow-y-auto p-4 space-y-8 scrollbar-thin scrollbar-thumb-outline-variant/30 scrollbar-track-transparent min-w-[320px]"
        >
          {/* T.O.C. Section */}
          <div className="space-y-4">
            <h3 className="font-label text-[10px] uppercase tracking-[0.1em] text-on-surface-variant/60 font-bold px-3">Lecture Outline</h3>
            
            <div 
              ref={outlineContainerRef}
              className="space-y-1 max-h-[210px] overflow-y-auto pr-1 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-outline-variant/30 [&::-webkit-scrollbar-thumb]:rounded-full"
            >
              {chapters.length === 0 ? (
                <div className="px-3 text-xs text-on-surface-variant">No outline available.</div>
              ) : (
                chapters.map((chap, idx) => {
                  const isActive = idx === activeChapterIndex;
                  return (
                    <div 
                      key={idx} 
                      className={`flex gap-4 p-3 rounded-lg transition-all cursor-pointer group ${isActive ? 'bg-primary/10 border border-primary/20 shadow-sm' : 'hover:bg-surface-container'}`}
                    >
                      <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 transition-colors ${isActive ? 'bg-primary shadow-[0_0_8px_rgba(var(--color-primary),0.8)]' : 'bg-outline-variant/30 group-hover:bg-primary/50'}`}></div>
                      <div className="flex-1">
                        <p className={`font-body text-sm leading-tight transition-colors ${isActive ? 'text-primary font-medium' : 'text-on-surface-variant group-hover:text-on-surface'}`}>{chap.topic_title || chap.title}</p>
                        <p className={`font-label text-[10px] mt-1 ${isActive ? 'text-primary/70' : 'text-on-surface-variant/50'}`}>{chap.timestamp || chap.start_time}</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Summary Section */}
          {chapters.length > 0 && activeChapterIndex >= 0 && chapters[activeChapterIndex].detailed_summary ? (
            <div className="space-y-3">
              <h3 className="font-label text-[10px] uppercase tracking-[0.1em] text-on-surface-variant/60 font-bold px-3">Chapter Summary</h3>
              <div className="px-3">
                <p className="font-body text-xs text-on-surface-variant leading-relaxed bg-surface-container p-3 rounded-xl border border-outline-variant/10">
                  {chapters[activeChapterIndex].detailed_summary}
                </p>
              </div>
            </div>
          ) : chapters.length > 0 && chapters[0].detailed_summary && (
             <div className="space-y-3">
              <h3 className="font-label text-[10px] uppercase tracking-[0.1em] text-on-surface-variant/60 font-bold px-3">Lecture Summary</h3>
              <div className="px-3">
                <p className="font-body text-xs text-on-surface-variant leading-relaxed bg-surface-container p-3 rounded-xl border border-outline-variant/10">
                  {chapters[0].detailed_summary}
                </p>
              </div>
            </div>
          )}

          {/* Resources Section */}
          {lectureId && slides.length > 0 && (
            <div className="space-y-6">
              <div className="space-y-3">
                <h3 className="font-label text-[10px] uppercase tracking-[0.1em] text-on-surface-variant/60 font-bold px-3">Resources & Slides</h3>
                <div className="grid grid-cols-1 gap-2 px-3">
                  {slides.map((s, idx) => (
                    <a key={idx} href={s.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 rounded-lg bg-surface-container-high border border-outline-variant/10 hover:bg-surface-container-highest transition-colors text-left group">
                      <FileText className="w-4 h-4 text-primary" />
                      <span className="text-xs font-medium text-on-surface">{s.name}</span>
                    </a>
                  ))}
                </div>
              </div>
            </div>
          )}
        </motion.div>
      )}
    </motion.aside>
  );
};

export default function Player({ onNavigate }: { onNavigate: (view: string) => void }) {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);
  
  useEffect(() => {
    fetch('/api/lectures')
      .then(res => res.json())
      .then(data => {
        // Load whatever lectures exist dynamically
        const cs231n = data.filter((l: any) => l.id.startsWith('lecture-'));
        const formattedLessons = cs231n.map((l: any, i: number) => ({
          id: i + 1,
          originalId: l.id,
          title: l.title || `Lecture ${i+1}`,
          duration: 'Various',
          status: i === 0 ? 'playing' : 'locked', // locked but we allow select
          videoUrl: `/${l.video_url}` 
        }));
        setLessons(formattedLessons);
      })
      .catch(console.error);
  }, []);

  const [isLeftSidebarCollapsed, setIsLeftSidebarCollapsed] = useState(false);
  const [isRightSidebarCollapsed, setIsRightSidebarCollapsed] = useState(false);
  const [isChatCollapsed, setIsChatCollapsed] = useState(true);
  
  // F2: Proactive Suggestion states
  const [chapters, setChapters] = useState<any[]>([]);
  const [activeChapterIndex, setActiveChapterIndex] = useState<number>(-1);
  const [showProactive, setShowProactive] = useState(false);
  const [proactiveTakeaway, setProactiveTakeaway] = useState<string>("");

  const handleSelectLesson = (id: number) => {
    setLessons(prev => prev.map(lesson => {
      if (lesson.id === id) return { ...lesson, status: 'playing' };
      if (lesson.status === 'playing') return { ...lesson, status: 'completed' };
      return { ...lesson, status: 'locked' };
    }));
  };

  const activeLesson = lessons.find(l => l.status === 'playing');

  // Fetch ToC whenever active lesson changes
  useEffect(() => {
    const lectureId = activeLesson?.originalId;
    if (!lectureId) {
      setChapters([]);
      return;
    }
    fetch(`/data/cs231n/ToC_Summary/${lectureId.replace('_', '-')}.json`)
      .then(res => res.ok ? res.json() : Promise.reject())
      .then(data => {
        if (data.table_of_contents) setChapters(data.table_of_contents);
        else if (Array.isArray(data)) setChapters(data);
        else setChapters([]);
      })
      .catch(() => setChapters([]));
  }, [activeLesson?.originalId]);

  // Sync active chapter index with video time and handle pause detection
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let pauseTimer: any = null;

    const parseTime = (timeStr: string) => {
      if (!timeStr) return 0;
      const parts = timeStr.split(':').map(Number);
      return parts.length === 3 ? parts[0] * 3600 + parts[1] * 60 + parts[2] : parts[0] * 60 + parts[1];
    };

    const handleTimeUpdate = () => {
      const currentTime = video.currentTime;
      let activeIdx = -1;
      const chapterTimes = chapters.map(c => parseTime(c.timestamp || c.start_time));
      for (let i = 0; i < chapterTimes.length; i++) {
        if (currentTime >= chapterTimes[i]) activeIdx = i;
        else break;
      }
      setActiveChapterIndex(activeIdx);
    };

    const handlePause = () => {
      // If paused for > 3s, show suggestion from current chapter
      pauseTimer = setTimeout(() => {
        if (video.paused && activeChapterIndex >= 0) {
          const takeaways = chapters[activeChapterIndex].key_takeaways;
          if (takeaways && takeaways.length > 0) {
            // Pick a random takeaway or the first one
            setProactiveTakeaway(takeaways[0]);
            setShowProactive(true);
          }
        }
      }, 3000);
    };

    const handlePlay = () => {
      if (pauseTimer) clearTimeout(pauseTimer);
      setShowProactive(false);
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('pause', handlePause);
    video.addEventListener('play', handlePlay);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('play', handlePlay);
      if (pauseTimer) clearTimeout(pauseTimer);
    };
  }, [chapters, activeChapterIndex]);

  const getCurrentTimestamp = () => {
    if (videoRef.current) return videoRef.current.currentTime;
    return 0;
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden selection:bg-primary-container/30 selection:text-primary">
      <Header onNavigate={onNavigate} />
      <main className="flex-1 flex overflow-hidden">
        <CourseSidebar
          lessons={lessons}
          onSelectLesson={handleSelectLesson}
          isCollapsed={isLeftSidebarCollapsed}
          onToggle={() => setIsLeftSidebarCollapsed(!isLeftSidebarCollapsed)}
        />
        <section className="flex-1 flex flex-col relative min-w-0 bg-surface">
          <VideoPlayer videoUrl={activeLesson?.videoUrl} videoRef={videoRef} lectureId={activeLesson?.originalId} />
          
          {/* F2: Proactive Suggestion Banner */}
          <AnimatePresence>
            {showProactive && proactiveTakeaway && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="mx-4 mb-4 p-4 bg-primary/5 border border-primary/20 rounded-xl flex items-start gap-3 shadow-sm"
              >
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Lightbulb className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="font-label text-[10px] uppercase tracking-wider text-primary font-bold mb-1">Key Takeaway</p>
                  <p className="text-sm text-on-surface/80 leading-relaxed italic">
                    "{proactiveTakeaway}"
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>
        
        <AIChatbot
          isCollapsed={isChatCollapsed}
          onToggle={() => setIsChatCollapsed(!isChatCollapsed)}
          lectureId={activeLesson?.originalId}
          getCurrentTimestamp={getCurrentTimestamp}
          videoRef={videoRef}
        />
        <RightSidebar
          isCollapsed={isRightSidebarCollapsed}
          onToggle={() => setIsRightSidebarCollapsed(!isRightSidebarCollapsed)}
          lectureId={activeLesson?.originalId}
          videoRef={videoRef}
          chapters={chapters}
          activeChapterIndex={activeChapterIndex}
        />
      </main>
    </div>
  );
}

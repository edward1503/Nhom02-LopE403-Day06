"use client";

import { useEffect, useState, useRef } from "react";
import { UserButton, useUser, useAuth } from "@clerk/nextjs";
import { marked } from "marked";
import renderMathInElement from "katex/contrib/auto-render";
import styles from "./page.module.css";

export default function Home() {
  const { isSignedIn, user, isLoaded } = useUser();
  const { getToken } = useAuth();
  
  const [lectures, setLectures] = useState([]);
  const [activeLectureId, setActiveLectureId] = useState("");
  const [activeTitle, setActiveTitle] = useState("");
  const [messages, setMessages] = useState([
    { role: "ai", content: "Chào bạn! Hãy đặt câu hỏi bất cứ lúc nào trong khi xem video. Tôi sẽ tự động biết bạn đang thắc mắc tại giây thứ bao nhiêu." }
  ]);
  const [question, setQuestion] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  const videoRef = useRef(null);
  const chatEndRef = useRef(null);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Load lectures
  useEffect(() => {
    const fetchLectures = async () => {
      try {
        const token = await getToken();
        // Uses the proxy in next.config.mjs mapping /api/lectures -> FastAPI
        const res = await fetch("/api/lectures", {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setLectures(data);
          if (data.length > 0) {
            handleSelectLecture(data[0].id, data);
          }
        }
      } catch (err) {
        console.error("Failed to load lectures:", err);
      }
    };
    
    if (isLoaded && isSignedIn) {
      fetchLectures();
    }
  }, [isLoaded, isSignedIn]);

  const handleSelectLecture = (id, lecs = lectures) => {
    const lec = lecs.find((l) => l.id === id);
    if (!lec) return;
    setActiveLectureId(id);
    setActiveTitle(lec.title);
  };

  const captureFrame = () => {
    const video = videoRef.current;
    if (!video || !video.src || video.videoWidth === 0) return null;
    
    try {
      const canvas = document.createElement("canvas");
      // Scale down image to width 640px max
      const scale = 640 / video.videoWidth;
      const targetWidth = scale < 1 ? 640 : video.videoWidth;
      const targetHeight = scale < 1 ? video.videoHeight * scale : video.videoHeight;
      
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      
      const ctx = canvas.getContext("2d");
      ctx.drawImage(video, 0, 0, targetWidth, targetHeight);
      
      // Convert to JPEG with quality 0.6 to minimize base64 size (~33% size of original)
      const dataUrl = canvas.toDataURL("image/jpeg", 0.6);
      return dataUrl.split(",")[1];
    } catch {
      return null;
    }
  };

  const triggerMarkdownRender = (element) => {
    if (!element) return;
    renderMathInElement(element, {
      delimiters: [
        {left: "$$", right: "$$", display: true},
        {left: "$", right: "$", display: false},
        {left: "\\(", right: "\\)", display: false},
        {left: "\\[", right: "\\]", display: true}
      ],
      throwOnError: false
    });
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!question.trim() || isLoading) return;

    const currentTimestamp = videoRef.current ? videoRef.current.currentTime : 0;
    const imgBase64 = captureFrame();
    const token = await getToken();
    const q = question.trim();
    
    setMessages(prev => [...prev, { role: "user", content: q }]);
    setQuestion("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/lectures/ask", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}` 
        },
        body: JSON.stringify({ 
          lecture_id: activeLectureId, 
          current_timestamp: currentTimestamp, 
          question: q, 
          image_base64: imgBase64 
        })
      });

      if (!res.ok) {
        throw new Error("Server Error: " + res.status);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let aiText = "";
      
      // Add empty AI message placeholder
      setMessages(prev => [...prev, { role: "ai", content: "" }]);

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        
        const chunkStr = decoder.decode(value, { stream: true });
        const lines = chunkStr.split("\\n");
        
        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const data = JSON.parse(line);
            if (data.a) {
              aiText += data.a;
              setMessages(prev => {
                const newArr = [...prev];
                newArr[newArr.length - 1].content = aiText;
                return newArr;
              });
            } else if (data.error) {
              aiText += `\\n\\n**Lỗi:** ${data.error}`;
            }
          } catch (e) { /* ignore parse error on incomplete chunks */ }
        }
      }
    } catch (err) {
      setMessages(prev => [...prev, { role: "ai", error: true, content: "⚠️ " + err.message }]);
    } finally {
      setIsLoading(false);
    }
  };

  const activeLecture = lectures.find(l => l.id === activeLectureId);

  if (!isLoaded || !isSignedIn) {
    return (
      <div className={styles.loadingContainer}>
        <div>Loading auth...</div>
      </div>
    );
  }

  return (
    <div className={styles.pageWrap}>
      <header className={styles.header}>
        <h2>🎓 AI Tutor</h2>
        <div className={styles.headerRight}>
          <select 
            value={activeLectureId} 
            onChange={(e) => handleSelectLecture(e.target.value)}
            className={styles.lectureSelect}
          >
            {lectures.map(l => (
              <option key={l.id} value={l.id}>{l.title}</option>
            ))}
          </select>
          <div className={styles.userInfo}>
            <span>Xin chào, {user.firstName || user.username}</span>
            <UserButton afterSignOutUrl="/" />
          </div>
        </div>
      </header>

      <div className={styles.container}>
        <div className={styles.videoSection}>
          <div className={styles.videoContainer}>
            {activeLecture?.video_url ? (
              <video 
                ref={videoRef}
                src={activeLecture.video_url} 
                controls 
                crossOrigin="anonymous" 
                className={styles.videoPlayer}
              />
            ) : (
              <div className={styles.noVideoMsg}>Chọn bài giảng để xem video</div>
            )}
          </div>
          <div className={styles.videoInfo}>
            <h4>{activeTitle}</h4>
          </div>
        </div>

        <div className={styles.chatSection}>
          <div className={styles.chatHistory}>
            {messages.map((m, idx) => (
              <div key={idx} className={`${styles.msg} ${m.role === 'user' ? styles.msgUser : styles.msgAi}`}>
                {m.role === 'ai' ? (
                  m.content ? (
                    <div 
                      ref={el => triggerMarkdownRender(el)} 
                      dangerouslySetInnerHTML={{ __html: marked.parse(m.content) }} 
                    />
                  ) : <span className="thinking-indicator">🧠 Thinking</span>
                ) : (
                  m.content
                )}
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
          <form className={styles.chatInputParams} onSubmit={handleSubmit}>
            <textarea 
              value={question}
              onChange={e => setQuestion(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); }
              }}
              placeholder="Hỏi Gia sư..." 
              rows="2"
            />
            <button type="submit" disabled={isLoading || !question.trim()}>
              {isLoading ? 'Đang gửi...' : 'Hỏi Gia sư'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

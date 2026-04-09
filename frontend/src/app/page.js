"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { marked } from "marked";
import styles from "./page.module.css";

export default function Home() {
  const [lectures, setLectures] = useState([]);
  const [activeLectureId, setActiveLectureId] = useState("");
  const [activeTitle, setActiveTitle] = useState("");
  const [messages, setMessages] = useState([
    { role: "ai", content: "Chào bạn! Hãy đặt câu hỏi bất cứ lúc nào trong khi xem video. Tôi sẽ tự động biết bạn đang thắc mắc tại giây thứ bao nhiêu." }
  ]);
  const [question, setQuestion] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // F2: Proactive Suggestion state
  const [suggestion, setSuggestion] = useState(null);
  const [suggestionCooldown, setSuggestionCooldown] = useState(false);
  const pauseTimerRef = useRef(null);

  // F3: Follow-up counter
  const [followUpCount, setFollowUpCount] = useState(0);

  const videoRef = useRef(null);
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Load lectures on mount
  useEffect(() => {
    fetch("/api/lectures")
      .then(r => r.json())
      .then(data => {
        setLectures(data);
        if (data.length > 0) handleSelectLecture(data[0].id, data);
      })
      .catch(console.error);
  }, []);

  const handleSelectLecture = (id, lecs = lectures) => {
    const lec = lecs.find(l => l.id === id);
    if (!lec) return;
    setActiveLectureId(id);
    setActiveTitle(lec.title);
    setFollowUpCount(0);
  };

  // ── F2: Proactive Suggestion (video pause ≥ 3s) ──────────────
  const handleVideoPause = useCallback(() => {
    if (suggestionCooldown || !activeLectureId) return;
    pauseTimerRef.current = setTimeout(async () => {
      const ts = videoRef.current?.currentTime || 0;
      try {
        const res = await fetch(`/api/lectures/${activeLectureId}/suggest?timestamp=${ts}`);
        const data = await res.json();
        if (data && data.concept) {
          setSuggestion(data);
        }
      } catch (e) { console.error("Suggest failed:", e); }
    }, 3000);
  }, [activeLectureId, suggestionCooldown]);

  const handleVideoPlay = useCallback(() => {
    if (pauseTimerRef.current) {
      clearTimeout(pauseTimerRef.current);
      pauseTimerRef.current = null;
    }
    setSuggestion(null);
  }, []);

  const dismissSuggestion = () => {
    setSuggestion(null);
    setSuggestionCooldown(true);
    setTimeout(() => setSuggestionCooldown(false), 10 * 60 * 1000); // 10 min cooldown
  };

  const acceptSuggestion = () => {
    if (suggestion) {
      setQuestion(`Giải thích khái niệm "${suggestion.concept}" cho tôi`);
      setSuggestion(null);
    }
  };

  // ── Capture frame (640px JPEG, quality 0.6) ───────────────────
  const captureFrame = () => {
    const video = videoRef.current;
    if (!video || !video.src || video.videoWidth === 0) return null;
    try {
      const canvas = document.createElement("canvas");
      const scale = Math.min(1, 640 / video.videoWidth);
      canvas.width = video.videoWidth * scale;
      canvas.height = video.videoHeight * scale;
      canvas.getContext("2d").drawImage(video, 0, 0, canvas.width, canvas.height);
      return canvas.toDataURL("image/jpeg", 0.6).split(",")[1];
    } catch { return null; }
  };

  // ── F1: Send question + stream response ───────────────────────
  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!question.trim() || isLoading) return;

    const ts = videoRef.current ? videoRef.current.currentTime : 0;
    const img = captureFrame();
    const q = question.trim();

    setMessages(prev => [...prev, { role: "user", content: q }]);
    setQuestion("");
    setIsLoading(true);
    setFollowUpCount(prev => prev + 1);

    // Add placeholder AI message
    setMessages(prev => [...prev, { role: "ai", content: "", historyId: null, status: null }]);

    try {
      const res = await fetch("/api/lectures/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lecture_id: activeLectureId,
          current_timestamp: ts,
          question: q,
          image_base64: img
        })
      });

      if (!res.ok) throw new Error("Server Error: " + res.status);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let aiText = "";
      let historyId = null;

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");
        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const data = JSON.parse(line);
            if (data.a) {
              aiText += data.a;
              setMessages(prev => {
                const arr = [...prev];
                arr[arr.length - 1] = { ...arr[arr.length - 1], content: aiText };
                return arr;
              });
            }
            if (data.history_id) {
              historyId = data.history_id;
              setMessages(prev => {
                const arr = [...prev];
                arr[arr.length - 1] = { ...arr[arr.length - 1], historyId: data.history_id };
                return arr;
              });
            }
            if (data.e) {
              aiText += `\n\n**Lỗi:** ${data.e}`;
            }
          } catch { /* partial JSON chunk */ }
        }
      }
    } catch (err) {
      setMessages(prev => {
        const arr = [...prev];
        arr[arr.length - 1] = { role: "ai", content: "⚠️ " + err.message, error: true };
        return arr;
      });
    } finally {
      setIsLoading(false);
    }
  };

  // ── F1: Learning Signal (Đã hiểu / Báo sai) ─────────────────
  const sendSignal = async (historyId, action, correctionText) => {
    try {
      await fetch("/api/lectures/signal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ history_id: historyId, action, correction_text: correctionText })
      });
      setMessages(prev => prev.map(m =>
        m.historyId === historyId ? { ...m, status: action } : m
      ));
      if (action === "understood") setFollowUpCount(0);
    } catch (e) { console.error("Signal failed:", e); }
  };

  const [reportingId, setReportingId] = useState(null);
  const [correctionText, setCorrectionText] = useState("");

  const activeLecture = lectures.find(l => l.id === activeLectureId);

  // F3: Show escalation after 3+ follow-ups
  const showEscalation = followUpCount >= 3;

  return (
    <div className={styles.pageWrap}>
      <header className={styles.header}>
        <h2>🎓 AI Tutor</h2>
        <div className={styles.headerRight}>
          <select
            value={activeLectureId}
            onChange={e => handleSelectLecture(e.target.value)}
            className={styles.lectureSelect}
          >
            {lectures.map(l => (
              <option key={l.id} value={l.id}>{l.title}</option>
            ))}
          </select>
          <a href="/admin" className={styles.adminLink}>📊 Dashboard</a>
        </div>
      </header>

      <div className={styles.container}>
        {/* ── Video Section ── */}
        <div className={styles.videoSection}>
          <div className={styles.videoContainer}>
            {activeLecture?.video_url ? (
              <video
                ref={videoRef}
                src={activeLecture.video_url}
                controls
                crossOrigin="anonymous"
                className={styles.videoPlayer}
                onPause={handleVideoPause}
                onPlay={handleVideoPlay}
              />
            ) : (
              <div className={styles.noVideoMsg}>Chọn bài giảng để xem video</div>
            )}
          </div>
          <div className={styles.videoInfo}>
            <h4>{activeTitle}</h4>
          </div>

          {/* F2: Proactive Suggestion Chip */}
          {suggestion && (
            <div className={styles.suggestionChip}>
              <span>💡 Bạn muốn hiểu rõ hơn về <strong>{suggestion.concept}</strong> không?</span>
              <div className={styles.suggestionActions}>
                <button onClick={acceptSuggestion} className={styles.suggestionYes}>Có</button>
                <button onClick={dismissSuggestion} className={styles.suggestionNo}>✕</button>
              </div>
            </div>
          )}
        </div>

        {/* ── Chat Section ── */}
        <div className={styles.chatSection}>
          <div className={styles.chatHistory}>
            {messages.map((m, idx) => (
              <div key={idx} className={`${styles.msg} ${m.role === "user" ? styles.msgUser : styles.msgAi}`}>
                {m.role === "ai" ? (
                  <>
                    {m.content ? (
                      <div dangerouslySetInnerHTML={{ __html: marked.parse(m.content) }} />
                    ) : (
                      <span className="thinking-indicator">🧠 Thinking</span>
                    )}

                    {/* F1: Action buttons (only for completed AI messages with historyId) */}
                    {m.historyId && !m.status && m.content && (
                      <div className={styles.signalButtons}>
                        <button
                          className={styles.understoodBtn}
                          onClick={() => sendSignal(m.historyId, "understood")}
                        >✅ Đã hiểu</button>
                        <button
                          className={styles.reportBtn}
                          onClick={() => { setReportingId(m.historyId); setCorrectionText(""); }}
                        >❌ Báo sai</button>
                      </div>
                    )}
                    {m.status === "understood" && (
                      <div className={styles.signalDone}>✅ Đã đánh dấu hiểu</div>
                    )}
                    {m.status === "reported" && (
                      <div className={styles.signalDone}>📝 Đã báo sai — cảm ơn bạn!</div>
                    )}

                    {/* F1: Correction form */}
                    {reportingId === m.historyId && !m.status && (
                      <div className={styles.correctionForm}>
                        <textarea
                          placeholder="Câu trả lời đúng là gì?"
                          value={correctionText}
                          onChange={e => setCorrectionText(e.target.value)}
                          rows={2}
                        />
                        <div className={styles.correctionActions}>
                          <button onClick={() => {
                            sendSignal(m.historyId, "reported", correctionText);
                            setReportingId(null);
                          }}>Gửi</button>
                          <button onClick={() => setReportingId(null)}>Huỷ</button>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  m.content
                )}
              </div>
            ))}

            {/* F3: Escalation after 3+ follow-ups */}
            {showEscalation && !isLoading && (
              <div className={styles.escalation}>
                <span>🎬 Bạn đã hỏi nhiều câu về phần này. Muốn xem lại video không?</span>
                <button onClick={() => {
                  if (videoRef.current) { videoRef.current.play(); }
                  setFollowUpCount(0);
                }}>Xem lại video</button>
                <button onClick={() => setFollowUpCount(0)} className={styles.resetBtn}>Hỏi lại từ đầu</button>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          <form className={styles.chatInputArea} onSubmit={handleSubmit}>
            <textarea
              value={question}
              onChange={e => setQuestion(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(); } }}
              placeholder="Hỏi Gia sư..."
              rows="2"
            />
            <button type="submit" disabled={isLoading || !question.trim()}>
              {isLoading ? "Đang gửi..." : "Hỏi Gia sư"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

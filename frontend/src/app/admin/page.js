"use client";

import { useEffect, useState } from "react";
import styles from "./admin.module.css";

export default function AdminDashboard() {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchMetrics = async () => {
    try {
      const res = await fetch("/api/admin/metrics");
      if (res.ok) setMetrics(await res.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 15000); // auto-refresh 15s
    return () => clearInterval(interval);
  }, []);

  if (loading) return <div className={styles.loading}>Loading dashboard...</div>;
  if (!metrics) return <div className={styles.loading}>Failed to load metrics</div>;

  const t = metrics.thresholds;

  const getColor = (value, target, red, invert = false) => {
    if (invert) {
      if (value <= target) return styles.green;
      if (value >= red) return styles.red;
      return styles.yellow;
    }
    if (value >= target) return styles.green;
    if (value <= red) return styles.red;
    return styles.yellow;
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <a href="/" className={styles.backLink}>← Quay lại</a>
        <h1>📊 Admin Dashboard</h1>
        <span className={styles.refresh} onClick={fetchMetrics}>🔄 Refresh</span>
      </header>

      {/* ── Metrics Cards ── */}
      <div className={styles.cardsGrid}>
        <div className={`${styles.card} ${getColor(metrics.understood_rate, t.understood_target, t.understood_red)}`}>
          <div className={styles.cardLabel}>Tỷ lệ "Đã hiểu"</div>
          <div className={styles.cardValue}>{metrics.understood_rate}%</div>
          <div className={styles.cardTarget}>Mục tiêu ≥ {t.understood_target}% · Red flag &lt; {t.understood_red}%</div>
        </div>

        <div className={`${styles.card} ${getColor(metrics.hallucination_rate, t.hallucination_target, t.hallucination_red, true)}`}>
          <div className={styles.cardLabel}>Tỷ lệ Hallucination</div>
          <div className={styles.cardValue}>{metrics.hallucination_rate}%</div>
          <div className={styles.cardTarget}>Mục tiêu ≤ {t.hallucination_target}% · Red flag &gt; {t.hallucination_red}%</div>
        </div>

        <div className={`${styles.card} ${getColor(metrics.latency_p95_ms, t.latency_target_ms, t.latency_red_ms, true)}`}>
          <div className={styles.cardLabel}>Latency P95</div>
          <div className={styles.cardValue}>{(metrics.latency_p95_ms / 1000).toFixed(1)}s</div>
          <div className={styles.cardTarget}>Mục tiêu ≤ {t.latency_target_ms/1000}s · Red flag &gt; {t.latency_red_ms/1000}s</div>
        </div>

        <div className={styles.card}>
          <div className={styles.cardLabel}>Tổng Queries</div>
          <div className={styles.cardValue}>{metrics.total_queries}</div>
          <div className={styles.cardTarget}>Online sessions: {metrics.online_sessions}</div>
        </div>
      </div>

      {/* ── Daily Stats ── */}
      {metrics.daily_stats.length > 0 && (
        <div className={styles.section}>
          <h2>📅 Thống kê 7 ngày gần nhất</h2>
          <table className={styles.table}>
            <thead>
              <tr><th>Ngày</th><th>Queries</th></tr>
            </thead>
            <tbody>
              {metrics.daily_stats.map(d => (
                <tr key={d.date}><td>{d.date}</td><td>{d.queries}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Correction Logs ── */}
      {metrics.recent_corrections.length > 0 && (
        <div className={styles.section}>
          <h2>📝 Correction Logs (Failure Analysis)</h2>
          <div className={styles.corrections}>
            {metrics.recent_corrections.map(c => (
              <div key={c.id} className={styles.correctionItem}>
                <div className={styles.correctionQ}>❓ {c.question}</div>
                <div className={styles.correctionWrong}>❌ AI trả lời: {c.wrong_answer}</div>
                {c.correction && <div className={styles.correctionRight}>✅ Đúng: {c.correction}</div>}
                <div className={styles.correctionMeta}>{c.lecture_id} · {c.created_at}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

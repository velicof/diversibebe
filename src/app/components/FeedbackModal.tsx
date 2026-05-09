"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function FeedbackModal({ isOpen, onClose }: FeedbackModalProps) {
  const [q1, setQ1] = useState("");
  const [q2, setQ2] = useState("");
  const [q3, setQ3] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  if (!isOpen) return null;

  const hasContent = q1.trim() || q2.trim() || q3.trim();

  async function handleSubmit() {
    if (!hasContent || sending) return;
    setSending(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setSending(false);
        return;
      }
      await supabase.from("feedback").insert({
        user_id: user.id,
        question_1: q1.trim() || null,
        question_2: q2.trim() || null,
        question_3: q3.trim() || null,
      });
      setSent(true);
    } catch {
      // silently fail
    } finally {
      setSending(false);
    }
  }

  function handleClose() {
    setQ1("");
    setQ2("");
    setQ3("");
    setSent(false);
    onClose();
  }

  const textareaStyle: React.CSSProperties = {
    width: "100%",
    minHeight: 72,
    borderRadius: 12,
    border: "1px solid #EDE7F6",
    background: "#FDFBFF",
    padding: "10px 14px",
    fontSize: 13,
    fontFamily: "Nunito, sans-serif",
    color: "#3D2C3E",
    outline: "none",
    resize: "vertical" as const,
  };

  return (
    <>
      {/* Overlay */}
      <button
        type="button"
        onClick={handleClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.35)",
          zIndex: 1100,
          border: "none",
          padding: 0,
          cursor: "pointer",
        }}
        aria-label="Închide"
      />

      {/* Modal sheet */}
      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: "50%",
          transform: "translateX(-50%)",
          width: "100%",
          maxWidth: 393,
          maxHeight: "85vh",
          background: "white",
          borderRadius: "24px 24px 0 0",
          boxShadow: "0 -4px 32px rgba(0,0,0,0.15)",
          zIndex: 1101,
          display: "flex",
          flexDirection: "column",
          fontFamily: "Nunito, sans-serif",
          overflow: "hidden",
        }}
      >
        {/* Handle bar */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            padding: "12px 0 4px",
          }}
        >
          <div
            style={{
              width: 40,
              height: 4,
              borderRadius: 2,
              background: "#EDE7F6",
            }}
          />
        </div>

        {sent ? (
          /* Success state */
          <div
            style={{
              padding: "40px 24px 48px",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 48, marginBottom: 16 }}>💜</div>
            <h2
              style={{
                fontSize: 18,
                fontWeight: 800,
                color: "#3D2C3E",
                marginBottom: 8,
              }}
            >
              Mulțumim!
            </h2>
            <p
              style={{
                fontSize: 14,
                color: "#8B7A8E",
                lineHeight: 1.5,
                marginBottom: 24,
              }}
            >
              Feedback-ul tău contează. Ne ajuți să facem DiversiBebe mai bun
              pentru tine și bebelușul tău.
            </p>
            <button
              type="button"
              onClick={handleClose}
              style={{
                background: "#D4849A",
                color: "white",
                border: "none",
                borderRadius: 16,
                padding: "12px 32px",
                fontSize: 14,
                fontWeight: 700,
                fontFamily: "Nunito, sans-serif",
                cursor: "pointer",
              }}
            >
              Închide
            </button>
          </div>
        ) : (
          /* Form state */
          <div
            style={{
              padding: "8px 24px 24px",
              overflowY: "auto",
              flex: 1,
            }}
          >
            <h2
              style={{
                fontSize: 18,
                fontWeight: 800,
                color: "#3D2C3E",
                marginBottom: 4,
              }}
            >
              Cum te putem ajuta mai mult?
            </h2>
            <p
              style={{
                fontSize: 13,
                color: "#8B7A8E",
                lineHeight: 1.5,
                marginBottom: 20,
              }}
            >
              Părerea ta ne ajută să facem DiversiBebe mai bun pentru tine și
              bebelușul tău.
            </p>

            {/* Question 1 */}
            <label
              style={{
                display: "block",
                fontSize: 13,
                fontWeight: 700,
                color: "#3D2C3E",
                marginBottom: 6,
              }}
            >
              Ce ți-ar fi de folos și nu găsești în aplicație?
            </label>
            <textarea
              value={q1}
              onChange={(e) => setQ1(e.target.value)}
              style={textareaStyle}
              placeholder="ex: un timer pentru mese, rețete video..."
            />

            {/* Question 2 */}
            <label
              style={{
                display: "block",
                fontSize: 13,
                fontWeight: 700,
                color: "#3D2C3E",
                marginBottom: 6,
                marginTop: 16,
              }}
            >
              Ce te-a frustrat sau nu a mers cum te așteptai?
            </label>
            <textarea
              value={q2}
              onChange={(e) => setQ2(e.target.value)}
              style={textareaStyle}
              placeholder="ex: nu am găsit o rețetă, navigarea e confuză..."
            />

            {/* Question 3 */}
            <label
              style={{
                display: "block",
                fontSize: 13,
                fontWeight: 700,
                color: "#3D2C3E",
                marginBottom: 6,
                marginTop: 16,
              }}
            >
              Ce îți place cel mai mult la DiversiBebe?
            </label>
            <textarea
              value={q3}
              onChange={(e) => setQ3(e.target.value)}
              style={textareaStyle}
              placeholder="ex: rețetele, planul săptămânal, jurnalul..."
            />

            {/* Actions */}
            <div
              style={{
                display: "flex",
                gap: 12,
                marginTop: 20,
                paddingBottom: 8,
              }}
            >
              <button
                type="button"
                onClick={handleClose}
                style={{
                  flex: 1,
                  background: "white",
                  color: "#8B7A8E",
                  border: "1px solid #EDE7F6",
                  borderRadius: 16,
                  padding: "12px 0",
                  fontSize: 14,
                  fontWeight: 700,
                  fontFamily: "Nunito, sans-serif",
                  cursor: "pointer",
                }}
              >
                Mai târziu
              </button>
              <button
                type="button"
                onClick={() => void handleSubmit()}
                disabled={!hasContent || sending}
                style={{
                  flex: 1,
                  background: hasContent && !sending ? "#D4849A" : "#EDE7F6",
                  color: hasContent && !sending ? "white" : "#B8A9BB",
                  border: "none",
                  borderRadius: 16,
                  padding: "12px 0",
                  fontSize: 14,
                  fontWeight: 700,
                  fontFamily: "Nunito, sans-serif",
                  cursor: hasContent && !sending ? "pointer" : "not-allowed",
                  transition: "background 0.2s",
                }}
              >
                {sending ? "Se trimite..." : "Trimite 💌"}
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

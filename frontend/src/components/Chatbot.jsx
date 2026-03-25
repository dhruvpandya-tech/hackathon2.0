import { useMemo, useState } from "react";

const initialGreeting =
  "Hi! I'm your ConvertX copilot. Ask me about SEO, UX, mobile, performance, or what to fix first.";

const Chatbot = ({ analysis }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([
    { id: "greeting", sender: "bot", text: initialGreeting },
  ]);

  const issues = useMemo(() => analysis?.issues ?? [], [analysis]);
  const suggestions = useMemo(() => analysis?.suggestions ?? [], [analysis]);

  const topSuggestions = suggestions.slice(0, 2);

  const formatScore = (label, value) => {
    if (typeof value === "number") {
      return `${label} ${Math.round(value)}`;
    }
    return `${label} score isn't available yet.`;
  };

  const findIssueByArea = (area) =>
    issues.find(
      (issue) => (issue?.area ?? "").toLowerCase() === area.toLowerCase()
    );

  const buildSuggestionText = () => {
    if (!topSuggestions.length) {
      return "I need more data before recommending fixes. Run an analysis first.";
    }
    return topSuggestions
      .map(
        (item, idx) =>
          `${idx + 1}. ${item?.title ?? "Improvement idea"} – ${
            item?.rationale ?? item?.description ?? "No description available."
          }`
      )
      .join(" ");
  };

  const buildScoreSummary = () => {
    const pieces = [
      typeof analysis?.ux_score === "number"
        ? `UX ${analysis.ux_score}`
        : null,
      typeof analysis?.seo_score === "number"
        ? `SEO ${analysis.seo_score}`
        : null,
      typeof analysis?.mobile_score === "number"
        ? `Mobile ${analysis.mobile_score}`
        : null,
      typeof analysis?.performance_score === "number"
        ? `Performance ${analysis.performance_score}`
        : null,
      typeof analysis?.lead_score === "number"
        ? `Lead ${analysis.lead_score}`
        : null,
      typeof analysis?.growth_score === "number"
        ? `Growth ${analysis.growth_score}`
        : null,
    ].filter(Boolean);

    if (!pieces.length) {
      return "Scores will appear after your first analysis run.";
    }

    return `Current benchmarks — ${pieces.join(", ")}.`;
  };

  const buildAreaResponse = (area, label, fallback) => {
    const issue = findIssueByArea(area);
    const scoreValue = analysis?.[`${area}_score`];
    const baseScoreText =
      typeof scoreValue === "number"
        ? `${label} score is ${scoreValue}.`
        : `${label} score is not available yet.`;

    if (issue) {
      return `${baseScoreText} Key blocker: ${issue.title ?? issue.description
        } — ${issue.description ?? "needs attention."}`;
    }

    return `${baseScoreText} ${fallback}`;
  };

  const handleSend = () => {
    if (!input.trim()) return;
    const userMessage = {
      id: `user-${Date.now()}`,
      sender: "user",
      text: input.trim(),
    };
    const responseText = getBotResponse(input.trim());
    setMessages((prev) => [
      ...prev,
      userMessage,
      {
        id: `bot-${Date.now()}`,
        sender: "bot",
        text: responseText,
      },
    ]);
    setInput("");
    if (!isOpen) {
      setIsOpen(true);
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  const getBotResponse = (raw) => {
    const query = raw.toLowerCase();
    if (!analysis) {
      return "Run an analysis first so I can reference your data.";
    }

    if (query.includes("score")) {
      return buildScoreSummary();
    }
    if (query.includes("seo")) {
      return (
        buildAreaResponse(
          "seo",
          "SEO",
          "Focus on metadata, internal links, and fresh content."
        ) || "Your SEO story will appear after the next scan."
      );
    }
    if (query.includes("ux")) {
      return (
        buildAreaResponse(
          "ux",
          "UX",
          "Tighten intent-driven flows and reduce friction."
        ) || "I'll break down UX insights once we have data."
      );
    }
    if (query.includes("mobile")) {
      return (
        buildAreaResponse(
          "mobile",
          "Mobile",
          "Ensure responsive layouts and touch-friendly CTAs."
        ) || "Mobile optimizations will surface after analysis."
      );
    }
    if (query.includes("performance")) {
      return (
        buildAreaResponse(
          "performance",
          "Performance",
          "Trim heavy scripts and optimize images for faster render."
        ) || "Performance stats are on the way once we scan."
      );
    }
    if (query.includes("fix") || query.includes("improve")) {
      return buildSuggestionText();
    }

    return "Ask about SEO, UX, mobile, performance, or which improvements to tackle first.";
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {isOpen ? (
        <div className="w-80 sm:w-96 rounded-3xl border border-white/10 bg-[#050b1f]/95 backdrop-blur-xl shadow-[0_20px_80px_rgba(0,0,0,0.6)] flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
            <div>
              <p className="text-[10px] uppercase tracking-[0.4em] text-white/50">Copilot</p>
              <p className="text-sm font-semibold text-white">Analysis Chat</p>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="rounded-full border border-white/10 px-2 py-1 text-xs text-white/70 hover:text-white"
            >
              Close
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 text-sm">
            {messages.map((message) => {
              const isUser = message.sender === "user";
              return (
                <div
                  key={message.id}
                  className={`flex ${isUser ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-2 shadow-lg ${isUser
                        ? "bg-gradient-to-r from-emerald-400 to-sky-400 text-black"
                        : "bg-white/10 text-white"
                      }`}
                  >
                    {message.text}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="border-t border-white/10 p-3 flex items-center gap-2 bg-black/40">
            <input
              type="text"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about SEO, UX, fixes..."
              className="flex-1 rounded-2xl border border-white/10 bg-black/40 px-4 py-2 text-sm text-white placeholder-white/50 focus:border-emerald-300 focus:outline-none"
            />
            <button
              type="button"
              onClick={handleSend}
              className="rounded-2xl bg-gradient-to-r from-emerald-400 to-cyan-400 px-4 py-2 text-sm font-semibold text-slate-900"
            >
              Send
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="rounded-full bg-gradient-to-r from-emerald-400 to-sky-400 px-5 py-3 text-sm font-semibold text-slate-900 shadow-[0_15px_60px_rgba(0,0,0,0.35)]"
        >
          Ask ConvertX
        </button>
      )}
    </div>
  );
};

export default Chatbot;

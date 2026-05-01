import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Send } from "lucide-react";
import { usePersona } from "@/context/PersonaContext";
import { findResponse, initialMessage, suggestions } from "@/data/chatResponses";

type Message = { id: string; from: "ai" | "user"; text: string };

export function ChatInterface() {
  const { current } = usePersona();
  const [messages, setMessages] = useState<Message[]>([
    { id: "init", from: "ai", text: initialMessage.replace("Maria", current.firstName) },
  ]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, typing]);

  const send = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const userMsg: Message = { id: `${Date.now()}-u`, from: "user", text: trimmed };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setTyping(true);
    window.setTimeout(() => {
      const reply = findResponse(trimmed).replace("Maria", current.firstName);
      setMessages((prev) => [...prev, { id: `${Date.now()}-a`, from: "ai", text: reply }]);
      setTyping(false);
    }, 900);
  };

  return (
    <div className="flex h-[100dvh] flex-col bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur">
        <div className="container-mobile flex h-14 items-center gap-3">
          <Link to="/dashboard" aria-label="Voltar" className="tap-target -ml-2 flex items-center justify-center rounded-md hover:bg-muted">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </Link>
          <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-semibold">
            E
            <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background bg-success" />
          </div>
          <div className="flex-1">
            <div className="text-sm font-semibold text-foreground">EmpowerFI Assistente</div>
            <div className="text-[11px] text-success">Online</div>
          </div>
        </div>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="container-mobile space-y-3 py-4">
          {messages.map((m) => (
            <div
              key={m.id}
              className={["flex animate-fade-in", m.from === "user" ? "justify-end" : "justify-start"].join(" ")}
            >
              <div
                className={[
                  "max-w-[85%] whitespace-pre-line rounded-2xl px-4 py-2.5 text-[15px] leading-relaxed shadow-sm",
                  m.from === "user"
                    ? "rounded-br-sm bg-primary text-primary-foreground"
                    : "rounded-bl-sm border border-border bg-card text-foreground",
                ].join(" ")}
              >
                {m.text}
              </div>
            </div>
          ))}

          {typing ? (
            <div className="flex justify-start">
              <div className="flex items-center gap-1 rounded-2xl rounded-bl-sm border border-border bg-card px-4 py-3">
                <span className="typing-dot h-1.5 w-1.5 rounded-full bg-muted-foreground" />
                <span className="typing-dot h-1.5 w-1.5 rounded-full bg-muted-foreground" />
                <span className="typing-dot h-1.5 w-1.5 rounded-full bg-muted-foreground" />
              </div>
            </div>
          ) : null}

          {messages.length === 1 ? (
            <div className="flex flex-wrap gap-2 pt-2">
              {suggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="rounded-full border border-border bg-card px-3.5 py-2 text-xs font-medium text-foreground hover:bg-muted"
                >
                  {s}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="border-t border-border bg-background"
      >
        <div className="container-mobile flex items-center gap-2 py-3">
          <label htmlFor="chat-input" className="sr-only">
            Mensagem
          </label>
          <input
            id="chat-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Pergunte alguma coisa..."
            className="tap-target flex-1 rounded-full border border-border bg-card px-4 text-[15px] outline-none ring-primary/20 focus:ring-2"
          />
          <button
            type="submit"
            aria-label="Enviar"
            className="tap-target flex h-11 w-11 items-center justify-center rounded-full bg-primary text-primary-foreground hover:bg-primary/95"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </form>
    </div>
  );
}

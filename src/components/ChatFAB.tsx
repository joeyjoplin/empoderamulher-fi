import { MessageCircle } from "lucide-react";
import { Link } from "react-router-dom";

export function ChatFAB() {
  return (
    <Link
      to="/chat"
      aria-label="Abrir chat com assistente EmpowerFI"
      className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 transition-transform hover:scale-105 active:scale-95"
    >
      <MessageCircle className="h-6 w-6" />
    </Link>
  );
}

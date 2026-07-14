"use client";

import { FormEvent, useState } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

interface AssistantSearchBoxProps {
  onSubmit: (question: string) => void;
}

export function AssistantSearchBox({ onSubmit }: AssistantSearchBoxProps) {
  const [question, setQuestion] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = question.trim().slice(0, 300);
    if (!trimmed) return;
    onSubmit(trimmed);
    setQuestion("");
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <Input
        value={question}
        onChange={(event) => setQuestion(event.target.value)}
        maxLength={300}
        placeholder="Ask about access, ZIP, messages..."
        aria-label="Ask Oriana Companion"
        className="h-11 rounded-full bg-background/70"
      />
      <Button type="submit" variant="icon" aria-label="Send question">
        <Send className="h-4 w-4" />
      </Button>
    </form>
  );
}

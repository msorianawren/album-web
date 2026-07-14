"use client";

import { FormEvent, useState } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

interface AssistantSearchBoxProps {
  onSubmit: (question: string) => void;
  placeholder: string;
  inputLabel: string;
  sendLabel: string;
}

export function AssistantSearchBox({
  onSubmit,
  placeholder,
  inputLabel,
  sendLabel,
}: AssistantSearchBoxProps) {
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
        placeholder={placeholder}
        aria-label={inputLabel}
        className="h-11 rounded-full bg-background/70"
      />
      <Button type="submit" variant="icon" aria-label={sendLabel}>
        <Send className="h-4 w-4" />
      </Button>
    </form>
  );
}

"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import type { Comment } from "@/lib/types";

interface CommentSectionProps {
  albumId: string;
}

export function CommentSection({ albumId }: CommentSectionProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [authorName, setAuthorName] = useState("");
  const [body, setBody] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetch(`/api/comments?albumId=${albumId}`)
      .then((response) => response.json())
      .then((payload) => {
        if (payload.success) setComments(payload.data.comments);
      })
      .catch(() => setMessage("Comments could not be loaded."));
  }, [albumId]);

  async function submitComment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!body.trim()) {
      setMessage("Comment cannot be empty.");
      return;
    }

    setIsSubmitting(true);
    setMessage("");

    const response = await fetch("/api/comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        albumId,
        author_name: authorName || null,
        body,
      }),
    });
    const payload = await response.json();

    if (payload.success) {
      setComments((current) => [payload.data.comment, ...current]);
      setBody("");
      setAuthorName("");
      setMessage("Comment posted.");
    } else {
      setMessage(payload.message ?? "Comment failed.");
    }

    setIsSubmitting(false);
  }

  return (
    <section className="mx-auto w-full max-w-[960px] px-4 pb-20 sm:px-8">
      <div className="rounded-[2rem] border border-border bg-surface p-5 sm:p-7">
        <h2 className="text-2xl font-semibold text-text-primary">Comments</h2>
        <form className="mt-5 grid gap-3" onSubmit={submitComment}>
          <Input
            value={authorName}
            onChange={(event) => setAuthorName(event.target.value)}
            placeholder="Your name (optional)"
            aria-label="Your name"
          />
          <Textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            placeholder="Leave a thoughtful comment"
            aria-label="Comment body"
            required
          />
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-text-secondary" aria-live="polite">
              {message}
            </p>
            <Button type="submit" disabled={isSubmitting}>
              <Send className="h-4 w-4" aria-hidden="true" />
              {isSubmitting ? "Posting..." : "Post"}
            </Button>
          </div>
        </form>

        <div className="mt-8 grid gap-4">
          {comments.map((comment) => (
            <article key={comment.id} className="rounded-2xl bg-background p-4">
              <p className="font-medium text-text-primary">
                {comment.author_name || "Anonymous"}
              </p>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-text-secondary">
                {comment.body}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

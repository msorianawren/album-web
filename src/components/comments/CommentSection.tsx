"use client";

import { useEffect, useState, type FormEvent } from "react";
import { MessageCircle, Send } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { useI18n } from "@/lib/i18n-client";
import type { Comment } from "@/lib/types";

interface CommentSectionProps {
  albumId: string;
}

export function CommentSection({ albumId }: CommentSectionProps) {
  const { locale, t } = useI18n();
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
      .catch(() => setMessage(t("comments.loadFailed")));
  }, [albumId, t]);

  async function submitComment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!body.trim()) {
      setMessage(t("comments.emptyError"));
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
      if (payload.data.comment) {
        setComments((current) => [payload.data.comment, ...current]);
      }
      setBody("");
      setAuthorName("");
      setMessage(payload.data.message ?? t("comments.posted"));
    } else {
      setMessage(payload.message ?? t("comments.failed"));
      if (payload.code === "COMMENT_BLOCKED") {
        window.setTimeout(() => {
          window.location.href = "/boycott";
        }, 900);
      }
    }

    setIsSubmitting(false);
  }

  return (
    <section className="mx-auto w-full max-w-[960px] px-4 pb-20 sm:px-8">
      <div className="rounded-[2rem] border border-border bg-surface/80 p-5 shadow-xl shadow-text-primary/5 sm:p-7">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-background">
            <MessageCircle className="h-5 w-5 text-text-secondary" aria-hidden="true" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-text-secondary">
              {t("comments.guestBook")}
            </p>
            <h2 className="text-2xl font-semibold text-text-primary">
              {t("comments.title")}
            </h2>
          </div>
        </div>
        <form className="mt-5 grid gap-3" onSubmit={submitComment}>
          <Input
            value={authorName}
            onChange={(event) => setAuthorName(event.target.value)}
            placeholder={t("comments.namePlaceholder")}
            aria-label={t("comments.nameLabel")}
          />
          <Textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            placeholder={t("comments.bodyPlaceholder")}
            aria-label={t("comments.bodyLabel")}
            required
          />
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-text-secondary" aria-live="polite">
              {message}
            </p>
            <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
              <Send className="h-4 w-4" aria-hidden="true" />
              {isSubmitting ? t("comments.posting") : t("comments.post")}
            </Button>
          </div>
        </form>

        <div className="mt-8 grid gap-4">
          {!comments.length ? (
            <div className="rounded-2xl border border-dashed border-border bg-background/60 p-6 text-center text-sm text-text-secondary">
              {t("comments.empty")}
            </div>
          ) : null}
          {comments.map((comment) => (
            <article
              key={comment.id}
              className="flex gap-4 rounded-2xl border border-border bg-background/70 p-4 animate-editorial-in"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-secondary text-sm font-semibold text-text-primary">
                {(comment.author_name || "A").slice(0, 1).toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-baseline gap-2">
                  <p className="font-medium text-text-primary">
                    {comment.author_name || t("comments.anonymous")}
                  </p>
                  <time className="text-xs text-text-secondary">
                    {new Date(comment.created_at).toLocaleDateString(locale)}
                  </time>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-text-secondary">
                  {comment.body}
                </p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

"use client";

import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Send, CheckCircle2, AlertCircle, Mail } from "lucide-react";
import { ASSISTANT_HANDOFF_STORAGE_KEY, sanitizeAssistantQuestion } from "@/lib/assistant/answer-engine";

interface ContactFormProps {
  contactEmail?: string;
  formMode?: "mailto_only" | "store_only" | "store_and_fallback" | "disabled";
  allowedTypes?: string[];
  maxMessage?: number;
  maxSubject?: number;
  maxName?: number;
  initialEmail?: string;
  initialName?: string;
  useUnifiedInbox?: boolean;
}

export function ContactForm({
  contactEmail,
  formMode = "store_and_fallback",
  allowedTypes = [],
  maxMessage = 2000,
  maxSubject = 200,
  maxName = 100,
  initialEmail = "",
  initialName = "",
  useUnifiedInbox = false,
}: ContactFormProps) {
  const [formData, setFormData] = useState({
    name: initialName,
    email: initialEmail,
    subject: "",
    inquiry_type: allowedTypes[0] || "General Inquiry",
    message: "",
    honey_trap: "", // Hidden field
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [submitStartTime] = useState(() => Date.now().toString());
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const raw = window.sessionStorage.getItem(ASSISTANT_HANDOFF_STORAGE_KEY);
        if (!raw) return;

        const draft = JSON.parse(raw);
        const subject =
          typeof draft?.subject === "string"
            ? draft.subject.trim().slice(0, maxSubject)
            : "Assistant handoff";
        const message =
          typeof draft?.message === "string"
            ? sanitizeAssistantQuestion(draft.message).slice(0, maxMessage)
            : "";

        setFormData((current) => ({
          ...current,
          subject: subject || "Assistant handoff",
          inquiry_type: allowedTypes.includes("General Inquiry")
            ? "General Inquiry"
            : current.inquiry_type,
          message,
        }));
        window.sessionStorage.removeItem(ASSISTANT_HANDOFF_STORAGE_KEY);
      } catch {
        window.sessionStorage.removeItem(ASSISTANT_HANDOFF_STORAGE_KEY);
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, [allowedTypes, maxMessage, maxSubject]);

  const getMailtoLink = () => {
    if (!contactEmail) return "#";
    const sub = encodeURIComponent(formData.subject || formData.inquiry_type || "Contact Inquiry");
    const body = encodeURIComponent(`Name: ${formData.name}\n\n${formData.message}`);
    return `mailto:${contactEmail}?subject=${sub}&body=${body}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formMode === "mailto_only" || formMode === "disabled") {
      if (formMode === "mailto_only" && contactEmail) {
        window.location.href = getMailtoLink();
      }
      return;
    }

    setIsSubmitting(true);
    setErrorMsg("");

    try {
      const payloadData = {
        ...formData,
        submit_start_time: submitStartTime
      };

      const res = await fetch(useUnifiedInbox ? "/api/help/threads" : "/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(useUnifiedInbox ? {
          source: "contact",
          subject: formData.subject,
          body: formData.message,
        } : payloadData),
      });

      const payload = await res.json();

      if (!res.ok || !payload.success) {
        throw new Error(payload.message || "Failed to submit.");
      }

      setIsSent(true);
      setFormData({ name: "", email: "", subject: "", inquiry_type: allowedTypes[0] || "General Inquiry", message: "", honey_trap: "" });
    } catch (error) {
      if (error instanceof Error) {
        setErrorMsg(error.message);
      } else {
        setErrorMsg("Failed to send message.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (formMode === "disabled") {
    return (
      <div className="rounded-xl border border-border bg-surface/50 p-6 text-center text-text-secondary">
        The contact form is currently disabled.
      </div>
    );
  }

  if (isSent) {
    return (
      <div className="flex h-full flex-col items-center justify-center space-y-4 rounded-2xl bg-surface/50 p-8 text-center sm:p-12 border border-border">
        <CheckCircle2 className="h-12 w-12 text-emerald-500" />
        <h3 className="text-xl font-semibold text-text-primary">Message Sent Successfully</h3>
        <p className="text-sm text-text-secondary">
          Thank you for reaching out. I will get back to you as soon as possible.
        </p>
        <Button onClick={() => setIsSent(false)} variant="secondary" className="mt-4">
          Send Another Message
        </Button>
      </div>
    );
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col space-y-5 relative">
      {errorMsg && (
        <div className="flex items-center justify-between gap-2 rounded-xl bg-red-500/10 p-4 text-sm text-red-500">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          {(formMode === "store_and_fallback" || formMode === "mailto_only") && contactEmail && (
            <Button type="button" variant="secondary" className="shrink-0 bg-red-500/20 hover:bg-red-500/30 text-red-500 border-none" onClick={() => window.location.href = getMailtoLink()}>
              Use Email
            </Button>
          )}
        </div>
      )}

      {/* Honeypot field - hidden from users and screen readers, visible to bots parsing HTML */}
      <div aria-hidden="true" style={{ position: 'absolute', opacity: 0, height: 0, width: 0, zIndex: -1, overflow: 'hidden' }}>
        <label htmlFor="honey_trap">Leave this field blank</label>
        <Input
          id="honey_trap"
          name="honey_trap"
          tabIndex={-1}
          autoComplete="off"
          value={formData.honey_trap}
          onChange={(e) => setFormData(p => ({ ...p, honey_trap: e.target.value }))}
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-1">
          <label htmlFor="name" className="text-xs font-medium uppercase tracking-wider text-text-secondary">Your Name</label>
          <Input id="name" name="name" required maxLength={maxName} value={formData.name} onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))} placeholder="Jane Doe" className="bg-surface/50" />
        </div>

        <div className="space-y-1">
          <label htmlFor="email" className="text-xs font-medium uppercase tracking-wider text-text-secondary">Your Email</label>
          <Input id="email" name="email" type="email" required maxLength={100} value={formData.email} onChange={(e) => setFormData(p => ({ ...p, email: e.target.value }))} placeholder="jane@example.com" className="bg-surface/50" />
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-1">
          <label htmlFor="inquiry_type" className="text-xs font-medium uppercase tracking-wider text-text-secondary">Inquiry Type</label>
          <select
            id="inquiry_type"
            name="inquiry_type"
            required
            value={formData.inquiry_type}
            onChange={(e) => setFormData(p => ({ ...p, inquiry_type: e.target.value }))}
            className="flex h-10 w-full rounded-xl border border-border bg-surface/50 px-3 py-2 text-sm ring-offset-background placeholder:text-text-tertiary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 text-text-primary"
          >
            {allowedTypes.length > 0 ? allowedTypes.map(type => (
              <option key={type} value={type} className="bg-background">{type}</option>
            )) : (
              <option value="General Inquiry" className="bg-background">General Inquiry</option>
            )}
          </select>
        </div>

        <div className="space-y-1">
          <label htmlFor="subject" className="text-xs font-medium uppercase tracking-wider text-text-secondary">Subject</label>
          <Input id="subject" name="subject" required maxLength={maxSubject} value={formData.subject} onChange={(e) => setFormData(p => ({ ...p, subject: e.target.value }))} placeholder="e.g. Editorial Collaboration" className="bg-surface/50" />
        </div>
      </div>

      <div className="space-y-1">
        <label htmlFor="message" className="text-xs font-medium uppercase tracking-wider text-text-secondary">Message</label>
        <Textarea id="message" name="message" required maxLength={maxMessage} value={formData.message} onChange={(e) => setFormData(p => ({ ...p, message: e.target.value }))} placeholder="Tell me about your project..." rows={6} className="resize-none bg-surface/50" />
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        {formMode !== "mailto_only" && (
          <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
            <Send className="mr-2 h-4 w-4" />
            {isSubmitting ? "Sending..." : "Send Message"}
          </Button>
        )}

        {(formMode === "mailto_only" || formMode === "store_and_fallback") && contactEmail && (
          <Button 
            type={formMode === "mailto_only" ? "submit" : "button"} 
            variant={formMode === "mailto_only" ? "primary" : "secondary"} 
            className="w-full sm:w-auto"
            onClick={formMode !== "mailto_only" ? () => { window.location.href = getMailtoLink() } : undefined}
          >
            <Mail className="mr-2 h-4 w-4" /> 
            {formMode === "mailto_only" ? "Send via Email Client" : "Email Client Fallback"}
          </Button>
        )}
      </div>
      <p className="text-xs text-text-tertiary mt-4">
        Protected by secure anti-spam checks. Your IP and browser data may be temporarily hashed for duplicate prevention.
      </p>
    </form>
  );
}

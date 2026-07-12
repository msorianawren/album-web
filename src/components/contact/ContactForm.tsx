"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Send, CheckCircle2, AlertCircle } from "lucide-react";

interface ContactFormProps {
  contactEmail?: string;
}

export function ContactForm({ contactEmail }: ContactFormProps) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg("");
    
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const payload = await res.json();

      if (!res.ok || !payload.success) {
        throw new Error(payload.message || "Something went wrong.");
      }

      setIsSent(true);
      setFormData({ name: "", email: "", subject: "", message: "" });
    } catch (error: any) {
      setErrorMsg(error.message || "Failed to send message.");
    } finally {
      setIsSubmitting(false);
    }
  };

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
    <form onSubmit={handleSubmit} className="flex flex-col space-y-5">
      {errorMsg && (
        <div className="flex items-center gap-2 rounded-xl bg-red-500/10 p-3 text-sm text-red-500">
          <AlertCircle className="h-4 w-4" />
          {errorMsg}
        </div>
      )}
      
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-1">
          <label htmlFor="name" className="text-xs font-medium uppercase tracking-wider text-text-secondary">
            Your Name
          </label>
          <Input
            id="name"
            name="name"
            required
            value={formData.name}
            onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))}
            placeholder="Jane Doe"
            className="bg-surface/50"
          />
        </div>
        
        <div className="space-y-1">
          <label htmlFor="email" className="text-xs font-medium uppercase tracking-wider text-text-secondary">
            Your Email
          </label>
          <Input
            id="email"
            name="email"
            type="email"
            required
            value={formData.email}
            onChange={(e) => setFormData(p => ({ ...p, email: e.target.value }))}
            placeholder="jane@example.com"
            className="bg-surface/50"
          />
        </div>
      </div>
      
      <div className="space-y-1">
        <label htmlFor="subject" className="text-xs font-medium uppercase tracking-wider text-text-secondary">
          Subject
        </label>
        <Input
          id="subject"
          name="subject"
          required
          value={formData.subject}
          onChange={(e) => setFormData(p => ({ ...p, subject: e.target.value }))}
          placeholder="e.g. Editorial Collaboration"
          className="bg-surface/50"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="message" className="text-xs font-medium uppercase tracking-wider text-text-secondary">
          Message
        </label>
        <Textarea
          id="message"
          name="message"
          required
          value={formData.message}
          onChange={(e) => setFormData(p => ({ ...p, message: e.target.value }))}
          placeholder="Tell me about your project..."
          rows={5}
          className="resize-none bg-surface/50"
        />
      </div>

      <Button
        type="submit"
        disabled={isSubmitting}
        className="w-full sm:w-auto self-start"
      >
        <Send className="mr-2 h-4 w-4" />
        {isSubmitting ? "Sending..." : "Send Message"}
      </Button>
    </form>
  );
}

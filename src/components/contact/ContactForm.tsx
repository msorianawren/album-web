"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Send, CheckCircle2 } from "lucide-react";

interface ContactFormProps {
  contactEmail: string;
}

export function ContactForm({ contactEmail }: ContactFormProps) {
  const [formData, setFormData] = useState({
    name: "",
    subject: "",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSent, setIsSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Construct the mailto link
    const subject = encodeURIComponent(formData.subject || "Inquiry from website");
    const body = encodeURIComponent(
      `Name: ${formData.name}\n\nMessage:\n${formData.message}`
    );
    
    // Simulate a brief loading state for UX
    setTimeout(() => {
      window.open(`mailto:${contactEmail}?subject=${subject}&body=${body}`, '_blank');
      setIsSubmitting(false);
      setIsSent(true);
      setFormData({ name: "", subject: "", message: "" });
      
      // Reset sent status after 5 seconds
      setTimeout(() => setIsSent(false), 5000);
    }, 600);
  };

  if (isSent) {
    return (
      <div className="flex h-full flex-col items-center justify-center space-y-4 rounded-2xl bg-surface/50 p-8 text-center sm:p-12 border border-border">
        <CheckCircle2 className="h-12 w-12 text-accent" />
        <h3 className="text-xl font-semibold text-text-primary">Email Client Opened</h3>
        <p className="text-sm text-text-secondary">
          Your default email client should now be open with your message. If it didn&apos;t open, you can email directly to: <br/>
          <a href={`mailto:${contactEmail}`} className="text-accent hover:underline mt-2 inline-block">
            {contactEmail}
          </a>
        </p>
        <Button onClick={() => setIsSent(false)} variant="outline" className="mt-4">
          Send Another Message
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col space-y-6">
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
        {isSubmitting ? "Opening..." : "Open Email Client"}
      </Button>
    </form>
  );
}

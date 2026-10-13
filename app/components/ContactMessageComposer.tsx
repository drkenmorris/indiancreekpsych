"use client";

import { useState, type FormEvent } from "react";

const CONTACT_EMAIL = "drkenmorris@indiancreekpsych.com";
const MAX_CHARACTERS = 1000;

export default function ContactMessageComposer() {
  const [name, setName] = useState("");
  const [replyEmail, setReplyEmail] = useState("");
  const [message, setMessage] = useState("");
  const [opened, setOpened] = useState(false);

  function openEmailClient(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!message.trim()) return;
    const subject = "Indian Creek Psychological Services - Website Inquiry";
    const body = [
      "Name: " + (name.trim() || "Not provided"),
      "Reply email: " + (replyEmail.trim() || "Please reply to the sender"),
      "",
      message.trim(),
    ].join("\n");
    setOpened(true);
    window.location.href = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }

  return (
    <div className="contactMessageComposer">
      <p className="eyebrow">Brief message</p>
      <h2>Email Indian Creek</h2>
      <p className="contactMessageNotice">
        For general questions only. Please do not send diagnoses, medical details,
        sensitive personal information, or emergencies by regular email.
      </p>
      <form onSubmit={openEmailClient} className="contactQuickForm">
        <div className="contactQuickFields">
          <label>
            Your name <span>(optional)</span>
            <input type="text" autoComplete="name" maxLength={80}
              value={name} onChange={(event) => setName(event.target.value)}
              placeholder="Your name" />
          </label>
          <label>
            Your email <span>(optional)</span>
            <input type="email" autoComplete="email" maxLength={120}
              value={replyEmail} onChange={(event) => setReplyEmail(event.target.value)}
              placeholder="you@example.com" />
          </label>
        </div>
        <label>
          <span className="contactMessageLabelRow">
            <strong>Brief message</strong>
            <span className="contactCharacterCount" aria-live="polite">
              {message.length.toLocaleString()} / {MAX_CHARACTERS.toLocaleString()} characters
            </span>
          </span>
          <textarea required maxLength={MAX_CHARACTERS} rows={3}
            value={message}
            onChange={(event) => { setMessage(event.target.value); setOpened(false); }}
            placeholder="What would you like to ask?" />
        </label>
        <button type="submit" className="primaryButton contactMessageSubmit">
          Open Email to Send Message
        </button>
        <p className="contactSendExplanation" role="status">
          {opened
            ? "Your email app should open with this message. Please review it and press Send there; this website has not sent the message."
            : "Opens your email app with a prefilled message. You must press Send in your email app."}
        </p>
      </form>
    </div>
  );
}

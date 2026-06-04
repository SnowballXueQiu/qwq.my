"use client";

import { FormEvent, useState, useTransition } from "react";

const initialForm = {
  nickname: "",
  siteTitle: "",
  website: "",
  avatarUrl: "",
  email: "",
  intro: "",
};

export function FriendApplication() {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    startTransition(async () => {
      const response = await fetch("/api/friend-applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!response.ok) {
        setMessage("Submission failed. Check links, email, and required fields.");
        return;
      }

      setForm(initialForm);
      setMessage("Request received. I will review it in the backend.");
      setOpen(false);
    });
  }

  return (
    <>
      <button className="button primary" type="button" onClick={() => setOpen(true)}>
        Send the request
      </button>
      {message ? <p className="form-message">{message}</p> : null}

      {open ? (
        <div className="friend-modal-backdrop" role="presentation">
          <div className="friend-modal" role="dialog" aria-modal="true" aria-labelledby="friend-request-title">
            <button className="modal-close" type="button" aria-label="Close request form" onClick={() => setOpen(false)}>
              x
            </button>
            <h2 id="friend-request-title">A friendly hand extended.</h2>
            <form onSubmit={submit}>
              <label>
                Nickname *
                <input value={form.nickname} onChange={(event) => setForm({ ...form, nickname: event.target.value })} placeholder="innei" required />
              </label>
              <label>
                Site Title *
                <input value={form.siteTitle} onChange={(event) => setForm({ ...form, siteTitle: event.target.value })} placeholder="Yohaku" required />
              </label>
              <label>
                Website *
                <input value={form.website} onChange={(event) => setForm({ ...form, website: event.target.value })} placeholder="example.com" required />
              </label>
              <label>
                Avatar URL *
                <input value={form.avatarUrl} onChange={(event) => setForm({ ...form, avatarUrl: event.target.value })} placeholder="example.com/avatar.png" required />
              </label>
              <label className="wide">
                Your email *
                <input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="mail@example.com" required />
              </label>
              <label className="wide">
                Introduce yourself in a line *
                <textarea value={form.intro} onChange={(event) => setForm({ ...form, intro: event.target.value })} placeholder="..." required />
              </label>
              <div className="modal-actions">
                <button className="button primary" type="submit" disabled={isPending}>
                  {isPending ? "Sending..." : "Send"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}

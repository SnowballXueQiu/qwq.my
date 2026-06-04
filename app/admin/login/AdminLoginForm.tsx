"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function AdminLoginForm() {
  const router = useRouter();
  const [username, setUsername] = useState("snowball");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    startTransition(async () => {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        setMessage("Invalid username or password.");
        return;
      }

      router.replace("/admin/site");
      router.refresh();
    });
  }

  return (
    <form className="admin-login-form" onSubmit={submit}>
      <label>
        Username
        <input value={username} autoComplete="username" onChange={(event) => setUsername(event.target.value)} />
      </label>
      <label>
        Password
        <input value={password} type="password" autoComplete="current-password" onChange={(event) => setPassword(event.target.value)} />
      </label>
      <button className="button primary" type="submit" disabled={isPending}>
        {isPending ? "Signing in..." : "Sign in"}
      </button>
      {message ? <p className="admin-message">{message}</p> : null}
    </form>
  );
}

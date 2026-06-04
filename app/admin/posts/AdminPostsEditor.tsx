"use client";

import { useMemo, useState, useTransition } from "react";
import type { Post } from "@/lib/post-types";

export function AdminPostsEditor({ posts }: { posts: Post[] }) {
  const [localPosts, setLocalPosts] = useState(posts);
  const [selectedSlug, setSelectedSlug] = useState(posts[0]?.slug ?? "");
  const [draft, setDraft] = useState<Post | undefined>(posts[0]);
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  const selectedPost = useMemo(
    () => localPosts.find((post) => post.slug === selectedSlug),
    [localPosts, selectedSlug],
  );

  function selectPost(slug: string) {
    const nextPost = localPosts.find((post) => post.slug === slug);
    setSelectedSlug(slug);
    setDraft(nextPost);
    setMessage("");
  }

  function updateDraft<K extends keyof Post>(key: K, value: Post[K]) {
    setDraft((current) => (current ? { ...current, [key]: value } : current));
  }

  function savePost() {
    if (!draft) return;

    setMessage("");
    startTransition(async () => {
      const response = await fetch(`/api/posts/${draft.slug}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(draft),
      });

      if (!response.ok) {
        setMessage("Save failed. Check the post fields and try again.");
        return;
      }

      const saved = (await response.json()) as Post;
      setLocalPosts((current) => current.map((post) => (post.slug === saved.slug ? saved : post)));
      setDraft(saved);
      setMessage("Saved. Article pages use ISR and will refresh after the next regeneration window.");
    });
  }

  if (!draft || !selectedPost) {
    return <p>No posts available.</p>;
  }

  return (
    <div className="admin-grid">
      <aside className="admin-list" aria-label="Posts">
        {localPosts.map((post) => (
          <button
            className={post.slug === selectedSlug ? "active" : ""}
            type="button"
            onClick={() => selectPost(post.slug)}
            key={post.slug}
          >
            <strong>{post.title}</strong>
            <span>{post.date}</span>
          </button>
        ))}
      </aside>

      <section className="admin-editor" aria-label="Edit post">
        <div className="field-row">
          <label htmlFor="title">Title</label>
          <input id="title" value={draft.title} onChange={(event) => updateDraft("title", event.target.value)} />
        </div>

        <div className="field-row">
          <label htmlFor="summary">Summary</label>
          <textarea
            id="summary"
            rows={3}
            value={draft.summary}
            onChange={(event) => updateDraft("summary", event.target.value)}
          />
        </div>

        <div className="admin-inline">
          <div className="field-row">
            <label htmlFor="date">Date</label>
            <input id="date" value={draft.date} onChange={(event) => updateDraft("date", event.target.value)} />
          </div>
          <div className="field-row">
            <label htmlFor="read">Read time</label>
            <input
              id="read"
              type="number"
              min={1}
              value={draft.read}
              onChange={(event) => updateDraft("read", Number(event.target.value))}
            />
          </div>
        </div>

        <div className="admin-inline">
          <div className="field-row">
            <label htmlFor="topic">Topic</label>
            <select
              id="topic"
              value={draft.topic}
              onChange={(event) => updateDraft("topic", event.target.value as Post["topic"])}
            >
              <option value="design">design</option>
              <option value="frontend">frontend</option>
              <option value="systems">systems</option>
            </select>
          </div>
          <div className="field-row">
            <label htmlFor="color">Color</label>
            <select
              id="color"
              value={draft.color}
              onChange={(event) => updateDraft("color", event.target.value as Post["color"])}
            >
              <option value="pink">pink</option>
              <option value="violet">violet</option>
              <option value="blue">blue</option>
            </select>
          </div>
        </div>

        <div className="field-row">
          <label htmlFor="tags">Tags</label>
          <input
            id="tags"
            value={draft.tags.join(", ")}
            onChange={(event) =>
              updateDraft(
                "tags",
                event.target.value
                  .split(",")
                  .map((tag) => tag.trim())
                  .filter(Boolean),
              )
            }
          />
        </div>

        <div className="field-row">
          <label htmlFor="content">Content</label>
          <textarea
            id="content"
            rows={10}
            value={draft.content.join("\n\n")}
            onChange={(event) =>
              updateDraft(
                "content",
                event.target.value
                  .split(/\n{2,}/)
                  .map((paragraph) => paragraph.trim())
                  .filter(Boolean),
              )
            }
          />
        </div>

        <div className="admin-actions">
          <button className="button primary" type="button" onClick={savePost} disabled={isPending}>
            {isPending ? "Saving..." : "Save post"}
          </button>
          <a className="button secondary" href={`/writing/${draft.slug}`}>
            View article
          </a>
        </div>
        {message ? <p className="admin-message">{message}</p> : null}
      </section>
    </div>
  );
}

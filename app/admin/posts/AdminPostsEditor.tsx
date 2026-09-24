"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { MarkdownArticle } from "@/app/components/MarkdownArticle";
import type { Post } from "@/lib/post-types";
import { estimateReadTime } from "@/lib/read-time";

const emptyPost: Post = {
  slug: "new-post",
  title: "New post",
  summary: "Short article summary.",
  date: new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }),
  topic: "frontend",
  tags: ["draft"],
  read: 1,
  color: "violet",
  content: "## New post\n\nWrite Markdown here.\n\nInline math works like $a^2 + b^2 = c^2$.\n\n$$\n\\text{preview} \\rightarrow \\text{publish}\n$$",
  views: 0,
  likes: 0,
};

export function AdminPostsEditor({ posts, embedded = false }: { posts: Post[]; embedded?: boolean }) {
  const [localPosts, setLocalPosts] = useState(posts);
  const [selectedSlug, setSelectedSlug] = useState(posts[0]?.slug ?? "");
  const [draft, setDraft] = useState<Post | undefined>(posts[0]);
  const [savedSnapshot, setSavedSnapshot] = useState(posts[0] ? JSON.stringify(posts[0]) : "");
  const [message, setMessage] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [pendingSlug, setPendingSlug] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Post | null>(null);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [isPending, startTransition] = useTransition();

  const isDirty = Boolean(draft && JSON.stringify(draft) !== savedSnapshot);
  const selectedPost = useMemo(() => localPosts.find((post) => post.slug === selectedSlug), [localPosts, selectedSlug]);

  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (!isDirty) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [isDirty]);

  function selectPost(slug: string) {
    if (slug === selectedSlug) return;
    if (isDirty) {
      setPendingSlug(slug);
      return;
    }
    loadPost(slug);
  }

  function loadPost(slug: string) {
    const nextPost = localPosts.find((post) => post.slug === slug);
    setSelectedSlug(slug);
    setDraft(nextPost);
    setSavedSnapshot(nextPost ? JSON.stringify(nextPost) : "");
    setMessage("");
  }

  function updateDraft<K extends keyof Post>(key: K, value: Post[K]) {
    setDraft((current) => {
      if (!current) return current;
      const next = { ...current, [key]: value };
      if (key === "content") next.read = estimateReadTime(String(value));
      return next;
    });
  }

  function createDraftPost() {
    let counter = localPosts.length + 1;
    let slug = `new-post-${counter}`;
    while (localPosts.some((post) => post.slug === slug)) {
      counter += 1;
      slug = `new-post-${counter}`;
    }
    const nextPost = { ...emptyPost, slug, title: `New post ${counter}`, read: estimateReadTime(emptyPost.content) };
    setLocalPosts((current) => [nextPost, ...current]);
    setSelectedSlug(slug);
    setDraft(nextPost);
    setSavedSnapshot("");
    setMessage("Draft created. Save it to write it into MongoDB.");
  }

  function savePost() {
    if (!draft) return;

    setMessage("");
    startTransition(async () => {
      const postToSave = { ...draft, read: estimateReadTime(draft.content) };
      const exists = Boolean(savedSnapshot);
      const response = await fetch(exists ? `/api/posts/${postToSave.slug}` : "/api/posts", {
        method: exists ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(postToSave),
      });

      const result = (await response.json()) as Post | { error?: string };
      if (!response.ok || !("slug" in result)) {
        setMessage("Save failed. Check the post fields and MongoDB connection.");
        return;
      }

      setLocalPosts((current) => {
        const existsInList = current.some((post) => post.slug === result.slug);
        if (!existsInList) return [result, ...current];
        return current.map((post) => (post.slug === result.slug ? result : post));
      });
      setDraft(result);
      setSelectedSlug(result.slug);
      setSavedSnapshot(JSON.stringify(result));
      setMessage("Saved to MongoDB.");
    });
  }

  async function summarizePost() {
    if (!draft) return;
    setIsSummarizing(true);
    setMessage("");
    const response = await fetch("/api/posts/summary", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: draft.title, content: draft.content }),
    });
    const result = (await response.json().catch(() => ({}))) as { summary?: string; error?: string };
    setIsSummarizing(false);
    if (!response.ok || !result.summary) {
      setMessage(result.error ?? "Summary failed.");
      return;
    }
    updateDraft("summary", result.summary);
    setMessage("Summary generated.");
  }

  function deletePost(post: Post) {
    startTransition(async () => {
      const response = await fetch(`/api/posts/${post.slug}`, { method: "DELETE" });
      if (!response.ok) {
        setMessage("Delete failed. Check MongoDB connection.");
        return;
      }
      const remaining = localPosts.filter((item) => item.slug !== post.slug);
      setLocalPosts(remaining);
      setDeleteTarget(null);
      const nextPost = remaining[0];
      setSelectedSlug(nextPost?.slug ?? "");
      setDraft(nextPost);
      setSavedSnapshot(nextPost ? JSON.stringify(nextPost) : "");
      setMessage("Post deleted.");
    });
  }

  if (!draft || !selectedPost) {
    return (
      <div className="admin-empty-state">
        <button className="button primary" type="button" onClick={createDraftPost}>
          New post
        </button>
        <p>No posts available.</p>
      </div>
    );
  }

  return (
    <div className={embedded ? "admin-posts-embedded" : "admin-grid"}>
      <aside className="admin-list" aria-label="Posts">
        <button className="button primary admin-nav-link" type="button" onClick={createDraftPost}>
          New post
        </button>
        {localPosts.map((post) => (
          <button className={post.slug === selectedSlug ? "active" : ""} type="button" onClick={() => selectPost(post.slug)} key={post.slug}>
            <strong>{post.title}</strong>
            <span>{post.date} · {post.views} views · {post.likes} likes</span>
          </button>
        ))}
      </aside>

      <section className="admin-editor" aria-label="Edit post">
        <div className="admin-inline">
          <Field label="Title" value={draft.title} onChange={(value) => updateDraft("title", value)} />
          <Field label="Slug" value={draft.slug} onChange={(value) => updateDraft("slug", slugify(value))} />
        </div>

        <Field label="Summary" value={draft.summary} onChange={(value) => updateDraft("summary", value)} multiline />
        <div className="admin-actions compact-actions">
          <button className="button secondary" type="button" onClick={summarizePost} disabled={isSummarizing}>
            {isSummarizing ? "Summarizing..." : "AI summary"}
          </button>
        </div>

        <div className="admin-inline">
          <Field label="Date" value={draft.date} onChange={(value) => updateDraft("date", value)} />
          <ReadTimeField value={estimateReadTime(draft.content)} />
        </div>

        <div className="admin-inline">
          <SelectField label="Topic" value={draft.topic} options={["design", "frontend", "systems"]} onChange={(value) => updateDraft("topic", value as Post["topic"])} />
          <SelectField label="Color" value={draft.color} options={["pink", "violet", "blue"]} onChange={(value) => updateDraft("color", value as Post["color"])} />
        </div>

        <Field label="Tags" value={draft.tags.join(", ")} onChange={(value) => updateDraft("tags", split(value))} />

        <div className="admin-inline">
          <NumberField label="Views" value={draft.views} onChange={(value) => updateDraft("views", value)} />
          <NumberField label="Likes" value={draft.likes} onChange={(value) => updateDraft("likes", value)} />
        </div>

        <Field label="Markdown content" value={draft.content} onChange={(value) => updateDraft("content", value)} multiline rows={18} />

        <div className="admin-actions">
          <button className="button primary" type="button" onClick={savePost} disabled={isPending || !isDirty}>
            {isPending ? "Saving..." : "Save post"}
          </button>
          <button className="button secondary" type="button" onClick={() => setPreviewOpen(true)}>
            Preview article
          </button>
          <button className="button secondary danger-button" type="button" onClick={() => setDeleteTarget(draft)}>
            Delete post
          </button>
          {isDirty ? <span className="admin-dirty-pill">Unsaved changes</span> : null}
        </div>
        {message ? <p className="admin-message">{message}</p> : null}
      </section>

      {previewOpen ? <PreviewModal post={draft} onClose={() => setPreviewOpen(false)} /> : null}
      {pendingSlug ? (
        <ConfirmModal
          title="Discard unsaved changes?"
          body="This post has unsaved changes. Confirm before leaving the editor."
          confirmLabel="Discard and switch"
          onCancel={() => setPendingSlug(null)}
          onConfirm={() => {
            const nextSlug = pendingSlug;
            setPendingSlug(null);
            loadPost(nextSlug);
          }}
        />
      ) : null}
      {deleteTarget ? (
        <ConfirmModal
          title="Delete post?"
          body={`This remove operation needs a second confirmation: ${deleteTarget.title}`}
          confirmLabel="Confirm delete"
          onCancel={() => setDeleteTarget(null)}
          onConfirm={() => deletePost(deleteTarget)}
        />
      ) : null}
    </div>
  );
}

function PreviewModal({ post, onClose }: { post: Post; onClose: () => void }) {
  return (
    <div className="admin-modal-backdrop" role="dialog" aria-modal="true">
      <div className="admin-modal article-preview-modal">
        <div className="project-heading">
          <div>
            <span className="article-kicker">{post.date} · {post.read} min read</span>
            <h2>{post.title}</h2>
          </div>
          <button className="button secondary" type="button" onClick={onClose}>Close preview</button>
        </div>
        <p>{post.summary}</p>
        <MarkdownArticle content={post.content} />
      </div>
    </div>
  );
}

function ConfirmModal({
  title,
  body,
  confirmLabel,
  onCancel,
  onConfirm,
}: {
  title: string;
  body: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="admin-modal-backdrop" role="dialog" aria-modal="true">
      <div className="admin-modal confirm-modal">
        <h3>{title}</h3>
        <p>{body}</p>
        <div className="admin-actions">
          <button className="button secondary" type="button" onClick={onCancel}>Cancel</button>
          <button className="button primary danger-button" type="button" onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, multiline = false, rows = 3 }: { label: string; value: string; onChange: (value: string) => void; multiline?: boolean; rows?: number }) {
  return (
    <div className="field-row">
      <label>{label}</label>
      {multiline ? <textarea rows={rows} value={value} onChange={(event) => onChange(event.target.value)} /> : <input value={value} onChange={(event) => onChange(event.target.value)} />}
    </div>
  );
}

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <div className="field-row">
      <label>{label}</label>
      <input type="number" min={0} value={value} onChange={(event) => onChange(Number(event.target.value))} />
    </div>
  );
}

function ReadTimeField({ value }: { value: number }) {
  return (
    <div className="field-row">
      <label>Read time</label>
      <input value={`${value} min read`} readOnly />
    </div>
  );
}

function SelectField({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return (
    <div className="field-row">
      <label>{label}</label>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option value={option} key={option}>{option}</option>
        ))}
      </select>
    </div>
  );
}

function split(value: string) {
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 72);
}

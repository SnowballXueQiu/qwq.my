"use client";

import { useState, useTransition } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { FriendApplication } from "@/lib/friend-applications";
import type { MediaAsset } from "@/lib/media";
import type { FriendLink, MeCard, SiteContent, SiteProject } from "@/lib/site-content-types";

type SectionName = "site" | "projects" | "friends" | "applications" | "media" | "me" | "copyright";

const sections: { id: SectionName; label: string }[] = [
  { id: "site", label: "Site basics" },
  { id: "projects", label: "Projects" },
  { id: "friends", label: "Approved friends" },
  { id: "applications", label: "Friend applications" },
  { id: "media", label: "Media library" },
  { id: "me", label: "Me" },
  { id: "copyright", label: "Copyright" },
];

export function AdminSiteEditor({
  applications,
  content,
  mediaAssets,
}: {
  applications: FriendApplication[];
  content: SiteContent;
  mediaAssets: MediaAsset[];
}) {
  const [draft, setDraft] = useState(content);
  const [section, setSection] = useState<SectionName>("site");
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  function save() {
    setMessage("");
    startTransition(async () => {
      const response = await fetch("/api/site-content", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });

      if (!response.ok) {
        setMessage("Save failed. Check fields and try again.");
        return;
      }

      setDraft((await response.json()) as SiteContent);
      setMessage("Saved. Homepage static data will update on next rebuild or refresh in dev.");
    });
  }

  function addItem() {
    setDraft((current) => {
      if (section === "projects") {
        return {
          ...current,
          projects: [
            ...current.projects,
            { title: "New project", summary: "Project summary", status: "Draft", tags: ["tag"], color: "pink" },
          ],
        };
      }
      if (section === "friends") {
        return {
          ...current,
          friends: [...current.friends, { name: "New friend", url: "https://example.com", description: "Short description" }],
        };
      }
      if (section === "me") {
        return {
          ...current,
          me: [...current.me, { title: "New card", summary: "About text" }],
        };
      }
      if (section === "applications" || section === "media") return current;
      if (section === "site") return current;
      if (section === "copyright") return current;
      return current;
    });
  }

  function removeItem(index: number) {
    setDraft((current) => {
      if (section === "projects") {
        return { ...current, projects: current.projects.filter((_, itemIndex) => itemIndex !== index) };
      }
      if (section === "friends") {
        return { ...current, friends: current.friends.filter((_, itemIndex) => itemIndex !== index) };
      }
      if (section === "me") {
        return { ...current, me: current.me.filter((_, itemIndex) => itemIndex !== index) };
      }
      return current;
    });
  }

  return (
    <div className="admin-grid">
      <aside className="admin-list" aria-label="Site sections">
        <a className="button secondary admin-nav-link" href="/admin/posts">
          Blog backend
        </a>
        {sections.map((item) => (
          <button
            className={section === item.id ? "active" : ""}
            type="button"
            onClick={() => {
              setSection(item.id);
              setMessage("");
            }}
            key={item.id}
          >
            <strong>{item.label}</strong>
            <span>{sectionCount(draft, item.id, applications.length)}</span>
          </button>
        ))}
      </aside>

      <section className="admin-editor" aria-label="Edit site content">
        <div className="admin-actions">
          <button className="button secondary" type="button" onClick={addItem} disabled={section === "site" || section === "copyright" || section === "applications" || section === "media"}>
            Add item
          </button>
          <button className="button primary" type="button" onClick={save} disabled={isPending || section === "applications" || section === "media"}>
            {isPending ? "Saving..." : "Save site content"}
          </button>
        </div>

        {section === "site" ? (
          <SiteFields draft={draft} setDraft={setDraft} />
        ) : section === "projects" ? (
          <ProjectFields items={draft.projects} setDraft={setDraft} removeItem={removeItem} />
        ) : section === "friends" ? (
          <FriendFields items={draft.friends} setDraft={setDraft} removeItem={removeItem} />
        ) : section === "applications" ? (
          <ApplicationFields items={applications} />
        ) : section === "media" ? (
          <MediaFields items={mediaAssets} />
        ) : section === "me" ? (
          <MeFields items={draft.me} setDraft={setDraft} removeItem={removeItem} />
        ) : (
          <CopyrightField draft={draft} setDraft={setDraft} />
        )}

        {message ? <p className="admin-message">{message}</p> : null}
      </section>
    </div>
  );
}

function SiteFields({ draft, setDraft }: { draft: SiteContent; setDraft: Dispatch<SetStateAction<SiteContent>> }) {
  const [uploadMessage, setUploadMessage] = useState("");
  const update = (key: keyof SiteContent["site"], value: string) => {
    setDraft((current) => ({ ...current, site: { ...current.site, [key]: value } }));
  };

  return (
    <div className="admin-item-card">
      <div className="admin-inline">
        <Field label="Document title" value={draft.site.title} onChange={(value) => update("title", value)} />
        <Field label="Brand name" value={draft.site.brandName} onChange={(value) => update("brandName", value)} />
      </div>
      <Field label="Site description" value={draft.site.description} onChange={(value) => update("description", value)} multiline />
      <div className="admin-inline">
        <ImageField
          label="Favicon"
          value={draft.site.faviconUrl}
          previewClassName="image-upload-preview-favicon"
          onChange={(value) => update("faviconUrl", value)}
          onMessage={setUploadMessage}
        />
        <ImageField
          label="Hero image"
          value={draft.site.heroImageUrl}
          previewClassName="image-upload-preview-hero"
          onChange={(value) => update("heroImageUrl", value)}
          onMessage={setUploadMessage}
        />
      </div>
      {uploadMessage ? <p className="admin-message">{uploadMessage}</p> : null}
      <Field label="Hero image alt" value={draft.site.heroImageAlt} onChange={(value) => update("heroImageAlt", value)} />
      <Field label="Hero title" value={draft.site.heroTitle} onChange={(value) => update("heroTitle", value)} multiline />
      <div className="admin-inline">
        <Field label="Hero subtitle" value={draft.site.heroSubtitle} onChange={(value) => update("heroSubtitle", value)} />
        <Field label="Hero tagline" value={draft.site.heroTagline} onChange={(value) => update("heroTagline", value)} />
      </div>
      <div className="admin-inline">
        <Field label="Primary button" value={draft.site.primaryButtonLabel} onChange={(value) => update("primaryButtonLabel", value)} />
        <Field label="Secondary button" value={draft.site.secondaryButtonLabel} onChange={(value) => update("secondaryButtonLabel", value)} />
      </div>
      <Field label="Projects intro" value={draft.site.projectsIntro} onChange={(value) => update("projectsIntro", value)} multiline />
      <div className="admin-inline">
        <Field label="GitHub URL" value={draft.site.githubUrl} onChange={(value) => update("githubUrl", value)} />
        <Field label="X URL" value={draft.site.xUrl} onChange={(value) => update("xUrl", value)} />
      </div>
      <Field label="Email" value={draft.site.email} onChange={(value) => update("email", value)} />
    </div>
  );
}

function ImageField({
  label,
  value,
  previewClassName,
  onChange,
  onMessage,
}: {
  label: string;
  value: string;
  previewClassName: string;
  onChange: (value: string) => void;
  onMessage: (value: string) => void;
}) {
  const [isUploading, setIsUploading] = useState(false);

  async function upload(file: File | null) {
    if (!file) return;

    setIsUploading(true);
    onMessage("");
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/uploads", {
        method: "POST",
        body: formData,
      });
      const result = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !result.url) {
        onMessage(result.error ?? "Upload failed.");
        return;
      }
      onChange(result.url);
      onMessage(`Uploaded ${file.name}`);
    } catch {
      onMessage("Upload failed.");
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div className="field-row image-upload-field">
      <label>{label}</label>
      <div className={`image-upload-preview ${previewClassName}`}>
        {value ? <img src={value} alt={`${label} preview`} /> : <span>No image</span>}
      </div>
      <input value={value} onChange={(event) => onChange(event.target.value)} />
      <label className="button secondary image-upload-button">
        <input accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml,image/x-icon,image/vnd.microsoft.icon" type="file" onChange={(event) => upload(event.target.files?.[0] ?? null)} />
        {isUploading ? "Uploading..." : "Upload image"}
      </label>
    </div>
  );
}

function ProjectFields({
  items,
  setDraft,
  removeItem,
}: {
  items: SiteProject[];
  setDraft: Dispatch<SetStateAction<SiteContent>>;
  removeItem: (index: number) => void;
}) {
  return items.map((item, index) => (
    <div className="admin-item-card" key={`${item.title}-${index}`}>
      <Field label="Title" value={item.title} onChange={(value) => setDraft((current) => replace(current, "projects", index, { ...item, title: value }))} />
      <Field label="Summary" value={item.summary} onChange={(value) => setDraft((current) => replace(current, "projects", index, { ...item, summary: value }))} multiline />
      <div className="admin-inline">
        <Field label="Status" value={item.status} onChange={(value) => setDraft((current) => replace(current, "projects", index, { ...item, status: value }))} />
        <Field label="Color" value={item.color} onChange={(value) => setDraft((current) => replace(current, "projects", index, { ...item, color: value as SiteProject["color"] }))} />
      </div>
      <Field label="Tags" value={item.tags.join(", ")} onChange={(value) => setDraft((current) => replace(current, "projects", index, { ...item, tags: split(value) }))} />
      <RemoveButton onClick={() => removeItem(index)} />
    </div>
  ));
}

function FriendFields({
  items,
  setDraft,
  removeItem,
}: {
  items: FriendLink[];
  setDraft: Dispatch<SetStateAction<SiteContent>>;
  removeItem: (index: number) => void;
}) {
  return items.map((item, index) => (
    <div className="admin-item-card" key={`${item.name}-${index}`}>
      <Field label="Name" value={item.name} onChange={(value) => setDraft((current) => replace(current, "friends", index, { ...item, name: value }))} />
      <Field label="URL" value={item.url} onChange={(value) => setDraft((current) => replace(current, "friends", index, { ...item, url: value }))} />
      <Field label="Description" value={item.description} onChange={(value) => setDraft((current) => replace(current, "friends", index, { ...item, description: value }))} multiline />
      <RemoveButton onClick={() => removeItem(index)} />
    </div>
  ));
}

function MeFields({
  items,
  setDraft,
  removeItem,
}: {
  items: MeCard[];
  setDraft: Dispatch<SetStateAction<SiteContent>>;
  removeItem: (index: number) => void;
}) {
  return items.map((item, index) => (
    <div className="admin-item-card" key={`${item.title}-${index}`}>
      <Field label="Title" value={item.title} onChange={(value) => setDraft((current) => replace(current, "me", index, { ...item, title: value }))} />
      <Field label="Summary" value={item.summary} onChange={(value) => setDraft((current) => replace(current, "me", index, { ...item, summary: value }))} multiline />
      <RemoveButton onClick={() => removeItem(index)} />
    </div>
  ));
}

function CopyrightField({ draft, setDraft }: { draft: SiteContent; setDraft: Dispatch<SetStateAction<SiteContent>> }) {
  return (
    <div className="admin-item-card">
      <Field
        label="Copyright"
        value={draft.about.copyright}
        onChange={(value) => setDraft((current) => ({ ...current, about: { ...current.about, copyright: value } }))}
        multiline
      />
    </div>
  );
}

function ApplicationFields({ items }: { items: FriendApplication[] }) {
  if (items.length === 0) {
    return (
      <div className="admin-item-card">
        <h3>No friend applications yet</h3>
        <p>Requests submitted from the Friends page will appear here.</p>
      </div>
    );
  }

  return items.map((item) => (
    <div className="admin-item-card application-card" key={`${item.website}-${item.createdAt}`}>
      <div className="project-heading">
        <h3>{item.siteTitle}</h3>
        <span>{new Date(item.createdAt).toLocaleString()}</span>
      </div>
      <p>{item.intro}</p>
      <div className="application-meta">
        <a href={item.website}>{item.website}</a>
        <a href={item.avatarUrl}>avatar</a>
        <a href={`mailto:${item.email}`}>{item.email}</a>
        <span>{item.nickname}</span>
      </div>
    </div>
  ));
}

function MediaFields({ items }: { items: MediaAsset[] }) {
  if (!items.length) {
    return (
      <div className="admin-item-card">
        <h3>No uploaded media yet</h3>
        <p>Uploaded favicon, hero image, post assets, and video files will appear here.</p>
      </div>
    );
  }

  return (
    <div className="admin-item-card media-library-grid">
      {items.map((item) => (
        <a href={item.url} key={`${item.url}-${item.createdAt}`}>
          {item.contentType.startsWith("image/") ? <img src={item.url} alt={item.filename} /> : <span className="media-video-pill">video</span>}
          <strong>{item.filename}</strong>
          <small>
            {item.contentType} · {Math.round(item.size / 1024)} KB
          </small>
        </a>
      ))}
    </div>
  );
}

function Field({ label, value, onChange, multiline = false }: { label: string; value: string; onChange: (value: string) => void; multiline?: boolean }) {
  return (
    <div className="field-row">
      <label>{label}</label>
      {multiline ? <textarea rows={3} value={value} onChange={(event) => onChange(event.target.value)} /> : <input value={value} onChange={(event) => onChange(event.target.value)} />}
    </div>
  );
}

function RemoveButton({ onClick }: { onClick: () => void }) {
  return (
    <button className="button secondary" type="button" onClick={onClick}>
      Remove
    </button>
  );
}

function split(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function replace<K extends "projects" | "friends" | "me">(content: SiteContent, section: K, index: number, value: SiteContent[K][number]): SiteContent {
  return {
    ...content,
    [section]: content[section].map((item, itemIndex) => (itemIndex === index ? value : item)),
  };
}

function sectionCount(content: SiteContent, section: SectionName, applicationCount: number) {
  if (section === "site") return "title, favicon, hero";
  if (section === "applications") return `${applicationCount} requests`;
  if (section === "media") return "assets";
  if (section === "copyright") return "1 text";
  return `${content[section].length} items`;
}

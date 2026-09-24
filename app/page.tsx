"use client";

import Link from "next/link";
import { MouseEvent, Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState, useTransition } from "react";
import type { CSSProperties } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { DecorativeDoodles } from "./components/DecorativeDoodles";
import { SketchIcon } from "./components/SketchIcon";
import { getBrowserStorageItem, removeBrowserStorageItem, setBrowserStorageItem } from "@/lib/browser-storage";
import { DEFAULT_POSTS, DEFAULT_SITE_CONTENT } from "@/lib/default-content";
import { parsePostDate } from "@/lib/post-data";
import type { PresenceState } from "@/lib/presence-types";
import type { Post, SortMode, Topic } from "@/lib/post-types";
import type { SiteContent } from "@/lib/site-content-types";

const topicOptions: { value: Topic; label: string }[] = [
  { value: "all", label: "all notes" },
  { value: "design", label: "design" },
  { value: "frontend", label: "frontend" },
  { value: "systems", label: "systems" },
];

export default function Page() {
  return (
    <Suspense fallback={null}>
      <HomePage />
    </Suspense>
  );
}

function HomePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const scrollParam = searchParams.get("scroll");
  const [theme, setTheme] = useState<"sun" | "moon">("sun");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortMode>("newest");
  const [topic, setTopic] = useState<Topic>("all");
  const [activeSection, setActiveSection] = useState("home");
  const [presence, setPresence] = useState({ bpm: 72, online: 1 });
  const [probePresence, setProbePresence] = useState<PresenceState | null>(null);
  const [viewStats, setViewStats] = useState({ totalPageViews: 0, pageViews: 0 });
  const [siteContent, setSiteContent] = useState<SiteContent>(DEFAULT_SITE_CONTENT);
  const [posts, setPosts] = useState<Post[]>(DEFAULT_POSTS);
  const navRef = useRef<HTMLElement>(null);
  const pendingIndicatorRef = useRef<{ left: number; width: number } | null>(null);
  const [navIndicator, setNavIndicator] = useState({ left: 0, width: 0, ready: false });
  const [, startTransition] = useTransition();
  const manualNavUntilRef = useRef(0);

  useLayoutEffect(() => {
    const nav = navRef.current;
    const activeLink = nav?.querySelector<HTMLAnchorElement>("a.active");
    if (!nav || !activeLink) {
      setNavIndicator((current) => ({ ...current, ready: false }));
      return;
    }

    const navRect = nav.getBoundingClientRect();
    const linkRect = activeLink.getBoundingClientRect();
    const nextIndicator = {
      left: linkRect.left - navRect.left,
      width: linkRect.width,
      ready: true,
    };
    setNavIndicator((current) => {
      const saved = getBrowserStorageItem("nav-indicator");
      const shouldSlideFromSaved = getBrowserStorageItem("nav-indicator-pending") === "1";
      const pendingIndicator = pendingIndicatorRef.current ?? parseSavedIndicator(saved, shouldSlideFromSaved);

      if (pendingIndicator) {
        pendingIndicatorRef.current = null;
        try {
          window.setTimeout(() => {
            setNavIndicator(nextIndicator);
            setBrowserStorageItem("nav-indicator", JSON.stringify({ left: nextIndicator.left, width: nextIndicator.width }));
          }, 420);
          removeBrowserStorageItem("nav-indicator-pending");
          return { ...pendingIndicator, ready: true };
        } catch {
          removeBrowserStorageItem("nav-indicator-pending");
        }
      }

      if (current.ready) return nextIndicator;

      if (!saved || !shouldSlideFromSaved) {
        setBrowserStorageItem("nav-indicator", JSON.stringify({ left: nextIndicator.left, width: nextIndicator.width }));
        return nextIndicator;
      }

      setBrowserStorageItem("nav-indicator", JSON.stringify({ left: nextIndicator.left, width: nextIndicator.width }));
      return nextIndicator;
    });
  }, [activeSection]);

  useEffect(() => {
    Promise.all([
      fetch("/api/site-content").then((response) => (response.ok ? response.json() : null)),
      fetch("/api/posts").then((response) => (response.ok ? response.json() : null)),
    ])
      .then(([content, nextPosts]: [SiteContent | null, Post[] | null]) => {
        if (content?.site) setSiteContent(content);
        if (Array.isArray(nextPosts)) setPosts(nextPosts);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const sections = ["home", "blogs", "projects"]
      .map((id) => document.getElementById(id))
      .filter(Boolean) as HTMLElement[];

    const observer = new IntersectionObserver(
      (entries) => {
        if (Date.now() < manualNavUntilRef.current) return;

        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible?.target.id) setActiveSection(visible.target.id);
      },
      { rootMargin: "-24% 0px -58% 0px", threshold: [0.08, 0.2, 0.36] },
    );

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const updateFromNav = (event: Event) => {
      const nextSection = (event as CustomEvent<string>).detail;
      if (nextSection === "blogs" || nextSection === "projects") {
        manualNavUntilRef.current = Date.now() + 5000;
        setActiveSection(nextSection);
      }
    };

    window.addEventListener("section-nav", updateFromNav);
    return () => window.removeEventListener("section-nav", updateFromNav);
  }, []);

  useEffect(() => {
    const updateFromHash = () => {
      const hashTarget = window.location.hash.slice(1);
      if (hashTarget === "home") {
        clearSectionNavTimers();
        manualNavUntilRef.current = Date.now() + 3000;
        setActiveSection("home");
      }
      if (hashTarget === "blogs" || hashTarget === "projects") {
        manualNavUntilRef.current = Date.now() + 3000;
        setActiveSection(hashTarget);
      }
    };

    updateFromHash();
    window.addEventListener("hashchange", updateFromHash);
    return () => window.removeEventListener("hashchange", updateFromHash);
  }, []);

  useEffect(() => {
    const hashTarget = window.location.hash.slice(1);
    const target = hashTarget || scrollParam || getBrowserStorageItem("pending-scroll-section");
    if (!target) return;

    removeBrowserStorageItem("pending-scroll-section");
    if (target === "blogs" || target === "projects") {
      manualNavUntilRef.current = Date.now() + 5000;
      setActiveSection(target);
    } else if (target === "home") {
      manualNavUntilRef.current = Date.now() + 3000;
      setActiveSection("home");
    }
    const scrollToTarget = (behavior: ScrollBehavior = "smooth") => {
      if (target === "home") {
        window.scrollTo({ top: 0, behavior });
        window.history.replaceState(null, "", "#home");
        return;
      }

      const section = document.getElementById(target);
      if (!section) return;
      const headerOffset = Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--header-offset")) || 0;
      const top = window.scrollY + section.getBoundingClientRect().top - headerOffset;
      window.scrollTo({ top: Math.max(0, top), behavior });
      window.history.replaceState(null, "", `#${target}`);
    };

    window.requestAnimationFrame(() => scrollToTarget());
    const settleTimer = window.setTimeout(scrollToTarget, 420);
    const finalTimer = window.setTimeout(scrollToTarget, 900);
    const lateTimer = window.setTimeout(scrollToTarget, 2300);
    const lockTimer = window.setTimeout(() => scrollToTarget("auto"), 3200);

    return () => {
      window.clearTimeout(settleTimer);
      window.clearTimeout(finalTimer);
      window.clearTimeout(lateTimer);
      window.clearTimeout(lockTimer);
    };
  }, [scrollParam]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setPresence({
        bpm: 70 + Math.floor(Math.random() * 8),
        online: 1 + Math.floor(Math.random() * 3),
      });
    }, 3200);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadPresence = async () => {
      try {
        const response = await fetch("/api/presence", { cache: "no-store" });
        if (!response.ok) return;
        const nextPresence = (await response.json()) as PresenceState;
        if (!cancelled) setProbePresence(nextPresence);
      } catch {
        // The visual card keeps its default local state when the probe is not running.
      }
    };

    loadPresence();
    const timer = window.setInterval(loadPresence, 5000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    const page = `${window.location.pathname}${window.location.hash || ""}`;
    const key = `page-view:${page}`;
    const method = getBrowserStorageItem(key) ? "GET" : "POST";
    if (method === "POST") setBrowserStorageItem(key, "1");

    fetch(`/api/analytics?page=${encodeURIComponent(page)}`, {
      method,
      headers: method === "POST" ? { "Content-Type": "application/json" } : undefined,
      body: method === "POST" ? JSON.stringify({ page }) : undefined,
      cache: "no-store",
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((stats: { totalPageViews: number; pageViews: number } | null) => {
        if (stats) setViewStats(stats);
      })
      .catch(() => {});
  }, []);

  const filteredPosts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return posts
      .filter((post) => {
        const matchesTopic = topic === "all" || post.topic === topic;
        const searchable = `${post.title} ${post.summary} ${post.tags.join(" ")}`.toLowerCase();
        return matchesTopic && searchable.includes(normalizedQuery);
      })
      .toSorted((a, b) => {
        if (sort === "oldest") return parsePostDate(a.date) - parsePostDate(b.date);
        if (sort === "short") return a.read - b.read || parsePostDate(b.date) - parsePostDate(a.date);
        return parsePostDate(b.date) - parsePostDate(a.date);
      });
  }, [query, sort, topic]);

  const navItems = [
    { id: "blogs", href: "#blogs", label: "Blogs", icon: <SketchIcon name="writing" /> },
    { id: "projects", href: "#projects", label: "Projects", icon: <SketchIcon name="projects" /> },
    { id: "friends", href: "/friends", label: "Friends", icon: <SketchIcon name="heart" /> },
    { id: "me", href: "/me", label: "Me", icon: <SketchIcon name="star" /> },
    { id: "about", href: "/about", label: "About", icon: <SketchIcon name="spark" /> },
  ];
  const isProbeOnline = probePresence?.status === "online";
  const displayLocation = probePresence?.location ?? "Shanghai";
  const displayBpm = probePresence?.bpm ?? presence.bpm;
  const activeAppName = probePresence?.activeApp?.name ?? "Next.js";
  const isEditing = probePresence?.editing?.isEditor ?? true;
  const editingTitle = isEditing ? "Editing" : "Using";
  const editingFile = isEditing
    ? probePresence?.editing?.file ?? "app/page.tsx"
    : probePresence?.activeApp?.name ?? "Next.js";
  const editingMeta = [
    isEditing ? probePresence?.editing?.workspace ?? activeAppName : probePresence?.activeApp?.windowTitle,
    isEditing ? probePresence?.editing?.branch : undefined,
  ]
    .filter(Boolean)
    .join(" · ");
  const deviceName = probePresence?.device?.name ?? "Mac";
  const osName = probePresence?.device?.os ?? "macOS";
  const cpuText = formatPercent(probePresence?.device?.cpuUsagePercent);
  const memoryText = formatPercent(probePresence?.device?.memoryUsedPercent);

  function handleHomeNavClick(event: MouseEvent<HTMLAnchorElement>, href: string) {
    rememberCurrentIndicator();

    if (!href.startsWith("#")) {
      event.preventDefault();
      const didAnimate = animateIndicatorToLink(event.currentTarget);
      window.setTimeout(() => startTransition(() => router.push(href)), didAnimate ? 420 : 0);
      return;
    }

    event.preventDefault();
    const target = href.slice(1) || "home";
    const didAnimate = animateIndicatorToLink(event.currentTarget);

    clearSectionNavTimers();
    removeBrowserStorageItem("pending-scroll-section");
    manualNavUntilRef.current = Date.now() + 5000;
    setActiveSection(target);
    window.setTimeout(() => scrollHomeSection(target), didAnimate ? 120 : 0);
  }

  function scrollHomeSection(target: string) {
    const scrollToTarget = (behavior: ScrollBehavior = "smooth") => {
      if (target === "home") {
        window.scrollTo({ top: 0, behavior });
      } else {
        const headerOffset = Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--header-offset")) || 0;
        const section = document.getElementById(target);
        const top = section ? window.scrollY + section.getBoundingClientRect().top - headerOffset : 0;
        window.scrollTo({ top: Math.max(0, top), behavior });
      }
      window.history.replaceState(null, "", `#${target}`);
      if (target === "blogs" || target === "projects") setActiveSection(target);
      if (target === "home") setActiveSection("home");
    };

    scrollToTarget();
    window.sectionNavTimers = [
      window.setTimeout(scrollToTarget, 520),
      window.setTimeout(scrollToTarget, 1300),
      window.setTimeout(() => scrollToTarget("auto"), 2600),
    ];
  }

  function clearSectionNavTimers() {
    window.sectionNavTimers?.forEach((timer) => window.clearTimeout(timer));
    window.sectionNavTimers = [];
  }

  function rememberCurrentIndicator() {
    const nav = navRef.current;
    const activeLink = nav?.querySelector<HTMLAnchorElement>("a.active");
    if (!nav || !activeLink) return;

    const navRect = nav.getBoundingClientRect();
    const linkRect = activeLink.getBoundingClientRect();
    const previousIndicator = {
      left: linkRect.left - navRect.left,
      width: linkRect.width,
    };
    pendingIndicatorRef.current = previousIndicator;
    setBrowserStorageItem("nav-indicator", JSON.stringify(previousIndicator));
    setBrowserStorageItem("nav-indicator-pending", "1");
  }

  function animateIndicatorToLink(link: HTMLAnchorElement) {
    const nav = navRef.current;
    if (!nav || !nav.contains(link)) return false;

    const navRect = nav.getBoundingClientRect();
    const linkRect = link.getBoundingClientRect();
    const targetIndicator = {
      left: linkRect.left - navRect.left,
      width: linkRect.width,
      ready: true,
    };
    pendingIndicatorRef.current = null;
    setNavIndicator(targetIndicator);
    setBrowserStorageItem("nav-indicator", JSON.stringify({ left: targetIndicator.left, width: targetIndicator.width }));
    removeBrowserStorageItem("nav-indicator-pending");
    return true;
  }

  function parseSavedIndicator(saved: string | null, shouldSlideFromSaved: boolean) {
    if (!saved || !shouldSlideFromSaved) return null;
    try {
      return JSON.parse(saved) as { left: number; width: number };
    } catch {
      return null;
    }
  }

  return (
    <div className={`app-root ${theme === "moon" ? "moon-mode" : ""}`}>
      <DecorativeDoodles />
      <div className="page-shell">
        <header className="site-header" aria-label="Primary navigation">
          <a className="brand" href="#home" aria-label="qwq.my home" onClick={(event) => handleHomeNavClick(event, "#home")}>
            <span className="brand-mark" aria-hidden="true">
              ◎
            </span>
            <span>qwq.my</span>
          </a>

          <nav
            className={`nav-links ${navIndicator.ready ? "is-ready" : ""}`}
            ref={navRef}
            style={
              {
                "--active-left": `${navIndicator.left}px`,
                "--active-width": `${navIndicator.width}px`,
              } as CSSProperties
            }
          >
            <span className="nav-active-indicator" aria-hidden="true"></span>
            {navItems.map((item) => (
              <a className={activeSection === item.id ? "active" : ""} href={item.href} key={item.id} onClick={(event) => handleHomeNavClick(event, item.href)}>
                {item.icon}
                {item.label}
              </a>
            ))}
          </nav>

          <div className="theme-actions" aria-label="Theme controls">
            <button
              className="icon-button"
              type="button"
              onClick={() => setTheme("sun")}
              aria-label="Use sunny theme"
              aria-pressed={theme === "sun"}
            >
              ☼
            </button>
            <button
              className="icon-button moon"
              type="button"
              onClick={() => setTheme("moon")}
              aria-label="Use moon theme"
              aria-pressed={theme === "moon"}
            >
              ☾
            </button>
          </div>
        </header>

        <main id="home" className="layout-grid">
          <section className="main-column">
            <section className="hero" aria-label="Intro">
              <div className="hero-copy">
                <h1>
                  {siteContent.site.heroTitle.split("\n").map((line) => (
                    <span key={line}>
                      {line}
                      <br />
                    </span>
                  ))}
                </h1>
                <span className="crayon-swoosh" aria-hidden="true"></span>
                <p className="strike">{siteContent.site.heroSubtitle}</p>
                <p className="tagline">{siteContent.site.heroTagline}</p>

                <div className="hero-buttons">
                  <a className="button primary" href="/me">
                    About me
                  </a>
                  <a className="button secondary" href="#projects">
                    View projects
                  </a>
                </div>

                <div className="connect-row" aria-label="Social links">
                  <span>Let's connect</span>
                  {siteContent.site.showGithub ? (
                    <a href={siteContent.site.githubUrl} aria-label="GitHub">
                      <SketchIcon name="github" />
                    </a>
                  ) : null}
                  {siteContent.site.showX ? (
                    <a href={siteContent.site.xUrl} aria-label="X">
                      <SketchIcon name="x" />
                    </a>
                  ) : null}
                  {siteContent.site.showEmail ? (
                    <a href={`mailto:${siteContent.site.email}`} aria-label="Email">
                      <SketchIcon name="mail" />
                    </a>
                  ) : null}
                  <a href="/me" aria-label="About">
                    <SketchIcon name="heart" />
                  </a>
                </div>
              </div>
              <img
                className="hero-art"
                src={siteContent.site.heroImageUrl}
                alt={siteContent.site.heroImageAlt}
              />
            </section>

            <section id="blogs" className="writing-section" aria-label="Blogs">
              <div className="section-title">
                <SketchIcon name="pencil" />
                <h2>Blogs</h2>
              </div>

              <div className="writing-grid">
                <aside className="filter-panel" aria-label="Writing filters">
                  <h3>
                    <SketchIcon name="search" />
                    Filters
                  </h3>
                  <label htmlFor="search">Search</label>
                  <div className="input-wrap">
                    <input
                      id="search"
                      type="search"
                      placeholder="Writing..."
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                    />
                    <button type="button" aria-label="Clear search" onClick={() => setQuery("")}>
                      x
                    </button>
                  </div>

                  <label htmlFor="sort">Sort</label>
                  <select id="sort" value={sort} onChange={(event) => setSort(event.target.value as SortMode)}>
                    <option value="newest">Newest first</option>
                    <option value="oldest">Oldest first</option>
                    <option value="short">Shortest read</option>
                  </select>

                  <fieldset>
                    <legend>Topics</legend>
                    {topicOptions.map((option) => (
                      <label key={option.value}>
                        <input
                          type="radio"
                          name="topic"
                          value={option.value}
                          checked={topic === option.value}
                          onChange={() => setTopic(option.value)}
                        />
                        {option.label}
                      </label>
                    ))}
                  </fieldset>
                </aside>

                <div className="results-panel">
                  <div className="results-kicker">
                    <span>RESULTS</span>
                    <span>{filteredPosts.length}</span>
                  </div>
                  <div className="post-list" aria-live="polite">
                    {filteredPosts.length > 0 ? (
                      filteredPosts.map((post) => <PostCard key={post.title} post={post} />)
                    ) : (
                      <article className="post-card">
                        <span className="post-icon blue" aria-hidden="true">
                          <SketchIcon name="search" />
                        </span>
                        <div>
                          <h3>No notes found</h3>
                          <p>Try a different search or topic filter.</p>
                        </div>
                      </article>
                    )}
                  </div>
                </div>
              </div>
            </section>

            <section id="projects" className="projects-section" aria-label="Projects">
              <div className="project-strip">
                <div>
                  <h2>Projects</h2>
                  <p>{siteContent.site.projectsIntro}</p>
                </div>
                <a className="button secondary" href="#blogs">
                  Browse blogs
                </a>
              </div>
              <div className="project-grid">
                {siteContent.projects.map((project) => (
                  <article className="project-card" key={project.title}>
                    <span className={`post-icon ${project.color}`} aria-hidden="true">
                      <SketchIcon name="spark" />
                    </span>
                    <div>
                      <div className="project-heading">
                        <h3>{project.title}</h3>
                        <span>{project.status}</span>
                      </div>
                      <p>{project.summary}</p>
                      {project.githubUrl ? (
                        <a className="project-github-link" href={project.githubUrl}>
                          <SketchIcon name="github" />
                          GitHub
                        </a>
                      ) : null}
                      <div className="post-meta">
                        {project.tags.map((tag) => (
                          <span className="tag" key={tag}>
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>

          </section>

          <aside className="side-column" aria-label="Status widgets">
            <section className="status-card">
              <span className="status-orbit" aria-hidden="true"></span>
              <h2>
                <span className={`dot ${isProbeOnline ? "mint" : "pink"}`}></span> {isProbeOnline ? "I'm Online" : "I'm Offline"}
              </h2>
              <div className="meta-row">
                <span>⌖ {displayLocation}</span>
                <span>⌘ {deviceName}</span>
                <span>
                  ♡ <b>{displayBpm}</b> bpm
                </span>
              </div>
              <div className="device-row" aria-label="Device metrics">
                <span>{osName}</span>
                <span>CPU {cpuText}</span>
                <span>MEM {memoryText}</span>
              </div>
              <div className="editing-row">
                <span className="edit-icon">
                  <SketchIcon name="pencil" />
                </span>
                <div>
                  <Link className="editing-link" href="/admin/site">
                    <strong>
                      {editingTitle}
                      <span className="typing-dots" aria-hidden="true"></span>
                    </strong>
                    <span>{editingFile}</span>
                    {editingMeta ? <small>{editingMeta}</small> : null}
                  </Link>
                </div>
              </div>
            </section>

            <section className="viewers-card">
              <span className="viewer-spark viewer-spark-one" aria-hidden="true">
                <SketchIcon name="spark" />
              </span>
              <span className="viewer-spark viewer-spark-two" aria-hidden="true">
                <SketchIcon name="star" />
              </span>
              <h2>
                <span className="dot violet"></span> Viewers
              </h2>
              <div className="now-grid">
                <div>
                  <span>Right now</span>
                  <strong>{presence.online}</strong>
                  <small>on site</small>
                </div>
                <div>
                  <span>This page</span>
                  <strong>1</strong>
                  <small>currently</small>
                </div>
              </div>
              <div className="divider">⌁</div>
              <div className="all-time">
                <span>All time</span>
                <div className="stat-line">
                  <strong>{formatCompact(viewStats.totalPageViews)}</strong>
                  <svg viewBox="0 0 120 32" aria-hidden="true">
                    <path d="M2 18c16-20 30 19 47 0s31 18 69-6" />
                  </svg>
                </div>
                <div className="stat-line">
                  <strong>{formatCompact(viewStats.pageViews)}</strong>
                  <svg viewBox="0 0 120 32" aria-hidden="true">
                    <path d="M2 20c16-9 25-2 36 1 20 5 25-19 45-8 12 7 21 8 35-4" />
                  </svg>
                </div>
              </div>
            </section>
          </aside>
        </main>
      </div>
    </div>
  );
}

function formatPercent(value?: number) {
  if (typeof value !== "number") return "--";
  return `${value.toFixed(1)}%`;
}

function formatCompact(value: number) {
  if (value >= 1000) return `${(value / 1000).toFixed(value >= 10000 ? 1 : 1)}K`;
  return String(value);
}

function PostCard({ post }: { post: Post }) {
  return (
    <article className="post-card">
      <span className={`post-icon ${post.color}`} aria-hidden="true">
        <SketchIcon name="pencil" />
      </span>
      <div>
        <h3>
          <Link href={`/writing/${post.slug}`}>{post.title}</Link>
        </h3>
        <p>{post.summary}</p>
        <div className="post-meta">
          <span>{post.date}</span>
          <span>•</span>
          <span>{post.views} views</span>
          <span>•</span>
          <span>{post.likes} likes</span>
          <span>•</span>
          {post.tags.map((tag) => (
            <span className="tag" key={tag}>
              {tag}
            </span>
          ))}
        </div>
      </div>
      <span className="read-time">{post.read} min read</span>
    </article>
  );
}

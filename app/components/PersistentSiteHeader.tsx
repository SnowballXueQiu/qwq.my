"use client";

import Link from "next/link";
import { MouseEvent, useEffect, useLayoutEffect, useRef, useState, useTransition } from "react";
import type { CSSProperties } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getStaticSiteContent } from "@/lib/site-content-data";
import type { SiteContent } from "@/lib/site-content-types";
import { SketchIcon } from "./SketchIcon";

const initialSiteContent = getStaticSiteContent();

const navItems = [
  { href: "/#blogs", id: "blogs", label: "Blogs", icon: <SketchIcon name="writing" /> },
  { href: "/#projects", id: "projects", label: "Projects", icon: <SketchIcon name="projects" /> },
  { href: "/friends", id: "friends", label: "Friends", icon: <SketchIcon name="heart" /> },
  { href: "/me", id: "me", label: "Me", icon: <SketchIcon name="star" /> },
  { href: "/about", id: "about", label: "About", icon: <SketchIcon name="spark" /> },
];

const routeActive: Record<string, string> = {
  "/friends": "friends",
  "/me": "me",
  "/about": "about",
};

declare global {
  interface Window {
    sectionNavTimers?: number[];
  }
}

export function PersistentSiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const navRef = useRef<HTMLElement>(null);
  const pendingSectionRef = useRef<string | null>(null);
  const manualNavUntilRef = useRef(0);
  const [siteContent, setSiteContent] = useState<SiteContent>(initialSiteContent);
  const [active, setActive] = useState(() => routeActive[pathname] ?? "");
  const [theme, setTheme] = useState<"sun" | "moon">("sun");
  const [indicator, setIndicator] = useState({ left: 0, width: 0, ready: false });
  const [, startTransition] = useTransition();

  useEffect(() => {
    fetch("/api/site-content")
      .then((response) => (response.ok ? response.json() : null))
      .then((content: SiteContent | null) => {
        if (content?.site) setSiteContent(content);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    document.body.classList.toggle("moon-mode", theme === "moon");
    return () => document.body.classList.remove("moon-mode");
  }, [theme]);

  useEffect(() => {
    if (routeActive[pathname]) {
      setActive(routeActive[pathname]);
      return;
    }

    if (pathname === "/") {
      const target = pendingSectionRef.current ?? window.location.hash.slice(1);
      if (target === "home") {
        setActive("");
        scrollHome("auto");
        pendingSectionRef.current = null;
        return;
      }
      if (target === "blogs" || target === "projects") {
        setActive(target);
        scheduleSectionScroll(target);
        pendingSectionRef.current = null;
      } else {
        setActive("");
      }
    }
  }, [pathname]);

  useEffect(() => {
    if (pathname !== "/") return;

    let frame = 0;
    const updateActiveFromScroll = () => {
      if (Date.now() < manualNavUntilRef.current) return;

      const headerOffset = getHeaderOffset();
      const blogs = document.getElementById("blogs");
      const projects = document.getElementById("projects");
      const activationLine = headerOffset + 10;
      const blogsReached = blogs ? blogs.getBoundingClientRect().top <= activationLine : false;
      const projectsReached = projects ? projects.getBoundingClientRect().top <= activationLine : false;

      if (projectsReached) setActive("projects");
      else if (blogsReached) setActive("blogs");
      else setActive("");
    };

    const onScroll = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(updateActiveFromScroll);
    };

    updateActiveFromScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [pathname]);

  useLayoutEffect(() => {
    const nav = navRef.current;
    const activeLink = nav?.querySelector<HTMLAnchorElement>("a.active");
    if (!nav || !activeLink) {
      setIndicator((current) => ({ ...current, ready: false }));
      return;
    }

    const navRect = nav.getBoundingClientRect();
    const linkRect = activeLink.getBoundingClientRect();
    setIndicator({
      left: linkRect.left - navRect.left,
      width: linkRect.width,
      ready: true,
    });
  }, [active]);

  function navigate(event: MouseEvent<HTMLAnchorElement>, href: string, id: string) {
    event.preventDefault();
    setActive(id);

    if (href.startsWith("/#")) {
      const target = href.slice(2);
      clearSectionNavTimers();
      pendingSectionRef.current = target;
      manualNavUntilRef.current = Date.now() + 4000;
      if (pathname === "/") {
        scheduleSectionScroll(target);
      } else {
        startTransition(() => router.push("/"));
      }
      return;
    }

    startTransition(() => router.push(href));
  }

  function navigateHome(event: MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();
    clearSectionNavTimers();
    pendingSectionRef.current = null;
    manualNavUntilRef.current = Date.now() + 1200;

    if (pathname === "/") {
      setActive("");
      scrollHome();
      window.setTimeout(() => scrollHome("auto"), 320);
      return;
    }

    startTransition(() => router.push("/#home"));
  }

  function scrollHome(behavior: ScrollBehavior = "smooth") {
    window.scrollTo({ top: 0, behavior });
    window.history.replaceState(null, "", "#home");
  }

  function getHeaderOffset() {
    return Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--header-offset")) || 0;
  }

  function scheduleSectionScroll(target: string) {
    clearSectionNavTimers();
    const scrollToTarget = (behavior: ScrollBehavior = "smooth") => {
      const section = document.getElementById(target);
      if (!section) return;

      const top = window.scrollY + section.getBoundingClientRect().top - getHeaderOffset();
      window.scrollTo({ top: Math.max(0, top), behavior });
      window.history.replaceState(null, "", `#${target}`);
      window.dispatchEvent(new CustomEvent("section-nav", { detail: target }));
    };

    window.sectionNavTimers = [
      window.setTimeout(scrollToTarget, 80),
      window.setTimeout(scrollToTarget, 320),
      window.setTimeout(scrollToTarget, 720),
      window.setTimeout(() => scrollToTarget("auto"), 1200),
    ];
  }

  function clearSectionNavTimers() {
    window.sectionNavTimers?.forEach((timer) => window.clearTimeout(timer));
    window.sectionNavTimers = [];
  }

  return (
    <div className="persistent-header-shell">
      <header className="site-header persistent-site-header" aria-label="Primary navigation">
        <Link className="brand" href="/#home" aria-label="qwq.my home" onClick={navigateHome}>
          <span className="brand-mark" aria-hidden="true">
            ◎
          </span>
          <span>{siteContent.site.brandName}</span>
        </Link>

        <nav
          className={`nav-links ${indicator.ready ? "is-ready" : ""}`}
          ref={navRef}
          style={
            {
              "--active-left": `${indicator.left}px`,
              "--active-width": `${indicator.width}px`,
            } as CSSProperties
          }
        >
          <span className="nav-active-indicator" aria-hidden="true"></span>
          {navItems.map((item) => (
            <Link className={active === item.id ? "active" : ""} href={item.href} key={item.id} onClick={(event) => navigate(event, item.href, item.id)}>
              {item.icon}
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="theme-actions" aria-label="Page tools">
          <Link className="icon-button admin-entry-button" href="/admin/site" aria-label="Open admin">
            ⚙
          </Link>
          <button
            className={`theme-toggle ${theme === "moon" ? "is-moon" : "is-sun"}`}
            type="button"
            onClick={() => setTheme((current) => (current === "sun" ? "moon" : "sun"))}
            aria-label={theme === "sun" ? "Switch to moon theme" : "Switch to sunny theme"}
            aria-pressed={theme === "moon"}
          >
            <span className="theme-toggle-track" aria-hidden="true">
              <span className="theme-toggle-option sun">☼</span>
              <span className="theme-toggle-option moon">☾</span>
              <span className="theme-toggle-thumb">{theme === "sun" ? "☼" : "☾"}</span>
            </span>
          </button>
        </div>
      </header>
      <button className="back-to-top-button" type="button" aria-label="Back to top" onClick={() => {
        clearSectionNavTimers();
        pendingSectionRef.current = null;
        manualNavUntilRef.current = Date.now() + 1600;
        setActive("");
        scrollHome();
      }}>
        <SketchIcon name="back" />
      </button>
    </div>
  );
}

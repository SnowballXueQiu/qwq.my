"use client";

import Link from "next/link";
import { MouseEvent, useLayoutEffect, useRef, useState, useTransition } from "react";
import type { CSSProperties } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getBrowserStorageItem, removeBrowserStorageItem, setBrowserStorageItem } from "@/lib/browser-storage";
import { SketchIcon } from "./SketchIcon";

const navItems = [
  { href: "/#blogs", id: "blogs", label: "Blogs", icon: <SketchIcon name="writing" /> },
  { href: "/#projects", id: "projects", label: "Projects", icon: <SketchIcon name="projects" /> },
  { href: "/friends", id: "friends", label: "Friends", icon: <SketchIcon name="heart" /> },
  { href: "/me", id: "me", label: "Me", icon: <SketchIcon name="star" /> },
  { href: "/about", id: "about", label: "About", icon: <SketchIcon name="spark" /> },
];

declare global {
  interface Window {
    sectionNavTimers?: number[];
  }
}

export function SiteHeader({ active = "" }: { active?: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const navRef = useRef<HTMLElement>(null);
  const pendingIndicatorRef = useRef<{ left: number; width: number } | null>(null);
  const [indicator, setIndicator] = useState({ left: 0, width: 0, ready: false });
  const [, startTransition] = useTransition();

  useLayoutEffect(() => {
    const nav = navRef.current;
    const activeLink = nav?.querySelector<HTMLAnchorElement>("a.active");
    if (!nav || !activeLink) {
      setIndicator((current) => ({ ...current, ready: false }));
      return;
    }

    const navRect = nav.getBoundingClientRect();
    const linkRect = activeLink.getBoundingClientRect();
    const nextIndicator = {
      left: linkRect.left - navRect.left,
      width: linkRect.width,
      ready: true,
    };
    setIndicator((current) => {
      const saved = getBrowserStorageItem("nav-indicator");
      const shouldSlideFromSaved = getBrowserStorageItem("nav-indicator-pending") === "1";
      const pendingIndicator = pendingIndicatorRef.current ?? parseSavedIndicator(saved, shouldSlideFromSaved);

      if (pendingIndicator) {
        pendingIndicatorRef.current = null;
        try {
          window.setTimeout(() => {
            setIndicator(nextIndicator);
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
  }, [active, pathname]);

  function navigate(event: MouseEvent<HTMLAnchorElement>, href: string) {
    rememberCurrentIndicator();

    if (href.startsWith("/#")) {
      event.preventDefault();
      const target = href.slice(2);
      const didAnimate = animateIndicatorToLink(event.currentTarget);
      clearSectionNavTimers();
      setBrowserStorageItem("pending-scroll-section", target);
      window.setTimeout(() => startTransition(() => router.push("/")), didAnimate ? 420 : 0);
      scheduleSectionScroll(target);
      return;
    }
    if (href.startsWith("#")) return;
    if (href === pathname) return;

    event.preventDefault();
    const didAnimate = animateIndicatorToLink(event.currentTarget);
    window.setTimeout(() => startTransition(() => router.push(href)), didAnimate ? 420 : 0);
  }

  function scheduleSectionScroll(target: string) {
    clearSectionNavTimers();
    const scrollToTarget = (behavior: ScrollBehavior = "smooth") => {
      if (target === "home") {
        window.scrollTo({ top: 0, behavior });
        window.history.replaceState(null, "", "#home");
        window.dispatchEvent(new CustomEvent("section-nav", { detail: target }));
        removeBrowserStorageItem("pending-scroll-section");
        return;
      }

      const section = document.getElementById(target);
      if (!section) return;

      const headerOffset = Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--header-offset")) || 0;
      const top = window.scrollY + section.getBoundingClientRect().top - headerOffset;
      window.scrollTo({ top: Math.max(0, top), behavior });
      window.history.replaceState(null, "", `#${target}`);
      window.dispatchEvent(new CustomEvent("section-nav", { detail: target }));
      removeBrowserStorageItem("pending-scroll-section");
    };

    window.sectionNavTimers = [
      window.setTimeout(scrollToTarget, 120),
      window.setTimeout(scrollToTarget, 520),
      window.setTimeout(scrollToTarget, 980),
      window.setTimeout(scrollToTarget, 1500),
      window.setTimeout(scrollToTarget, 2300),
      window.setTimeout(() => scrollToTarget("auto"), 3200),
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
    setIndicator(targetIndicator);
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
    <header className="site-header" aria-label="Primary navigation">
      <Link className="brand" href="/#home" aria-label="qwq.my home" onClick={(event) => navigate(event, "/#home")}>
        <span className="brand-mark" aria-hidden="true">
          ◎
        </span>
        <span>qwq.my</span>
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
          <Link className={active === item.id ? "active" : ""} href={item.href} key={item.id} onClick={(event) => navigate(event, item.href)}>
            {item.icon}
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="theme-actions" aria-label="Page tools">
        <Link className="icon-button" href="/admin/posts" aria-label="Open blog backend">
          ✎
        </Link>
        <Link className="icon-button moon" href="/admin/site" aria-label="Open site backend">
          ☾
        </Link>
      </div>
    </header>
  );
}

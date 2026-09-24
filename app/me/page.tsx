import { DecorativeDoodles } from "@/app/components/DecorativeDoodles";
import { SiteHeader } from "@/app/components/SiteHeader";
import { SketchIcon } from "@/app/components/SketchIcon";
import { getSiteContent } from "@/lib/site-content";
import type { MeCard } from "@/lib/site-content-types";

export const dynamic = "force-dynamic";

export default async function MePage() {
  const content = await getSiteContent();
  const modules = content.me.filter((module) => module.enabled);
  const intro = modules.find((module) => module.kind === "intro") ?? modules[0];

  return (
    <div className="app-root">
      <DecorativeDoodles />
      <div className="page-shell">
        <SiteHeader active="me" />
        <main className="content-page">
          <section className="page-hero-panel">
            <span className="post-icon violet" aria-hidden="true">
              <SketchIcon name="star" />
            </span>
            <div>
              <p className="article-kicker">Me</p>
              <h1>{intro?.title ?? "Snowball"}</h1>
              <p>{intro?.summary ?? "Configurable personal profile modules."}</p>
            </div>
          </section>

          <section className="me-comic-layout" aria-label="Self introduction">
            {modules.map((module) => (
              <MeModuleView module={module} key={module.id} />
            ))}
          </section>
        </main>
      </div>
    </div>
  );
}

function MeModuleView({ module }: { module: MeCard }) {
  if (module.kind === "intro") {
    return (
      <article className="me-intro-card">
        <div>
          <span className="article-kicker">Self-introduction</span>
          <h2>{module.title}</h2>
          <p>{module.summary}</p>
          {module.items.map((item) => (
            <p key={`${item.title}-${item.subtitle}`}>{item.subtitle || item.title}</p>
          ))}
        </div>
        {module.imageUrl ? <img src={module.imageUrl} alt={module.imageAlt || module.title} /> : null}
      </article>
    );
  }

  if (module.kind === "timeline") {
    return (
      <section className="me-section-card" aria-label={module.title}>
        <div className="me-section-title">
          <SketchIcon name="projects" />
          <h2>{module.title}</h2>
        </div>
        <p>{module.summary}</p>
        <div className="me-timeline">
          {module.items.map((item) => (
            <a className={item.past ? "past" : ""} href={item.url || undefined} key={`${item.title}-${item.subtitle}`}>
              <span aria-hidden="true"></span>
              <strong>{item.title}</strong>
              <small>{item.subtitle}</small>
            </a>
          ))}
        </div>
      </section>
    );
  }

  if (module.kind === "skills") {
    return (
      <section className="me-section-card" aria-label={module.title}>
        <div className="me-section-title">
          <SketchIcon name="pencil" />
          <h2>{module.title}</h2>
        </div>
        <p>{module.summary}</p>
        <div className="tech-stack-grid">
          {module.items.map((item) => (
            <div className={`tech-chip ${item.color ?? "blue"}`} key={item.title}>
              <span>{item.title}</span>
              <strong>{item.subtitle}</strong>
            </div>
          ))}
        </div>
        <LinkGrid links={module.links} />
      </section>
    );
  }

  return (
    <section className="me-section-card" aria-label={module.title}>
      <div className="me-section-title">
        <SketchIcon name={module.kind === "links" ? "heart" : "spark"} />
        <h2>{module.title}</h2>
      </div>
      <p>{module.summary}</p>
      {module.items.length ? (
        <div className="me-link-list">
          {module.items.map((item) => (
            <a href={item.url || undefined} key={`${item.title}-${item.subtitle}`}>
              <strong>{item.title}</strong>
              <span>{item.subtitle}</span>
              {item.meta ? <small>{item.meta}</small> : null}
            </a>
          ))}
        </div>
      ) : null}
      <LinkGrid links={module.links} />
    </section>
  );
}

function LinkGrid({ links }: { links: MeCard["links"] }) {
  const enabledLinks = links.filter((link) => link.enabled);
  if (!enabledLinks.length) return null;

  return (
    <div className="contact-grid">
      {enabledLinks.map((contact) =>
        contact.url ? (
          <a href={contact.url} key={contact.label}>
            <strong>{contact.label}</strong>
            <span>{contact.value}</span>
          </a>
        ) : (
          <div key={contact.label}>
            <strong>{contact.label}</strong>
            <span>{contact.value}</span>
          </div>
        ),
      )}
    </div>
  );
}

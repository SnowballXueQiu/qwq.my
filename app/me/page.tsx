import { DecorativeDoodles } from "@/app/components/DecorativeDoodles";
import { SiteHeader } from "@/app/components/SiteHeader";
import { SketchIcon } from "@/app/components/SketchIcon";
import { getMeProfile } from "@/lib/me-profile";

export default function MePage() {
  const profile = getMeProfile();

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
              <h1>{profile.intro.name}</h1>
              <p>{profile.intro.headline}</p>
            </div>
          </section>

          <section className="me-comic-layout" aria-label="Self introduction">
            <article className="me-intro-card">
              <div>
                <span className="article-kicker">Self-introduction</span>
                <h2>Hello, I am {profile.intro.name}.</h2>
                <p>{profile.intro.body}</p>
              </div>
              <img src={profile.intro.imageUrl} alt={profile.intro.imageAlt} />
            </article>

            <section className="me-panel-grid" aria-label="Team">
              <MeGroup title="Leadership" items={profile.teams.leadership} icon="spark" />
              <MeGroup title="Contributions" items={profile.teams.contributions} icon="star" />
            </section>

            <section className="me-section-card" aria-label="Positions">
              <div className="me-section-title">
                <SketchIcon name="projects" />
                <h2>Positions</h2>
              </div>
              <div className="me-timeline">
                {profile.positions.map((position) => (
                  <a className={position.past ? "past" : ""} href={position.url || undefined} key={`${position.title}-${position.organization}`}>
                    <span aria-hidden="true"></span>
                    <strong>{position.title}</strong>
                    <small>{position.organization}</small>
                  </a>
                ))}
              </div>
            </section>

            <section className="me-section-card" aria-label="Tech stack">
              <div className="me-section-title">
                <SketchIcon name="pencil" />
                <h2>Tech stack</h2>
              </div>
              <a className="wakatime-badge" href={profile.techStack.wakatimeUrl}>
                <img src={profile.techStack.wakatimeBadgeUrl} alt="Total time coded since Oct 25 2020" />
              </a>
              <div className="skill-legend">
                {profile.techStack.levels.map((level) => (
                  <span key={level.symbol}>
                    <strong>{level.symbol}</strong>
                    {level.label}
                  </span>
                ))}
              </div>
              <div className="tech-stack-grid">
                {profile.techStack.technologies.map((technology) => (
                  <div className={`tech-chip ${technology.color}`} key={technology.name}>
                    <span>{technology.name}</span>
                    <strong>{technology.level}</strong>
                  </div>
                ))}
              </div>
            </section>

            <section className="me-section-card" aria-label="Contact me">
              <div className="me-section-title">
                <SketchIcon name="heart" />
                <h2>Contact me</h2>
              </div>
              <div className="contact-grid">
                {profile.contacts.map((contact) =>
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
            </section>
          </section>
        </main>
      </div>
    </div>
  );
}

function MeGroup({
  title,
  items,
  icon,
}: {
  title: string;
  items: { name: string; url: string; description: string }[];
  icon: "spark" | "star";
}) {
  return (
    <section className="me-section-card">
      <div className="me-section-title">
        <SketchIcon name={icon} />
        <h2>{title}</h2>
      </div>
      <div className="me-link-list">
        {items.map((item) => (
          <a href={item.url} key={item.name}>
            <strong>{item.name}</strong>
            <span>{item.description}</span>
          </a>
        ))}
      </div>
    </section>
  );
}

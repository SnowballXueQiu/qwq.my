import { DecorativeDoodles } from "@/app/components/DecorativeDoodles";
import { SiteHeader } from "@/app/components/SiteHeader";
import { SketchIcon } from "@/app/components/SketchIcon";
import { getPosts } from "@/lib/posts";
import { getSiteContent } from "@/lib/site-content";

export const dynamic = "force-dynamic";

export default async function AboutPage() {
  const [content, posts] = await Promise.all([getSiteContent(), getPosts()]);
  const aboutStatistics = [
    { label: "Blog posts", value: String(posts.length), note: "MongoDB posts" },
    { label: "Projects", value: String(content.projects.length), note: "configurable" },
    { label: "Friends", value: String(content.friends.length), note: "approved links" },
    { label: "Presence", value: "Live", note: "probe package" },
  ];
  const aboutLinks = [
    { label: "Author", url: "/me", note: "snowball, frontend engineer and interface tinkerer" },
    { label: "GitHub", url: content.site.githubUrl, note: "project source and issue notes" },
    { label: "Presence Probe", url: "/downloads/Presence-Probe.zip", note: "download the macOS reporter app package" },
  ];

  return (
    <div className="app-root">
      <DecorativeDoodles />
      <div className="page-shell">
        <SiteHeader active="about" />
        <main className="content-page">
          <section className="page-hero-panel">
            <span className="post-icon mint" aria-hidden="true">
              <SketchIcon name="spark" />
            </span>
            <div>
              <p className="article-kicker">About this site</p>
              <h1>Stats, links, credits.</h1>
              <p>Site information, downloads, source links, and copyright notes live here.</p>
            </div>
          </section>

          <section className="about-comic-page" aria-label="About this site">
            <div className="about-ledger" aria-label="Site statistics">
              <div className="ledger-spine" aria-hidden="true">
                <span></span>
                <span></span>
                <span></span>
              </div>
              <div className="ledger-header">
                <span>site log</span>
                <strong>04 panels</strong>
              </div>
              <div className="ledger-track">
                {aboutStatistics.map((stat, index) => (
                  <article className="about-stat-ticket" key={stat.label}>
                    <span className="ticket-index">{String(index + 1).padStart(2, "0")}</span>
                    <div>
                      <span>{stat.label}</span>
                      <strong>{stat.value}</strong>
                      <small>{stat.note}</small>
                    </div>
                  </article>
                ))}
              </div>
            </div>

            <div className="about-resource-board" aria-label="Site links">
              <div className="resource-board-title">
                <h2>Resource map</h2>
                <p>Entry points, author notes, design direction, and Presence Probe links are collected here.</p>
              </div>
              <div className="resource-pinboard">
                {aboutLinks.map((link, index) => (
                  <a className="about-resource-note" href={link.url} key={link.label}>
                    <span className="resource-number">{String(index + 1).padStart(2, "0")}</span>
                    <span className="post-icon pink" aria-hidden="true">
                      <SketchIcon name={index % 2 === 0 ? "spark" : "star"} />
                    </span>
                    <div>
                      <h3>{link.label}</h3>
                      <p>{link.note}</p>
                    </div>
                  </a>
                ))}
              </div>
            </div>

            <div className="about-copyright-stamp">
              <div className="stamp-mark" aria-hidden="true">
                OK
              </div>
              <p>{content.about.copyright}</p>
              <span aria-hidden="true">
                <SketchIcon name="heart" />
              </span>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

import { DecorativeDoodles } from "@/app/components/DecorativeDoodles";
import { SiteHeader } from "@/app/components/SiteHeader";
import { SketchIcon } from "@/app/components/SketchIcon";
import { getSiteContent } from "@/lib/site-content";
import { FriendApplication } from "./FriendApplication";

export const dynamic = "force-dynamic";

const rules = [
  "Before applying, please make sure your site already links back to mine.",
  "If the site is inaccessible for a long time, I may remove the link. You can reapply after recovery.",
  "Keep the site personal, readable, and free from illegal content, malware, intrusive ads, or uncredited reposts.",
  "HTTPS should be enabled globally.",
  "Use your own independent domain. Public subdomains and free domains are usually not accepted.",
  "Commercial and non-personal websites are not accepted.",
];

export default async function FriendsPage() {
  const content = await getSiteContent();

  return (
    <div className="app-root">
      <DecorativeDoodles />
      <div className="page-shell">
        <SiteHeader active="friends" />
        <main className="content-page">
          <section className="page-hero-panel">
            <span className="post-icon pink" aria-hidden="true">
              <SketchIcon name="heart" />
            </span>
            <div>
              <p className="article-kicker">Friends</p>
              <h1>Link exchange, but make it personal.</h1>
              <p>Sites I keep close, plus a place to apply for a link exchange.</p>
            </div>
          </section>

          <section className="friends-section" aria-label="Friends">
            <div className="friend-grid">
              {content.friends.map((friend) => (
                <a className="friend-card" href={friend.url} key={friend.name}>
                  <span className="post-icon mint" aria-hidden="true">
                    <SketchIcon name="star" />
                  </span>
                  <div>
                    <h3>{friend.name}</h3>
                    <p>{friend.description}</p>
                  </div>
                </a>
              ))}
            </div>
          </section>

          <section className="friend-apply-panel" aria-label="Friend link application">
            <h2>Before applying</h2>
            <ul>
              {rules.map((rule) => (
                <li key={rule}>{rule}</li>
              ))}
            </ul>
            <div className="site-card-copy">
              <p>
                <strong>Site Title:</strong> qwq.my
              </p>
              <p>
                <strong>Site Description:</strong> Soft hand-drawn notes, projects, and presence.
              </p>
              {content.site.heroImageUrl ? (
                <p>
                  <strong>Owner Avatar:</strong> <a href={content.site.heroImageUrl}>Click to view</a>
                </p>
              ) : null}
              <p>
                <strong>Owner Name:</strong> snowball
              </p>
            </div>
            <FriendApplication />
          </section>
        </main>
      </div>
    </div>
  );
}

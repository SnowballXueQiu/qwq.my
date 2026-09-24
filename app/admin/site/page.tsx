import Link from "next/link";
import { SketchIcon } from "@/app/components/SketchIcon";
import { requireAdmin } from "@/lib/admin-auth";
import { getFriendApplications } from "@/lib/friend-applications";
import { getMediaAssets } from "@/lib/media";
import { getPosts } from "@/lib/posts";
import { getSiteContent } from "@/lib/site-content";
import { AdminSiteEditor } from "./AdminSiteEditor";

export const dynamic = "force-dynamic";

export default async function AdminSitePage() {
  await requireAdmin();
  const [content, applications, mediaAssets, posts] = await Promise.all([getSiteContent(), getFriendApplications(), getMediaAssets(), getPosts()]);

  return (
    <main className="admin-page">
      <section className="admin-shell">
        <Link className="back-link" href="/">
          <SketchIcon name="back" />
          Back home
        </Link>
        <header className="admin-header">
          <span className="post-icon mint" aria-hidden="true">
            <SketchIcon name="spark" />
          </span>
          <div>
            <p className="article-kicker">SSR site backend</p>
            <h1>Control room</h1>
            <p>Edit title, favicon, hero, articles, projects, friends, me cards, copyright, media, and incoming friend requests.</p>
          </div>
        </header>
        <AdminSiteEditor applications={applications} content={content} mediaAssets={mediaAssets} posts={posts} />
      </section>
    </main>
  );
}

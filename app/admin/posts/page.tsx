import Link from "next/link";
import { SketchIcon } from "@/app/components/SketchIcon";
import { requireAdmin } from "@/lib/admin-auth";
import { getPosts } from "@/lib/posts";
import { AdminPostsEditor } from "./AdminPostsEditor";

export const dynamic = "force-dynamic";

export default async function AdminPostsPage() {
  await requireAdmin();
  const posts = await getPosts();

  return (
    <main className="admin-page">
      <section className="admin-shell">
        <Link className="back-link" href="/">
          <SketchIcon name="back" />
          Back home
        </Link>
        <Link className="back-link" href="/admin/site">
          <SketchIcon name="spark" />
          Site backend
        </Link>
        <header className="admin-header">
          <span className="post-icon violet" aria-hidden="true">
            <SketchIcon name="pencil" />
          </span>
          <div>
            <p className="article-kicker">SSR admin editor</p>
            <h1>Writing backend</h1>
            <p>Edits are saved to local JSON. Public article pages are generated with SSG/ISR.</p>
          </div>
        </header>
        <AdminPostsEditor posts={posts} />
      </section>
    </main>
  );
}

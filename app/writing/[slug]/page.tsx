import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MarkdownArticle } from "@/app/components/MarkdownArticle";
import { SketchIcon } from "@/app/components/SketchIcon";
import { getPost, recordPostView } from "@/lib/posts";
import { LikePostButton } from "./LikePostButton";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await recordPostView(slug);

  if (!post) {
    return {
      title: "Post not found - qwq.my",
    };
  }

  return {
    title: `${post.title} - qwq.my`,
    description: post.summary,
  };
}

export default async function WritingDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const post = await getPost(slug);

  if (!post) notFound();

  return (
    <main className="article-page">
      <article className="article-shell">
        <Link className="back-link" href="/#blogs">
          <SketchIcon name="back" />
          Back to blogs
        </Link>

        <header className="article-header">
          <span className={`post-icon ${post.color}`} aria-hidden="true">
            <SketchIcon name="pencil" />
          </span>
          <div>
            <p className="article-kicker">
              {post.date} · {post.read} min read
            </p>
            <h1>{post.title}</h1>
            <p>{post.summary}</p>
            <div className="post-meta">
              {post.tags.map((tag) => (
                <span className="tag" key={tag}>
                  {tag}
                </span>
              ))}
              <span className="tag">{post.views} views</span>
              <span className="tag">{post.likes} likes</span>
            </div>
            <LikePostButton slug={post.slug} initialLikes={post.likes} />
          </div>
        </header>

        <div className="article-body">
          <MarkdownArticle content={post.content} />
        </div>
      </article>
    </main>
  );
}

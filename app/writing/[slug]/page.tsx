import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SketchIcon } from "@/app/components/SketchIcon";
import { getStaticPosts } from "@/lib/post-data";
import { getPost } from "@/lib/posts";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export const revalidate = 60;
export const dynamicParams = false;

export function generateStaticParams() {
  return getStaticPosts().map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);

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
            </div>
          </div>
        </header>

        <div className="article-body">
          {post.content.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
      </article>
    </main>
  );
}

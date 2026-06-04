import { DecorativeDoodles } from "@/app/components/DecorativeDoodles";
import { AdminLoginForm } from "./AdminLoginForm";

export const dynamic = "force-dynamic";

export default function AdminLoginPage() {
  return (
    <div className="app-root">
      <DecorativeDoodles />
      <main className="admin-login-page">
        <section className="admin-login-card">
          <p className="article-kicker">Private backend</p>
          <h1>Sign in</h1>
          <p>Use the admin account to edit posts, site content, friend applications, and media.</p>
          <AdminLoginForm />
        </section>
      </main>
    </div>
  );
}

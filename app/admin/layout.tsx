import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Admin · GREP",
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="nav">
        <div className="wrap admin-wrap">
          <Link className="brand" href="/admin" aria-label="GREP admin">
            <svg className="mark" viewBox="0 0 32 32" aria-hidden="true">
              <use href="#g-mark" />
            </svg>
            <span className="wordmark">GREP</span>
            <span className="admin-tag">Admin</span>
          </Link>
          <nav className="nav-links admin-links" aria-label="Admin">
            <Link href="/admin">Applicants</Link>
            <Link href="/admin/cohorts">Cohorts</Link>
            <a href="/" target="_blank">
              Site ›
            </a>
          </nav>
        </div>
      </header>
      <main className="admin">{children}</main>
    </>
  );
}

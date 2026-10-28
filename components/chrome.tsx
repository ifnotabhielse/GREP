import Link from "next/link";

/** Nav and footer. On the home page links are in-page anchors; elsewhere they point back to the home page. */

function Brand({ home }: { home: boolean }) {
  return (
    <a className="brand" href={home ? "#top" : "/"} aria-label="GREP home">
      <svg className="mark" viewBox="0 0 32 32" aria-hidden="true">
        <use href="#g-mark" />
      </svg>
      <span className="wordmark">GREP</span>
    </a>
  );
}

export function Nav({ home = false }: { home?: boolean }) {
  const p = home ? "" : "/";
  return (
    <header className="nav">
      <div className="wrap">
        <Brand home={home} />
        <nav className="nav-links" aria-label="Main">
          <a href={`${p}#how`}>How it works</a>
          <a href={`${p}#cohorts`}>Cohorts</a>
          <a href={`${p}#faq`}>FAQ</a>
          <a href="/login">Sign in</a>
          <a className="btn btn-primary" href={`${p}#join`}>
            Join
          </a>
        </nav>
      </div>
    </header>
  );
}

export function Footer({ home = false }: { home?: boolean }) {
  const p = home ? "" : "/";
  return (
    <footer className="footer">
      <div className="wrap">
        <div className="footer-left">
          <Brand home={home} />
          <span>© 2026 GREP · Built in Hyderabad</span>
        </div>
        <nav aria-label="Footer">
          <a href={`${p}#how`}>How it works</a>
          <a href={`${p}#cohorts`}>Cohorts</a>
          <a href={`${p}#join`}>Join</a>
          <a href={`${p}#faq`}>FAQ</a>
          <a href="/login">Sign in</a>
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
        </nav>
      </div>
    </footer>
  );
}

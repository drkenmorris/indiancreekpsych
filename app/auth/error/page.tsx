import Link from "next/link";

export default function AuthErrorPage() {
  return (
    <div className="icp-shell">
      <header className="icp-top-menu"><div className="icp-top-menu-left"><Link className="icp-brand" href="/"><span className="icp-brand-mark">IC</span><span className="icp-brand-copy"><strong>Indian Creek</strong><small>Psychological Services</small></span></Link></div></header>
      <main className="icp-shell-center authPage">
        <section className="authCard"><p className="eyebrow">Account access</p><h1>We could not complete that sign-in.</h1><p>The confirmation or authentication link may have expired. You can try signing in again or register again if the account was not completed.</p><div className="heroActions"><Link className="primaryButton" href="/login">Return to login</Link><Link className="secondaryButton" href="/register">Register</Link></div></section>
      </main>
      <nav className="icp-bottom-menu"><Link href="/">Home</Link><Link href="/login">Login</Link></nav>
    </div>
  );
}

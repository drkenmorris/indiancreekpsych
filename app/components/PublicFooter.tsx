import Link from "next/link";

export default function PublicFooter() {
  return (
    <footer className="publicFooter">
      <nav aria-label="Primary site navigation">
        <Link href="/">Home</Link>
        <Link href="/about">About</Link>
        <Link href="/services">Our Services</Link>
        <Link href="/specialties">Specialties</Link>
        <Link href="/meet-the-therapist">Meet the Therapist</Link>
        <Link href="/contact">Contact</Link>
        <Link href="/appointments">Appointments</Link>
        <Link href="/login">Login</Link>
        <Link href="/register">Register</Link>
      </nav>
      <div className="footerContact">
        <span>15022 W. 128th St., Olathe, KS 66062</span>
        <span>913-636-5657</span>
      </div>
    </footer>
  );
}

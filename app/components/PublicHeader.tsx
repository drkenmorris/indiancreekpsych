import Link from "next/link";

export default function PublicHeader() {
  return (
    <header className="publicHeader">
      <nav className="publicNav" aria-label="Public site navigation">
        <Link href="/">Home</Link>
        <Link href="/about">About</Link>
        <Link href="/services">Our Services</Link>
        <Link href="/specialties">Specialties</Link>
        <Link href="/contact">Contact</Link>
        <Link className="navSchedule" href="/appointments">Schedule an Appointment</Link>
      </nav>
    </header>
  );
}

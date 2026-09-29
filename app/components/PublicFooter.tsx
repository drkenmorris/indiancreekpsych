import Image from "next/image";
import Link from "next/link";

export default function PublicFooter() {
  return (
    <footer className="publicFooter">
      <div className="footerBrand">
        <Image src="/images/indian-creek-logo.webp" alt="Indian Creek Psychological Services" width={300} height={115} />
      </div>
      <nav aria-label="Footer navigation">
        <Link href="/">Home</Link>
        <Link href="/about">About</Link>
        <Link href="/services">Our Services</Link>
        <Link href="/specialties">Specialties</Link>
        <Link href="/contact">Contact</Link>
        <Link href="/appointments">Appointments</Link>
      </nav>
      <div className="footerContact">
        <span>15022 W. 128th St., Olathe, KS 66062</span>
        <span>913-636-5657</span>
      </div>
    </footer>
  );
}

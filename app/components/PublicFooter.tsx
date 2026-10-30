import Link from "next/link";
import ClinicLogo from "./ClinicLogo";
import AuthMenuAction from "./AuthMenuAction";

export default function PublicFooter({ workspace = false }: { workspace?: boolean }) {
  return (
    <footer className={`publicFooter${workspace ? " workspaceFooter" : ""}`}>
      <Link className="clinicFooterLogoLink" href="/" aria-label="Indian Creek Psychological Services home"><ClinicLogo loading="lazy" /></Link>
      <nav aria-label={workspace ? "Workspace navigation" : "Primary site navigation"}>
        <Link href="/">Home</Link>
        {!workspace && (<>
        <Link href="/about">About</Link>
        <Link href="/services">Our Services</Link>
        <Link href="/specialties">Specialties</Link>
        <Link href="/meet-the-therapist">Meet the Therapist</Link>
        <Link href="/contact">Contact</Link>
        <Link href="/make-an-appointment">Make an Appointment</Link>
        </>)}
        <Link href="/account">Account</Link>
        <AuthMenuAction compact={workspace} />
        <Link href="/privacy">HIPAA Privacy Notice</Link>
        {!workspace && <a href="https://omnicoreai.app/website-protection" aria-label="Monitored by OmniCore — learn about monitoring and security controls"><span aria-hidden="true">◉ </span>Monitored by OmniCore</a>}
      </nav>
      <div className="footerContact">
        <span>15022 W. 128th St., Olathe, KS 66062</span>
        <span>(913) 353-6116</span>
      </div>
    </footer>
  );
}

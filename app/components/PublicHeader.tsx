import Link from "next/link";
import ClinicLogo from "./ClinicLogo";

export default function PublicHeader() {
  return <div className="clinicBrandArea"><Link href="/" aria-label="Indian Creek Psychological Services home"><ClinicLogo /></Link></div>;
}

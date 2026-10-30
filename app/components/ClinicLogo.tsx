type ClinicLogoProps = { className?: string; loading?: "eager" | "lazy" };

/** The supplied full-color PNG, with its original proportions and transparency. */
export default function ClinicLogo({ className = "", loading = "eager" }: ClinicLogoProps) {
  return <img className={`clinicFullColorLogo ${className}`} src="/images/indian-creek-full-color-logo.png" width={300} height={200} alt="Indian Creek Psychological Services" loading={loading} decoding="async" />;
}

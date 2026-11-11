/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // The protected /emr/workspace Route Handler reads the original prototype
  // HTML at runtime after checking real clinic identity and AAL2 MFA.
  // Explicitly bundle it with the serverless function: Next's output tracing
  // cannot otherwise guarantee a runtime fs read from public/ on Vercel.
  outputFileTracingIncludes: {
    '/emr/workspace': ['./public/emr-assets/index.html']
  }
};

export default nextConfig;

/** The production allowlist uses the apex domain; Vercel returns its callback to www. */
export function passwordRecoveryRedirect(origin:string){
 const url=new URL(origin);
 const production=['indiancreekpsych.com','www.indiancreekpsych.com'].includes(url.hostname);
 return (production?'https://indiancreekpsych.com':url.origin)+'/auth/callback?next=/reset-password';
}

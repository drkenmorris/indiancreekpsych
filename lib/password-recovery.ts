/** The production allowlist uses the apex domain; Vercel returns its callback to www. */
export function passwordRecoveryRedirect(origin:string){
 const url=new URL(origin);
 const production=['indiancreekpsych.com','www.indiancreekpsych.com'].includes(url.hostname);
 return (production?'https://indiancreekpsych.com':url.origin)+'/auth/callback?next=/reset-password';
}

export function passwordUpdateMessage(code:string|undefined){
 switch(code){
  case 'insufficient_aal':return 'Authenticator verification is required before you can change your password. Complete the verification below, then enter your new password.';
  case 'same_password':return 'This is already your current password. Choose a different new password, or return to sign in.';
  case 'weak_password':return 'Choose a stronger password and try again.';
  case 'reauthentication_needed':return 'This older session needs fresh email verification. Open a new recovery link, complete authenticator verification if requested, then retry.';
  case 'reauthentication_not_valid':
  case 'session_not_found':
  case 'session_expired':
  case 'bad_jwt':return 'Your session is no longer valid. Open a new recovery link before retrying.';
  case 'over_request_rate_limit':return 'Too many attempts. Wait a few minutes before trying again.';
  default:return 'The authentication service rejected this update. Your password was not changed. Please report this message so the rejection can be checked.';
 }
}

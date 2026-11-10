import type { WeeklyInsight } from "./weekly-insights";

const esc = (s:string)=>s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");

/** Export-only HTML. Sending must enforce opt-in and replace the unsubscribe placeholder. */
export function renderInsightEmail(item:WeeklyInsight,baseUrl="https://indiancreekpsych.com") {
 const base=baseUrl.replace(/\/$/,"");
 const heading=(title:string,copy:string)=>`<h2 style="font:normal 23px Georgia,serif;color:#153f59;margin:27px 0 8px">${esc(title)}</h2><p style="font-size:16px;line-height:1.75;margin:0 0 17px">${esc(copy)}</p>`;
 return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(item.title)}</title></head>
 <body style="margin:0;background:#edf3f6;font-family:Arial,Helvetica,sans-serif;color:#24475c"><table role="presentation" cellpadding="0" cellspacing="0" width="100%"><tr><td align="center" style="padding:26px 12px"><table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:640px;background:#fff;border-radius:16px;overflow:hidden">
 <tr><td style="padding:28px 34px;background:#113d59;color:#fff;font-size:20px;font-weight:bold">Indian Creek Psychological Services</td></tr>
 <tr><td><img src="${base}${item.image}" width="640" alt="Illustration for ${esc(item.title)}" style="display:block;width:100%;height:auto"></td></tr>
 <tr><td style="padding:35px 38px"><p style="text-transform:uppercase;letter-spacing:2px;color:#a67932;font-size:12px;font-weight:bold">Weekly educational article · Edition ${item.week}</p><h1 style="font:normal 32px/1.2 Georgia,serif;color:#133d5b">${esc(item.title)}</h1><p style="font-size:19px;line-height:1.6;font-weight:bold">${esc(item.summary)}</p>
 ${heading("Understanding the issue",item.context)}${heading("What this looks like",item.insight)}${heading("What clinical understanding adds",item.clinicalPerspective)}
 <div style="background:#eef6f6;border-left:4px solid #b38b4b;padding:18px 22px;margin:26px 0"><strong>A practical place to begin</strong><p style="line-height:1.7;margin-bottom:0">${esc(item.practice)}</p></div>
 <a href="${base}/insights/${encodeURIComponent(item.slug)}" style="display:inline-block;background:#174d6d;color:#fff;text-decoration:none;border-radius:6px;padding:14px 23px;font-weight:bold">View the article on our website</a></td></tr>
 <tr><td style="background:#f2f6f8;padding:25px 34px;font-size:12px;line-height:1.6;color:#607582">Educational information only; not individualized treatment advice. Indian Creek Psychological Services · 15022 W. 128th St., Olathe, KS 66062.<br>You're receiving this because you opted in to informational emails. <a href="{{UNSUBSCRIBE_URL}}">Unsubscribe</a>. Never send until the email service supplies a working individual unsubscribe link.</td></tr>
 </table></td></tr></table></body></html>`;
}

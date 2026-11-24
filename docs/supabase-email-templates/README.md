# Supabase Auth email templates

13 self-contained HTML email templates for Supabase Auth: the 6 templates under
**Authentication → Emails**, plus the 7 templates under the **Security** section
(the newer per-event security notifications).

Style: clean, generic branding — a small placeholder logo mark and "Your App" wordmark,
one accent color (indigo, `#4f46e5`), table-based layout for email-client compatibility
(Outlook/Gmail/Apple Mail), dark-mode-safe (forces light color scheme), and a hidden
preheader line for the inbox preview text. Swap the logo/wordmark and accent color at
the top of the file (search for `Your App` and `#4f46e5`) to match your brand.

## How to install

1. In the Supabase dashboard, go to **Authentication → Emails → Templates**.
2. Open the matching template (see table below) and switch to the "Source" / HTML view.
3. Paste in the contents of the matching file. Save.
4. Repeat for each template you want to customize.

Note: as of mid-2026, brand-new free-tier projects using Supabase's built-in email
sending can no longer customize these templates — only projects on a paid plan, or
free-tier projects using their own SMTP provider (Resend, Postmark, SendGrid, SES,
etc.), can save custom HTML here. If paste/save doesn't stick, that's why — either
upgrade the plan or connect custom SMTP under **Project Settings → Auth → SMTP Settings**.

## Templates

### Authentication (Authentication → Emails)

| File | Supabase template | Variables used |
|---|---|---|
| `confirm-signup.html` | Confirm signup | `.ConfirmationURL`, `.Token`, `.Email` |
| `invite-user.html` | Invite user | `.ConfirmationURL`, `.SiteURL`, `.Email` |
| `magic-link.html` | Magic Link | `.ConfirmationURL`, `.Token`, `.Email` |
| `change-email.html` | Change Email Address | `.ConfirmationURL`, `.Email`, `.NewEmail` |
| `reset-password.html` | Reset Password | `.ConfirmationURL`, `.Email` |
| `reauthentication.html` | Reauthentication | `.Token`, `.Email` |

All six also use `.SiteURL` in the footer. Every Supabase auth template supports
`.ConfirmationURL`, `.Token`, `.TokenHash`, `.SiteURL`, `.Email`, and `.Data` (custom
user metadata); `Change Email Address` additionally gets `.NewEmail`. If your app signs
users in with a 6-digit code rather than a magic link (mobile apps most often do),
`magic-link.html` includes both — the button and the code block — so either flow works;
delete whichever you don't need. `reauthentication.html` is code-only, since Supabase
only exposes `.Token` for that template.

### Security notifications (Authentication → Emails → Security)

These only send if you've turned the matching toggle on for that event in the
Security tab. They don't carry a confirmation link — they're "this just happened,
was it you?" notices — so each ends with a "Secure my account" button pointing at
`.SiteURL`. Point that at your actual account-security page once you know its path.

| File | Event | Variables used |
|---|---|---|
| `password-changed.html` | Password changed | `.Email` |
| `email-changed.html` | Email address changed | `.Email`, `.OldEmail` |
| `phone-changed.html` | Phone number changed | `.Phone`, `.OldPhone` |
| `identity-linked.html` | Sign-in method linked | `.Email`, `.Provider` |
| `identity-unlinked.html` | Sign-in method removed | `.Email`, `.Provider` |
| `mfa-added.html` | MFA method added | `.Email`, `.FactorType` |
| `mfa-removed.html` | MFA method removed | `.Email`, `.FactorType` |

## Customizing

- **Logo/brand**: replace the small colored square + "Your App" text near the top of
  each file with your own logo `<img>` (host it somewhere public and reference it by
  URL — inline images aren't reliable in email) or wordmark.
- **Accent color**: `#4f46e5` appears on the button background, the eyebrow label, and
  links. Find/replace it across all files to re-theme in one pass.
- **Subject lines**: Supabase's defaults are sensible (e.g. "Confirm your email
  address", "{{ .Token }} is your verification code" for reauthentication) — set them
  in the same dashboard panel as the template body, they're not part of the HTML file.
- **Footer address**: "Your App, Inc." is a placeholder — many email regulations
  (e.g. CAN-SPAM) expect a real mailing address in transactional/marketing email
  footers; swap it for yours.

Sources:
- [Email Templates | Supabase Docs](https://supabase.com/docs/guides/auth/auth-email-templates)
- [Introducing Seven New Email Templates for Supabase Auth](https://supabase.com/blog/introducing-seven-new-email-templates-for-auth)
- [Changes to Email Template Customisation on Free Tier · Changelog](https://supabase.com/changelog/46599-changes-to-email-template-customisation-on-free-tier)

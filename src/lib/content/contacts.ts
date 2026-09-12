export const CONTACTS = {
  email: 'contact@palissage.net',
  mailto: 'mailto:contact@palissage.net',
  xUrl: 'https://x.com/Palissage',
  xHandle: '@Palissage',
} as const;

const recipient = encodeURIComponent(CONTACTS.email);

export const WEBMAIL_LINKS = [
  { label: 'Gmail', href: `https://mail.google.com/mail/?view=cm&fs=1&to=${recipient}` },
  { label: 'Outlook', href: `https://outlook.live.com/mail/0/deeplink/compose?to=${recipient}` },
  { label: 'Yahoo Mail', href: `https://compose.mail.yahoo.com/?to=${recipient}` },
] as const;

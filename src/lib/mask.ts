/** "sarah.adeyemi@example.com" → "s•••@example.com" */
export function maskEmail(email: string): string {
  const [local, domain] = email.trim().split("@");
  if (!local || !domain) return email;
  return `${local[0]}•••@${domain}`;
}

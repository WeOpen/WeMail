const EMAIL_PATTERN = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;

export function formatDisplayEmail(email: string) {
  const value = email.trim();
  const atIndex = value.lastIndexOf("@");
  if (atIndex <= 0 || atIndex === value.length - 1) return value;

  const localPart = value.slice(0, atIndex);
  const domainPart = value.slice(atIndex + 1);
  if (localPart.length <= 18) return value;

  return `${localPart.slice(0, 8)}...${localPart.slice(-7)}@${domainPart}`;
}

export function formatDisplayEmailsInText(value: string) {
  return value.replace(EMAIL_PATTERN, (email) => formatDisplayEmail(email));
}

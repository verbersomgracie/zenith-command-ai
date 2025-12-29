/**
 * Phone number utilities for E.164 normalization
 */

/**
 * Normalize a phone number to E.164 format (digits only)
 * Default country code is Brazil (55)
 */
export function normalizePhoneNumber(phone: string, defaultCountryCode = "55"): string {
  // Remove all non-digit characters
  let digits = phone.replace(/\D/g, "");
  
  if (!digits) return "";
  
  // If starts with +, it was already E.164 format, just keep digits
  if (phone.startsWith("+")) {
    return digits;
  }
  
  // Brazilian number logic
  // If it's 10-11 digits (DDD + number), add country code
  if (digits.length === 10 || digits.length === 11) {
    digits = defaultCountryCode + digits;
  }
  // If it's 8-9 digits (just the number without DDD), we can't reliably add DDD
  // So we'll just add country code and hope for the best
  else if (digits.length === 8 || digits.length === 9) {
    // This is incomplete - ideally we'd prompt for DDD
    digits = defaultCountryCode + digits;
  }
  // If already has country code (starts with 55 and is long enough)
  else if (digits.startsWith("55") && digits.length >= 12) {
    // Already has Brazilian country code
  }
  // If doesn't start with country code but is long enough
  else if (digits.length >= 12 && !digits.startsWith(defaultCountryCode)) {
    // Assume it already has a country code
  }
  
  return digits;
}

/**
 * Format E.164 number for display
 */
export function formatPhoneForDisplay(e164: string): string {
  if (!e164) return "";
  
  // If it's a Brazilian number
  if (e164.startsWith("55") && e164.length >= 12) {
    const countryCode = e164.slice(0, 2);
    const ddd = e164.slice(2, 4);
    const rest = e164.slice(4);
    
    if (rest.length === 9) {
      // Mobile with 9 digit
      return `+${countryCode} (${ddd}) ${rest.slice(0, 5)}-${rest.slice(5)}`;
    } else if (rest.length === 8) {
      // Landline
      return `+${countryCode} (${ddd}) ${rest.slice(0, 4)}-${rest.slice(4)}`;
    }
  }
  
  // Generic formatting for other countries
  return `+${e164}`;
}

/**
 * Check if Contact Picker API is supported
 */
export function isContactPickerSupported(): boolean {
  return 'contacts' in navigator && 'select' in (navigator as any).contacts;
}

/**
 * Pick contacts from device using Contact Picker API
 */
export async function pickContactsFromDevice(): Promise<Array<{ name: string; tel: string[] }>> {
  if (!isContactPickerSupported()) {
    throw new Error("Contact Picker API not supported on this device/browser");
  }
  
  const nav = navigator as any;
  const contacts = await nav.contacts.select(['name', 'tel'], { multiple: true });
  
  return contacts.map((contact: any) => ({
    name: contact.name?.[0] || "Unknown",
    tel: contact.tel || [],
  }));
}

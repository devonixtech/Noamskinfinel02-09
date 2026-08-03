/**
 * Utility functions to clean raw booking notes and format customer names safely.
 */

export const cleanStylistNote = (rawNotes: string | null | undefined): string => {
  if (!rawNotes) return "";
  let cleaned = String(rawNotes);

  // Remove [GUEST: ... ]
  cleaned = cleaned.replace(/\[GUEST:\s*.*?\s*\]/gi, '');

  // Remove [LOYALTY_POINTS_USED: ... ]
  cleaned = cleaned.replace(/\[LOYALTY_POINTS_USED:\s*.*?\s*\]/gi, '');

  // Remove [DEPOSIT_PAID: ... ]
  cleaned = cleaned.replace(/\[DEPOSIT_PAID:\s*.*?\s*\]/gi, '');

  // Remove ITEMS: { ... } or ITEMS: [ ... ]
  cleaned = cleaned.replace(/ITEMS:\s*[\{\[].*?[\}\]]/gs, '');
  cleaned = cleaned.replace(/ITEMS:\s*\{.*?\}/gi, '');

  // Remove Walk-in / Manual Customer headers
  cleaned = cleaned.replace(/(?:Walk-in|Manual Customer):\s*[^|#\n]+(?:\||$)/gi, '');

  // Remove raw JSON objects or arrays
  cleaned = cleaned.replace(/\[?\s*\{(?:\s*"[^"]+"\s*:\s*(?:"[^"]*"|[\d\.]+|true|false|null|\[.*?\]|\{.*?\})\s*,?\s*)+\}\s*\]?/gi, '');

  // If the whole string is JSON, return empty
  const trimmed = cleaned.trim();
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      JSON.parse(trimmed);
      return "";
    } catch (e) {}
  }

  // Remove leading and trailing punctuation, spaces, newlines, pipes
  cleaned = cleaned.replace(/^[\s,;\-\\n|]+|[\s,;\-\\n|]+$/g, '').trim();

  // If string starts with JSON field keys like "type": or "id":, clear it
  if (/^(?:type|id|name|price|quantity|items|service|product)[:"'\s]/i.test(cleaned)) {
    return "";
  }

  return cleaned;
};

export const extractCustomerNameFromNote = (notes: string | null | undefined): string | null => {
  if (!notes) return null;
  const str = String(notes);

  const guestMatch = str.match(/\[GUEST:\s*([^|\]]+)/i);
  if (guestMatch && guestMatch[1].trim() && guestMatch[1].trim().toLowerCase() !== 'undefined') {
    return guestMatch[1].trim();
  }

  const walkInMatch = str.match(/(?:Walk-in|Manual Customer):\s*([^|,#\n]+)/i);
  if (walkInMatch && walkInMatch[1].trim() && walkInMatch[1].trim().toLowerCase() !== 'undefined') {
    return walkInMatch[1].trim();
  }

  return null;
};

export const cleanCustomerDisplayName = (
  name: string | null | undefined,
  notes?: string | null | undefined,
  userEmail?: string | null | undefined
): string => {
  // If notes contain guest name, prioritize extracted guest name
  const extractedFromNotes = extractCustomerNameFromNote(notes);
  if (extractedFromNotes) return extractedFromNotes;

  if (name && typeof name === 'string') {
    // If name is raw JSON or system tag, extract or clean it
    if (name.includes('[GUEST:') || name.includes('Walk-in:') || name.includes('Manual Customer:')) {
      const extractedFromName = extractCustomerNameFromNote(name);
      if (extractedFromName) return extractedFromName;
    }

    if (name.includes('ITEMS:') || name.trim().startsWith('{') || name.trim().startsWith('[')) {
      if (userEmail) return userEmail.split('@')[0];
      return "Guest Customer";
    }

    const trimmed = name.trim();
    if (trimmed && trimmed.toLowerCase() !== 'undefined' && trimmed.toLowerCase() !== 'null') {
      return trimmed;
    }
  }

  if (userEmail) return userEmail.split('@')[0];
  return "Guest Customer";
};

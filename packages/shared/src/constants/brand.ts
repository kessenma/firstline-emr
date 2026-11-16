// packages/shared/src/constants/brand.ts
//
// Single source of truth for the product name and contact address, shared by
// web and mobile.
//
// This module exists because the name used to be written out by hand at every
// call site, and the copies drifted: the footer rendered one address as its
// link text while linking a different one in the href, and the TOTP issuer was
// declared in two files that had to be kept in sync manually. Import from here
// instead of typing the name into a string.

/** Product name as users see it. Short on purpose — it is also the iOS home-screen label. */
export const BRAND_NAME = "Firstline";

/** Primary domain. Subdomains follow the pattern `<service>.firstline.care`. */
export const BRAND_DOMAIN = "firstline.care";

/**
 * Public contact address, used in legal copy and the site footer.
 *
 * TODO(launch): replace with a real, monitored mailbox. This placeholder is
 * deliberately not a valid destination so that shipping it is obvious rather
 * than silently sending patient correspondence into a void.
 */
export const CONTACT_EMAIL = "TODO-SET-CONTACT-EMAIL@firstline.care";

// utils/classNames.ts
/**
 * Utility function to conditionally join CSS class names.
 *
 * @param classes - An array of class names, which can be strings, undefined, or booleans.
 * @returns A string of joined class names, with falsy values filtered out.
 */
export function cn(...classes: (string | undefined | boolean)[]): string {
    return classes.filter(Boolean).join(" ")
}


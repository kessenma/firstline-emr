// components/calls/types.ts
//
// The call wire types and display helpers live in @fajr/shared/calls — web and
// mobile speak the same API, and duplicating the shapes here is how the two
// silently diverge. Re-exported rather than imported directly by every
// component so the existing `./types` imports keep working.
export * from "@fajr/shared/calls";

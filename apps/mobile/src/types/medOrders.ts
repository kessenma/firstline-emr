// apps/mobile/src/types/medOrders.ts
//
// The med order shape is defined once in `@fajr/shared/medications` and shared
// with web, so a field added on one platform cannot go missing on the other.

export type { MedOrder, Medication } from '@fajr/shared/medications';

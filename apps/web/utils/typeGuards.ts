// apps/web/utils/typeGuards.ts
//
// These guards previously tested for `rxNumber` / `medicationName`, fields that
// exist on neither order type, so `isRxOrder` always returned false and every
// prescription rendered down the med-order branch. They now delegate to the
// shared implementation that mobile uses.

export { isRxOrder, isMedOrder } from "@fajr/shared/medications";

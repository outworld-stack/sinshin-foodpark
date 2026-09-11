/**
 * Nominal (branded) types — zero-cost type-level IDs.
 *
 * Works on every TS ≥ 4.x including TypeScript 7 (tsgo).
 * A `UserId` is NOT assignable to an `OrderId` even though both are strings —
 * whole classes of bugs (passing the wrong id into a query) vanish at
 * compile time instead of corrupting data in production.
 *
 * Rule of the codebase: casting happens ONLY at serde boundaries
 * (DB rows in, HTTP responses out) via the `asX()` constructors below.
 */
declare const __brand: unique symbol;

export type Brand<T, B extends string> = T & {
  readonly [__brand]: B;
};

// ── Domain IDs ──────────────────────────────────────────────────────────────
export type UserId = Brand<string, "UserId">;
export type OrderId = Brand<string, "OrderId">;
export type CampaignId = Brand<string, "CampaignId">;
export type ConditionId = Brand<string, "ConditionId">;
export type ProductId = Brand<string, "ProductId">;
export type AddressId = Brand<string, "AddressId">;
export type SessionToken = Brand<string, "SessionToken">;

/** Sanctioned cast points — grep for these to audit every boundary. */
export const asUserId = (v: string): UserId => v as UserId;
export const asOrderId = (v: string): OrderId => v as OrderId;
export const asCampaignId = (v: string): CampaignId => v as CampaignId;
export const asConditionId = (v: string): ConditionId => v as ConditionId;
export const asProductId = (v: string): ProductId => v as ProductId;
export const asAddressId = (v: string): AddressId => v as AddressId;
export const asSessionToken = (v: string): SessionToken =>
  v as SessionToken;
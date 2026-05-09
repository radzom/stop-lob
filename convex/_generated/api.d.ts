/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as auth from "../auth.js";
import type * as challenges from "../challenges.js";
import type * as crons from "../crons.js";
import type * as http from "../http.js";
import type * as lib_auth from "../lib/auth.js";
import type * as playerProfiles from "../playerProfiles.js";
import type * as rankingParticipation from "../rankingParticipation.js";
import type * as rankings from "../rankings.js";
import type * as roles from "../roles.js";
import type * as seed from "../seed.js";
import type * as seedActions from "../seedActions.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  auth: typeof auth;
  challenges: typeof challenges;
  crons: typeof crons;
  http: typeof http;
  "lib/auth": typeof lib_auth;
  playerProfiles: typeof playerProfiles;
  rankingParticipation: typeof rankingParticipation;
  rankings: typeof rankings;
  roles: typeof roles;
  seed: typeof seed;
  seedActions: typeof seedActions;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};

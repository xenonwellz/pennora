import { os } from "@orpc/server";
import type { Session, User } from "better-auth";

export interface ORPCContext {
    headers: Headers;
    user?: User;
    session?: Session;
}

export const base = os.$context<ORPCContext>();

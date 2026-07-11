import { Hono } from "hono";
import { cors } from "hono/cors";
import { RPCHandler } from "@orpc/server/fetch";
import { ORPCError } from "@orpc/server";

import { auth } from "./auth";
import { env, publicConfig, getAllowedOrigins } from "./config";
import { router } from "./orpc/router";

const app = new Hono();

const corsOrigins: string | string[] = getAllowedOrigins();

app.use(
    "/*",
    cors({
        origin: corsOrigins,
        credentials: true,
    }),
);

app.get("/api/config", (c) => c.json(publicConfig()));

app.on(["POST", "GET"], "/api/auth/*", (c) => auth.handler(c.req.raw));

const rpcHandler = new RPCHandler(router);

app.use("/api/rpc/*", async (c, next) => {
    const request = new Proxy(c.req.raw, {
        get(target, prop) {
            if (["json", "text", "formData", "arrayBuffer", "blob"].includes(prop as string)) {
                return () => c.req[prop as "json" | "text" | "formData" | "arrayBuffer" | "blob"]();
            }
            return Reflect.get(target, prop, target);
        },
    });

    let matched = false;
    let response: Response | undefined;

    try {
        const result = await rpcHandler.handle(request, {
            prefix: "/api/rpc",
            context: { headers: c.req.raw.headers },
        });
        matched = result.matched;
        response = result.response;
    } catch (err) {
        console.error("[oRPC] Unhandled error in procedure:", err);
        const error = err instanceof ORPCError
            ? err
            : new ORPCError("INTERNAL_SERVER_ERROR", {
                message: err instanceof Error ? err.message : "Internal server error",
                cause: err,
            });
        const encoded = { status: error.status, message: error.message };
        return c.json({ json: encoded }, { status: 500 });
    }

    if (matched && response) {
        return c.newResponse(response.body, response);
    }

    await next();
});

export default app;

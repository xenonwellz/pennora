import type { RouterClient } from "@orpc/server";
import type { AppRouter } from "@expense/server/orpc/router";
import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";

const link = new RPCLink({
    url: `${window.location.origin}/api/rpc`,
    fetch: (request, init) => fetch(request, { ...init, credentials: "include" }),
});

export const orpc = createORPCClient(link) as RouterClient<AppRouter>;

import { Agent as HttpsAgent } from "node:https";

import { NodeHttpHandler } from "@smithy/node-http-handler";

/**
 * Builds an HTTP handler suitable for long-running Bedrock streaming requests.
 *
 * Why this exists:
 * Node's native fetch (undici) enforces a default body timeout of 5 minutes.
 * Claude Opus 4.7 with extended thinking can stay silent for >5 minutes
 * between chunked stream events, which causes undici to abort the request
 * with `BodyTimeoutError` (UND_ERR_BODY_TIMEOUT).
 *
 * `NodeHttpHandler` uses Node's `http`/`https` modules directly (not undici),
 * and its socket-idle timeout is configurable. We disable it (`socketTimeout: 0`)
 * for streaming workloads, and enable TCP keep-alive packets so any network
 * middlebox keeps the connection open during long idle periods.
 *
 * This is shared across BedrockClient, BedrockRuntimeClient, and SSMClient
 * so the fork stays consistent and bundlers can dedupe the agent code.
 */
export function createLongRunningHttpHandler(): NodeHttpHandler {
  // 30s keepalive matches AWS load balancer recommendations and is well below
  // the typical 60-90s firewall idle timeout that drops silent connections.
  const httpsAgent = new HttpsAgent({
    keepAlive: true,
    keepAliveMsecs: 30_000,
  });

  return new NodeHttpHandler({
    // Disable connection-phase timeout. Default is 0 already, but be explicit.
    connectionTimeout: 0,
    httpsAgent,
    // 0 disables the request timeout entirely (extended thinking can take
    // arbitrarily long).
    requestTimeout: 0,
    // 0 disables the socket idle timeout. This is the critical setting for
    // long-running streams: we never want the client to abort when the model
    // pauses to think.
    socketTimeout: 0,
  });
}

/**
 * Spread this object into AWS SDK client config to use the long-running handler.
 *
 * Replaces the previous `...nodeNativeFetch` spread which used undici under
 * the hood and was subject to its 5-minute body timeout.
 */
export function getLongRunningRequestHandlerConfig(): {
  requestHandler: NodeHttpHandler;
} {
  return { requestHandler: createLongRunningHttpHandler() };
}

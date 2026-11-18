import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
import { Readable } from "node:stream";

const base = (process.env.API_INTERNAL_URL || "http://127.0.0.1:8001").replace(
  /\/$/,
  "",
);

export function publicUpstream(
  path: string,
  options: {
    method?: string;
    headers?: Headers;
    body?: ArrayBuffer;
    timeout?: number;
  } = {},
) {
  const url = new URL(base + path);
  const send = url.protocol === "https:" ? httpsRequest : httpRequest;
  return new Promise<Response>((resolve, reject) => {
    // Node's HTTP client preserves the configured Host on the private hop.
    const upstream = send(
      url,
      {
        method: options.method || "GET",
        headers: options.headers
          ? Object.fromEntries(options.headers)
          : undefined,
        signal: AbortSignal.timeout(options.timeout || 15_000),
      },
      (response) => {
        const headers = new Headers();
        for (const [name, value] of Object.entries(response.headers)) {
          if (Array.isArray(value))
            for (const entry of value) headers.append(name, entry);
          else if (value) headers.set(name, value);
        }
        const status = response.statusCode || 502;
        const noBody =
          options.method === "HEAD" || [204, 205, 304].includes(status);
        if (noBody) response.resume();
        const body = noBody
          ? null
          : (Readable.toWeb(response) as ReadableStream<Uint8Array>);
        resolve(new Response(body, { status, headers }));
      },
    );
    upstream.on("error", reject);
    upstream.end(options.body ? Buffer.from(options.body) : undefined);
  });
}

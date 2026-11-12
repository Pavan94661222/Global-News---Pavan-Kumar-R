/* ============================================================
   GLOBALNEWS | Netlify Functions adapter
   ------------------------------------------------------------
   server.js exposes three handlers written against the plain
   Node http API (req / res). Netlify Functions hand over an
   `event` object instead, so this module fakes the two pieces
   the handlers actually touch:

     - a request that can emit "data" / "end" (body streaming)
     - a response that records the status, headers and body

   Nothing about the handler logic changes; the local server and
   the hosted functions run exactly the same code.
   ============================================================ */

const { EventEmitter } = require("node:events");

class CapturedResponse {
    constructor() {
        this.statusCode = 200;
        this.headers = {};
        this.chunks = [];
    }

    setHeader(name, value) {
        this.headers[String(name).toLowerCase()] = String(value);
    }

    writeHead(statusCode, headers) {
        this.statusCode = statusCode;
        Object.entries(headers || {}).forEach(([name, value]) => this.setHeader(name, value));
        return this;
    }

    end(chunk) {
        if (chunk === undefined || chunk === null) return;
        this.chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)));
    }

    /* Netlify Functions (v1 signature) expect this shape. */
    toResult() {
        return {
            statusCode: this.statusCode,
            headers: this.headers,
            body: Buffer.concat(this.chunks).toString("utf8"),
        };
    }
}

function clientIp(headers) {
    const forwarded = headers["x-nf-client-connection-ip"] || headers["x-forwarded-for"] || "";
    return String(forwarded).split(",")[0].trim() || "unknown";
}

/* Rebuild the original request URL, including the query string, because the
   feed and article handlers read their parameters from it. */
function requestUrlFrom(event) {
    const headers = event.headers || {};
    const host = headers.host || headers.Host || "localhost";
    const query = event.rawQueryString
        ? `?${event.rawQueryString}`
        : `?${new URLSearchParams(event.queryStringParameters || {}).toString()}`;
    return new URL(`${event.path}${query}`, `https://${host}`);
}

function createRequest(event, requestUrl) {
    const request = new EventEmitter();
    const headers = {};
    Object.entries(event.headers || {}).forEach(([name, value]) => {
        headers[String(name).toLowerCase()] = value;
    });

    request.method = event.httpMethod;
    request.url = `${requestUrl.pathname}${requestUrl.search}`;
    request.headers = headers;
    request.socket = { remoteAddress: clientIp(headers) };

    const body = event.isBase64Encoded
        ? Buffer.from(event.body || "", "base64")
        : Buffer.from(event.body || "", "utf8");

    /* Deferred so the handler has finished registering its listeners
       before the body is streamed into it. */
    setImmediate(() => {
        if (body.length) request.emit("data", body);
        request.emit("end");
    });

    return request;
}

/* Run one of the server.js handlers as a Netlify Function.
   `invoke` adapts the handler's own parameter order. */
function runHandler(invoke, event) {
    const requestUrl = requestUrlFrom(event);
    const res = new CapturedResponse();
    return Promise.resolve(invoke(createRequest(event, requestUrl), requestUrl, res))
        .then(() => res.toResult())
        .catch((error) => {
            console.error("[api] handler failed:", error.message);
            return {
                statusCode: 500,
                headers: { "content-type": "application/json; charset=utf-8" },
                body: JSON.stringify({ ok: false, error: "The request could not be completed." }),
            };
        });
}

module.exports = { runHandler, createRequest, CapturedResponse, requestUrlFrom };

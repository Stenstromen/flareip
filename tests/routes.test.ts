import {
  createExecutionContext,
  waitOnExecutionContext,
} from "cloudflare:test";
import { env } from "cloudflare:workers";
import { afterEach, describe, expect, it, vi } from "vitest";
import worker, { handleRequest, type Env } from "../ip_worker";

const IncomingRequest = Request;

function request(
  path: string,
  init: RequestInit = {},
  ip = "203.0.113.10"
): Request {
  const headers = new Headers(init.headers);
  if (!headers.has("cf-connecting-ip")) {
    headers.set("cf-connecting-ip", ip);
  }
  return new IncomingRequest(`https://addr.se${path}`, {
    ...init,
    headers,
  });
}

async function fetchWorker(req: Request): Promise<Response> {
  const ctx = createExecutionContext();
  const response = await worker.fetch(req, env as Env, ctx);
  await waitOnExecutionContext(ctx);
  return response;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("core routes", () => {
  it("GET / returns the connecting IP", async () => {
    const response = await fetchWorker(request("/"));
    expect(response.status).toBe(200);
    expect(await response.text()).toBe("203.0.113.10\n");
  });

  it("GET / falls back to Unknown without cf-connecting-ip", async () => {
    const response = await fetchWorker(
      new IncomingRequest("https://addr.se/")
    );
    expect(await response.text()).toBe("Unknown\n");
  });

  it("GET /agent returns the user agent", async () => {
    const response = await fetchWorker(
      request("/agent", {
        headers: { "user-agent": "curl/8.5.0" },
      })
    );
    expect(await response.text()).toBe("curl/8.5.0\n");
  });

  it("GET /headers echoes request headers", async () => {
    const response = await fetchWorker(
      request("/headers", {
        headers: {
          "user-agent": "vitest",
          "x-test": "yes",
        },
      })
    );
    const body = await response.text();
    expect(body).toContain("user-agent: vitest");
    expect(body).toContain("x-test: yes");
    expect(body).toContain("cf-connecting-ip: 203.0.113.10");
  });

  it("GET /ssl returns TLS fields from request.cf", async () => {
    const req = new IncomingRequest("https://addr.se/ssl", {
      headers: { "cf-connecting-ip": "203.0.113.10" },
      cf: {
        tlsVersion: "TLSv1.3",
        tlsCipher: "AEAD-AES128-GCM-SHA256",
      },
    } as RequestInit);
    const response = await fetchWorker(req);
    expect(await response.text()).toBe(
      "Client-SSL-Protocol: TLSv1.3\nClient-SSL-Cipher: AEAD-AES128-GCM-SHA256\n"
    );
  });

  it("GET /readme lists the documented endpoints", async () => {
    const response = await fetchWorker(request("/readme"));
    const body = await response.text();
    expect(response.status).toBe(200);
    expect(body).toContain("/            - Returns the client's IP address.");
    expect(body).toContain("/bt          - BitTorrent HTTPS tracker IP check");
    expect(body).toContain("/ln/{id}     - Redirects to the URL associated");
  });

  it("unknown paths return 404", async () => {
    const response = await fetchWorker(request("/nope"));
    expect(response.status).toBe(404);
    expect(await response.text()).toBe("Not found\n");
  });
});

describe("/date", () => {
  it("returns plain text for curl", async () => {
    const response = await fetchWorker(
      request("/date", {
        headers: { "user-agent": "curl/8.5.0" },
      })
    );
    expect(response.headers.get("content-type")).toBe("text/plain");
    const body = await response.text();
    expect(body).toContain("Swedish (Europe/Stockholm):");
    expect(body).toContain("UTC:");
    expect(body).toContain("Week number:");
  });

  it("returns HTML for browsers", async () => {
    const response = await fetchWorker(
      request("/date", {
        headers: {
          "user-agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X) Chrome/120.0.0.0",
        },
      })
    );
    expect(response.headers.get("content-type")).toBe("text/html");
    const body = await response.text();
    expect(body).toContain('<div class="week-display">');
    expect(body).toContain("Week number:");
  });
});

describe("/geo", () => {
  it("returns 400 when the client IP is unknown", async () => {
    const response = await fetchWorker(
      new IncomingRequest("https://addr.se/geo")
    );
    expect(response.status).toBe(400);
    expect(await response.text()).toBe("IP Address Unknown");
  });

  it("formats a successful geolocation response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({
          ip: "203.0.113.10",
          location: {
            country_name: "Sweden",
            country_code2: "SE",
            is_eu: true,
            state_prov: "Stockholm",
            state_code: "AB",
            zipcode: "11122",
            country_capital: "Stockholm",
            latitude: "59.3293",
            longitude: "18.0686",
          },
        })
      )
    );

    const response = await handleRequest(request("/geo"), env as Env);
    expect(response.status).toBe(200);
    expect(await response.text()).toBe(
      `IP: 203.0.113.10
Country: Sweden
Country (ISO code): SE
Is EU?: true
State: Stockholm
State Code: AB
Zip Code: 11122
Country Capital: Stockholm
Latitude: 59.3293
Longitude: 18.0686\n`
    );
  });

  it("propagates upstream geo API errors", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("nope", { status: 503 }))
    );

    const response = await handleRequest(request("/geo"), env as Env);
    expect(response.status).toBe(503);
    expect(await response.text()).toBe("Geo API Error");
  });
});

describe("/asn", () => {
  it("parses hackertarget CSV for the connecting IP", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      expect(url).toContain("q=203.0.113.10");
      return new Response(
        '"203.0.113.10","AS123","203.0.113.0/24","Example Org","SE"'
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    const response = await handleRequest(request("/asn"), env as Env);
    expect(await response.text()).toBe(
      `IP: 203.0.113.10
ASN: AS123
CIDR: 203.0.113.0/24
ORG: Example Org
Country: SE\n`
    );
  });

  it("supports ?ip= overrides", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      expect(String(input)).toContain("q=198.51.100.1");
      return new Response(
        '"198.51.100.1","AS999","198.51.100.0/24","Other Org","US"'
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    const response = await handleRequest(
      request("/asn?ip=198.51.100.1"),
      env as Env
    );
    const body = await response.text();
    expect(body).toContain("IP: 198.51.100.1");
    expect(body).toContain("ASN: AS999");
  });
});

describe("/ln short links", () => {
  it("redirects known hex IDs", async () => {
    const response = await fetchWorker(request("/ln/a1b2"));
    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toMatch(
      /^https:\/\/www\.google\.com\/?$/
    );
  });

  it("is case-insensitive for hex IDs", async () => {
    const response = await fetchWorker(request("/ln/A1B2"));
    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toMatch(
      /^https:\/\/www\.google\.com\/?$/
    );
  });

  it("returns 404 for unknown hex IDs", async () => {
    const response = await fetchWorker(request("/ln/dead"));
    expect(response.status).toBe(404);
    expect(await response.text()).toBe("Short URL not found: dead\n");
  });

  it("does not treat non-hex paths as short links", async () => {
    const response = await fetchWorker(request("/ln/zzzz"));
    expect(response.status).toBe(404);
    expect(await response.text()).toBe("Not found\n");
  });
});

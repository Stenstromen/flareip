import {
  createExecutionContext,
  waitOnExecutionContext,
} from "cloudflare:test";
import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import worker, {
  bencode,
  bytesToHex,
  decodeQueryValueToBytes,
  type Env,
} from "../ip_worker";

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

function encodeInfoHashQuery(hex: string): string {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return Array.from(bytes)
    .map((b) => `%${b.toString(16).padStart(2, "0")}`)
    .join("");
}

async function readBodyText(response: Response): Promise<string> {
  return new TextDecoder().decode(await response.arrayBuffer());
}

describe("BitTorrent tracker routes", () => {
  it("serves a bencoded .torrent with the announce URL", async () => {
    const response = await fetchWorker(request("/bt.torrent"));
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe(
      "application/x-bittorrent"
    );
    expect(response.headers.get("content-disposition")).toContain(
      "flareip-ip-check.torrent"
    );

    const body = await readBodyText(response);
    expect(body).toContain("https://addr.se/bt");
    expect(body).toContain("FlareIP BitTorrent IP Check");
  });

  it("redirects browsers on /bt to a stable hash URL", async () => {
    const response = await fetchWorker(
      request("/bt", {
        headers: {
          "user-agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X) Chrome/120.0.0.0",
        },
      })
    );
    expect(response.status).toBe(302);
    const location = response.headers.get("location");
    expect(location).toMatch(/^https:\/\/addr\.se\/bt\?hash=[a-f0-9]{40}$/);
  });

  it("returns a text landing page for curl on /bt", async () => {
    const hash = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
    const response = await fetchWorker(
      request(`/bt?hash=${hash}`, {
        headers: { "user-agent": "curl/8.5.0" },
      })
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/plain");
    const body = await response.text();
    expect(body).toContain("FlareIP BitTorrent IP Check");
    expect(body).toContain(
      `magnet:?xt=urn:btih:${hash}&dn=FlareIP%20BitTorrent%20IP%20Check&tr=https%3A%2F%2Faddr.se%2Fbt`
    );
    expect(body).toContain("Browser IP: 203.0.113.10");
    expect(body).toContain("Torrent client: IP: (none yet)");
  });

  it("returns an HTML landing page for browsers with a hash", async () => {
    const hash = "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
    const response = await fetchWorker(
      request(`/bt?hash=${hash}`, {
        headers: {
          "user-agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X) Chrome/120.0.0.0",
        },
      })
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/html");
    const body = await response.text();
    expect(body).toContain("<h1>BitTorrent IP Check</h1>");
    expect(body).toContain(`urn:btih:${hash}`);
    expect(body).toContain("meta http-equiv=\"refresh\"");
  });

  it("announce replies with a bencoded failure reason containing the IP", async () => {
    const hash = "cccccccccccccccccccccccccccccccccccccccc";
    const infoHash = encodeInfoHashQuery(hash);
    const response = await fetchWorker(
      request(`/bt?info_hash=${infoHash}`, {}, "198.51.100.20")
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");

    const body = await readBodyText(response);
    const expected = decodeUtf8(
      bencode({ "failure reason": "IP: 198.51.100.20" })
    );
    expect(body).toBe(expected);
  });

  it("merges IPv4 and IPv6 announces for the same info hash", async () => {
    const hash = "dddddddddddddddddddddddddddddddddddddddd";
    const infoHash = encodeInfoHashQuery(hash);

    // Seed IPv4 first without waiting on dual-stack empty-record path twice.
    const first = await fetchWorker(
      request(`/bt?info_hash=${infoHash}`, {}, "203.0.113.50")
    );
    expect(await readBodyText(first)).toContain("203.0.113.50");

    const second = await fetchWorker(
      request(`/bt?info_hash=${infoHash}`, {}, "2001:db8::50")
    );
    const secondBody = await readBodyText(second);
    expect(secondBody).toContain("203.0.113.50");
    expect(secondBody).toContain("2001:db8::50");

    const landing = await fetchWorker(
      request(`/bt?hash=${hash}`, {
        headers: { "user-agent": "curl/8.5.0" },
      })
    );
    const landingBody = await landing.text();
    expect(landingBody).toContain("203.0.113.50");
    expect(landingBody).toContain("2001:db8::50");
  });

  it("accepts /bt/announce paths used by some clients", async () => {
    const hash = "eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";
    const infoHash = encodeInfoHashQuery(hash);
    const response = await fetchWorker(
      request(`/bt/announce?info_hash=${infoHash}`, {}, "203.0.113.77")
    );
    expect(await readBodyText(response)).toContain("IP: 203.0.113.77");
  });

  it("round-trips binary info_hash query encoding helpers", () => {
    const hex = "0123456789abcdef0123456789abcdef01234567";
    const encoded = encodeInfoHashQuery(hex);
    expect(bytesToHex(decodeQueryValueToBytes(encoded))).toBe(hex);
  });
});

function decodeUtf8(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes);
}

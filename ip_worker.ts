addEventListener("fetch", (event: FetchEvent) => {
  event.respondWith(handleRequest(event.request));
});

const urlMappings: Record<string, string> = {
  "a1b2": "https://www.google.com",
  "04ac": "https://www.peppoj.net",
  "4e94": "https://www.internetstiftelsen.se",
  "18ec": "https://github.com/Stenstromen/kubectx-edit",
  "dd2a": "https://github.com/Stenstromen"
};

interface GeoData {
  ip: string;
  location: {
    country_name: string;
    country_code2: string;
    is_eu: boolean;
    state_prov: string;
    state_code: string;
    zipcode: string;
    country_capital: string;
    latitude: string;
    longitude: string;
  };
}

interface ASNData {
  ip: string;
  asn: string;
  cidr: string;
  organization: string;
  country: string;
}

interface BtIpRecord {
  ipv4?: string;
  ipv6?: string;
}

type BencodeValue =
  | string
  | number
  | Uint8Array
  | BencodeValue[]
  | { readonly [key: string]: BencodeValue };

const TEXT_BASED_USER_AGENTS = [
  "curl",
  "wget",
  "httpie",
  "lynx",
  "w3m",
  "links",
  "elinks",
  "aria2",
  "PowerShell",
  "python-requests",
  "bot",
  "crawler",
];

const BT_TORRENT_NAME = "FlareIP BitTorrent IP Check";
const BT_PIECE_LENGTH = 16384;
const BT_IP_CACHE_TTL_SECONDS = 600;
const BT_DUALSTACK_WAIT_MS = 800;

/**
 * Respond to the request
 * @param {Request} request
 */
async function handleRequest(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const clientIP = request.headers.get("cf-connecting-ip") || "Unknown";
  const btPath = url.pathname.replace(/\/+$/, "") || "/";

  if (
    btPath === "/bt" ||
    btPath === "/bt/announce" ||
    btPath === "/bt/scrape" ||
    url.pathname === "/bt.torrent"
  ) {
    return handleBitTorrentRequest(request, url, clientIP);
  }

  switch (url.pathname) {
    case "/":
      return new Response(`${clientIP}\n`, { status: 200 });
    case "/agent":
      const userAgent = request.headers.get("user-agent") || "Unknown";
      return new Response(`${userAgent}\n`, { status: 200 });
    case "/geo":
      if (clientIP === "Unknown") {
        return new Response("IP Address Unknown", { status: 400 });
      }
      const geoResponse = await fetch(
        `https://api.ipgeolocation.io/v2/ipgeo?apiKey=${IPGEOLOCATION_KEY}&ip=${clientIP}`
      );
      if (!geoResponse.ok) {
        return new Response("Geo API Error", { status: geoResponse.status });
      }
      const geoData: GeoData = await geoResponse.json();

      const formattedResponse = `IP: ${geoData.ip}
Country: ${geoData.location.country_name}
Country (ISO code): ${geoData.location.country_code2}
Is EU?: ${geoData.location.is_eu}
State: ${geoData.location.state_prov}
State Code: ${geoData.location.state_code}
Zip Code: ${geoData.location.zipcode}
Country Capital: ${geoData.location.country_capital}
Latitude: ${geoData.location.latitude}
Longitude: ${geoData.location.longitude}\n`;

      return new Response(formattedResponse, {
        status: 200,
        headers: { "Content-Type": "text/plain" },
      });

    case "/ssl":
      const response = `Client-SSL-Protocol: ${request.cf?.tlsVersion}
Client-SSL-Cipher: ${request.cf?.tlsCipher}\n`;
      return new Response(response, {
        status: 200,
        headers: { "Content-Type": "text/plain" },
      });

    case "/headers":
      const headers: [string, string][] = [...request.headers];
      const formatHeaders = (headers: [string, string][]): string => {
        return (
          headers.map((header) => `${header[0]}: ${header[1]}`).join("\n") +
          "\n"
        );
      };

      return new Response(formatHeaders(headers), {
        status: 200,
        headers: { "Content-Type": "text/plain" },
      });
    case "/asn":
      const queryParams = new URLSearchParams(url.search);
      const lookupIP = queryParams.get("ip") || clientIP;

      const asnResponse = await fetch(
        `https://api.hackertarget.com/aslookup/?q=${lookupIP}`
      );
      const asnData = await asnResponse.text();
      const asnDataArray: string[] = asnData.split(",");
      const parsedAsnData: ASNData = {
        ip: asnDataArray[0]?.replace(/"/g, "") || "",
        asn: asnDataArray[1]?.replace(/"/g, "") || "",
        cidr: asnDataArray[2]?.replace(/"/g, "") || "",
        organization: asnDataArray[3]?.replace(/"/g, "") || "",
        country: asnDataArray[4]?.replace(/"/g, "") || "",
      };
      const textResponse = `IP: ${parsedAsnData.ip}
ASN: ${parsedAsnData.asn}
CIDR: ${parsedAsnData.cidr}
ORG: ${parsedAsnData.organization}
Country: ${parsedAsnData.country}\n`;
      console.log(textResponse);
      return new Response(textResponse, {
        status: 200,
        headers: { "Content-Type": "text/plain" },
      });
    case "/date":
      const now = new Date();
      const utcTime = now.toISOString();
      const swedishTime = now.toLocaleString("sv-SE", {
        timeZone: "Europe/Stockholm",
      });
      const firstDayOfYear = new Date(now.getFullYear(), 0, 1);
      const pastDaysOfYear =
        (now.getTime() - firstDayOfYear.getTime()) / 86400000;
      const weekNumber = Math.ceil(
        (pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7
      );

      const dateResponse = `Swedish (Europe/Stockholm): ${swedishTime}
UTC: ${utcTime}
Week number: ${weekNumber}\n`;

      const htmlDateResponse = `
      <html>
        <head>
          <style>
            body {
              margin: 0;
              padding: 0;
              display: flex;
              flex-direction: column;
              height: 100vh;
              font-family: sans-serif;
            }
            .week-display {
              flex: 1;
              display: flex;
              justify-content: center;
              align-items: center;
              background-color: #004466;
              color: #66ccff;
              font-size: 20vw;
              font-weight: bold;
            }
            .date-info {
              padding: 10px;
            }
          </style>
        </head>
        <body>
          <div class="week-display">${weekNumber}</div>
          <div class="date-info">
            <p>${dateResponse}</p>
          </div>
        </body>
      </html>`;

      if (isTextBasedUserAgent(request)) {
        return new Response(dateResponse, {
          status: 200,
          headers: { "Content-Type": "text/plain" },
        });
      } else {
        return new Response(htmlDateResponse, {
          status: 200,
          headers: { "Content-Type": "text/html" },
        });
      }

    case "/readme":
      return new Response(
        "/            - Returns the client's IP address.\n" +
          "/agent       - Returns the client's user agent.\n" +
          "/geo         - Returns geolocation data for the client's IP address.\n" +
          "/ssl         - Returns the client's SSL/TLS information.\n" +
          "/headers     - Returns the client's request headers.\n" +
          "/asn         - Returns the client IP's ASN information.\n" +
          "/asn?ip={ip} - Returns the ASN information for the given IP address.\n" +
          "/date        - Returns the current date and time in Swedish and UTC timezones, with week number.\n" +
          "/ln/{id}     - Redirects to the URL associated with the given 4-character hex ID.\n" +
          "/bt          - BitTorrent HTTPS tracker IP check (magnet + tracker status).\n" +
          "/bt.torrent  - Dummy torrent file for the BitTorrent IP check.\n" +
          "/readme      - Returns this readme message.\n",
        { status: 200 }
      );
    default:
      const pathMatch = url.pathname.match(/^\/ln\/([a-f0-9]{1,4})$/i);
      if (pathMatch) {
        const hexId = pathMatch[1]?.toLowerCase() || "";
        const targetUrl = urlMappings[hexId];

        if (targetUrl) {
          return Response.redirect(targetUrl, 302);
        } else {
          return new Response(`Short URL not found: ${hexId}\n`, {
            status: 404,
          });
        }
      }

      return new Response("Not found\n", { status: 404 });
  }
}

function isTextBasedUserAgent(request: Request): boolean {
  const userAgent = request.headers.get("user-agent")?.toLowerCase();
  if (!userAgent) {
    return false;
  }
  return TEXT_BASED_USER_AGENTS.some((agent) =>
    userAgent.includes(agent.toLowerCase())
  );
}

function concatBytes(chunks: Uint8Array[]): Uint8Array {
  let total = 0;
  for (const chunk of chunks) {
    total += chunk.length;
  }
  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.length;
  }
  return out;
}

function bencode(value: BencodeValue): Uint8Array {
  const encoder = new TextEncoder();
  if (typeof value === "string") {
    const bytes = encoder.encode(value);
    return concatBytes([encoder.encode(`${bytes.length}:`), bytes]);
  }
  if (typeof value === "number") {
    return encoder.encode(`i${Math.trunc(value)}e`);
  }
  if (value instanceof Uint8Array) {
    return concatBytes([encoder.encode(`${value.length}:`), value]);
  }
  if (Array.isArray(value)) {
    const parts = [encoder.encode("l")];
    for (const item of value) {
      parts.push(bencode(item));
    }
    parts.push(encoder.encode("e"));
    return concatBytes(parts);
  }
  const keys = Object.keys(value).sort();
  const parts = [encoder.encode("d")];
  for (const key of keys) {
    const item = value[key];
    if (item === undefined) {
      continue;
    }
    parts.push(bencode(key));
    parts.push(bencode(item));
  }
  parts.push(encoder.encode("e"));
  return concatBytes(parts);
}

function bytesToHex(bytes: Uint8Array): string {
  let hex = "";
  for (let i = 0; i < bytes.length; i++) {
    const byte = bytes[i];
    if (byte === undefined) {
      continue;
    }
    hex += byte.toString(16).padStart(2, "0");
  }
  return hex;
}

function randomInfoHashHex(): string {
  const bytes = new Uint8Array(20);
  crypto.getRandomValues(bytes);
  return bytesToHex(bytes);
}

function getRawQueryParam(search: string, name: string): string | null {
  const query = search.startsWith("?") ? search.slice(1) : search;
  if (query.length === 0) {
    return null;
  }
  const parts = query.split("&");
  for (const part of parts) {
    const eq = part.indexOf("=");
    const key = eq === -1 ? part : part.slice(0, eq);
    if (key === name) {
      return eq === -1 ? "" : part.slice(eq + 1);
    }
  }
  return null;
}

function decodeQueryValueToBytes(encoded: string): Uint8Array {
  const bytes: number[] = [];
  for (let i = 0; i < encoded.length; i++) {
    const ch = encoded[i];
    if (ch === undefined) {
      continue;
    }
    if (ch === "%") {
      const hex = encoded.slice(i + 1, i + 3);
      if (/^[0-9a-fA-F]{2}$/.test(hex)) {
        bytes.push(parseInt(hex, 16));
        i += 2;
        continue;
      }
    }
    if (ch === "+") {
      bytes.push(0x20);
      continue;
    }
    bytes.push(encoded.charCodeAt(i));
  }
  return new Uint8Array(bytes);
}

function isIPv6Address(ip: string): boolean {
  return ip.includes(":");
}

function applyBtIp(record: BtIpRecord, ip: string): BtIpRecord {
  if (isIPv6Address(ip)) {
    return { ...record, ipv6: ip };
  }
  return { ...record, ipv4: ip };
}

function formatBtIpMessage(record: BtIpRecord, fallback: string): string {
  const ips: string[] = [];
  if (record.ipv4 !== undefined) {
    ips.push(record.ipv4);
  }
  if (record.ipv6 !== undefined) {
    ips.push(record.ipv6);
  }
  if (ips.length === 0) {
    ips.push(fallback);
  }
  return `IP: ${ips.join(", ")}`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function btIpCacheRequest(origin: string, hexHash: string): Request {
  return new Request(`${origin}/bt/.peer-cache/${hexHash}`, { method: "GET" });
}

async function readBtIpRecord(cacheKey: Request): Promise<BtIpRecord> {
  try {
    const hit = await caches.default.match(cacheKey);
    if (!hit) {
      return {};
    }
    return (await hit.json()) as BtIpRecord;
  } catch {
    return {};
  }
}

async function writeBtIpRecord(
  cacheKey: Request,
  record: BtIpRecord
): Promise<void> {
  await caches.default.put(
    cacheKey,
    new Response(JSON.stringify(record), {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": `public, max-age=${BT_IP_CACHE_TTL_SECONDS}`,
      },
    })
  );
}

async function mergeBtClientIp(
  cacheKey: Request,
  clientIP: string
): Promise<BtIpRecord> {
  let record = await readBtIpRecord(cacheKey);
  const wasEmpty = record.ipv4 === undefined && record.ipv6 === undefined;
  record = applyBtIp(record, clientIP);
  await writeBtIpRecord(cacheKey, record);

  if (wasEmpty && (record.ipv4 === undefined || record.ipv6 === undefined)) {
    await sleep(BT_DUALSTACK_WAIT_MS);
    const stored = await readBtIpRecord(cacheKey);
    record = applyBtIp(stored, clientIP);
    await writeBtIpRecord(cacheKey, record);
  }

  return record;
}

function trackerFailureResponse(message: string): Response {
  return new Response(bencode({ "failure reason": message }), {
    status: 200,
    headers: {
      "Content-Type": "text/plain",
      "Cache-Control": "no-store",
    },
  });
}

function btAnnounceUrl(url: URL): string {
  return `${url.protocol}//${url.host}/bt`;
}

function buildMagnet(infoHashHex: string, url: URL): string {
  const displayName = encodeURIComponent(BT_TORRENT_NAME);
  const tracker = encodeURIComponent(btAnnounceUrl(url));
  return `magnet:?xt=urn:btih:${infoHashHex}&dn=${displayName}&tr=${tracker}`;
}

function staticTorrentInfo(): { readonly [key: string]: BencodeValue } {
  return {
    length: BT_PIECE_LENGTH,
    name: BT_TORRENT_NAME,
    "piece length": BT_PIECE_LENGTH,
    pieces: new Uint8Array(20),
    private: 1,
  };
}

function serveBtTorrent(url: URL): Response {
  const body = bencode({
    announce: btAnnounceUrl(url),
    comment:
      "Dummy torrent used to print the IP address your BitTorrent client announces from.",
    info: staticTorrentInfo(),
  });
  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "application/x-bittorrent",
      "Content-Disposition": 'attachment; filename="flareip-ip-check.torrent"',
      "Cache-Control": "no-store",
    },
  });
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function btLandingText(
  pageUrl: string,
  magnet: string,
  torrentUrl: string,
  record: BtIpRecord,
  browserIP: string
): string {
  return `FlareIP BitTorrent IP Check

Add the magnet link to your BitTorrent client, then check the tracker status.
The tracker replies with a failure reason in the form:
IP: <ipv4>, <ipv6>

Page: ${pageUrl}
Magnet: ${magnet}
Torrent: ${torrentUrl}

Browser IP: ${browserIP}
Torrent client: ${formatBtIpMessage(record, "(none yet)")}
`;
}

function btLandingHtml(
  pageUrl: string,
  magnet: string,
  torrentUrl: string,
  record: BtIpRecord,
  browserIP: string
): string {
  const hasClientIp = record.ipv4 !== undefined || record.ipv6 !== undefined;
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    ${hasClientIp ? "" : '<meta http-equiv="refresh" content="5">'}
    <title>FlareIP BitTorrent IP Check</title>
    <style>
      body {
        margin: 0;
        padding: 1.5rem;
        font-family: sans-serif;
        line-height: 1.5;
        max-width: 52rem;
      }
      code, .magnet {
        word-break: break-all;
      }
      .ip {
        font-size: 1.4rem;
        font-weight: bold;
      }
    </style>
  </head>
  <body>
    <h1>BitTorrent IP Check</h1>
    <p>
      This is an HTTPS BitTorrent tracker, not the peer-to-peer wire protocol.
      Add the magnet (or torrent) to your client and open the trackers tab.
      The status will show a failure message like
      <code>IP: 203.0.113.1, 2001:db8::1</code>.
    </p>
    <p class="ip">Torrent client: ${escapeHtml(
      formatBtIpMessage(record, "(waiting for announce)")
    )}</p>
    <p>Browser IP: ${escapeHtml(browserIP)}</p>
    <p>
      <a href="${escapeHtml(magnet)}">Add magnet link</a>
      ·
      <a href="${escapeHtml(torrentUrl)}">Download .torrent</a>
      ·
      <a href="${escapeHtml(pageUrl)}">Refresh</a>
    </p>
    <p class="magnet"><code>${escapeHtml(magnet)}</code></p>
    <p>
      Dual-stack clients announce once over IPv4 and once over IPv6.
      If only one address appears, force a reannounce in your client.
      The magnet is unique to this page; the .torrent file is a shared dummy
      whose IP is visible in the client tracker status.
    </p>
  </body>
</html>`;
}

async function handleBtAnnounce(
  url: URL,
  rawInfoHash: string,
  clientIP: string
): Promise<Response> {
  const hexHash = bytesToHex(decodeQueryValueToBytes(rawInfoHash));
  let record = applyBtIp({}, clientIP);

  if (/^[a-f0-9]{40}$/.test(hexHash)) {
    try {
      record = await mergeBtClientIp(
        btIpCacheRequest(url.origin, hexHash),
        clientIP
      );
    } catch {
      record = applyBtIp({}, clientIP);
    }
  }

  return trackerFailureResponse(formatBtIpMessage(record, clientIP));
}

async function handleBitTorrentRequest(
  request: Request,
  url: URL,
  clientIP: string
): Promise<Response> {
  const rawInfoHash = getRawQueryParam(url.search, "info_hash");
  if (rawInfoHash !== null) {
    return handleBtAnnounce(url, rawInfoHash, clientIP);
  }

  if (url.pathname === "/bt.torrent") {
    return serveBtTorrent(url);
  }

  const hashParam = url.searchParams.get("hash");
  const hash =
    hashParam !== null && /^[a-fA-F0-9]{40}$/.test(hashParam)
      ? hashParam.toLowerCase()
      : randomInfoHashHex();
  const pageUrl = `${url.protocol}//${url.host}/bt?hash=${hash}`;
  const magnet = buildMagnet(hash, url);
  const torrentUrl = `${url.protocol}//${url.host}/bt.torrent`;

  if (!isTextBasedUserAgent(request) && hashParam?.toLowerCase() !== hash) {
    return Response.redirect(pageUrl, 302);
  }

  const record = await readBtIpRecord(btIpCacheRequest(url.origin, hash));

  if (isTextBasedUserAgent(request)) {
    return new Response(
      btLandingText(pageUrl, magnet, torrentUrl, record, clientIP),
      {
        status: 200,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      }
    );
  }

  return new Response(
    btLandingHtml(pageUrl, magnet, torrentUrl, record, clientIP),
    {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    }
  );
}

declare const IPGEOLOCATION_KEY: string;

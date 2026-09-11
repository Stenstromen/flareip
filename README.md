# FlareIP

![FlareIP Logo](flareip.webp)

A powerful Cloudflare Worker that provides detailed information about client connections, IP geolocation, ASN details, and more.

## Table of Contents

- [FlareIP](#flareip)
  - [Table of Contents](#table-of-contents)
  - [Features](#features)
  - [API Endpoints](#api-endpoints)
  - [URL Shortening](#url-shortening)
    - [Usage Examples](#usage-examples)
    - [Managing Short URLs](#managing-short-urls)
  - [Prerequisites](#prerequisites)
  - [Environment Variables](#environment-variables)
  - [Installation](#installation)
  - [Development](#development)
  - [Tech Stack](#tech-stack)

## Features

- 🌍 IP Geolocation data
- 🔒 SSL/TLS connection details
- 📋 Request headers inspection
- 🌐 ASN (Autonomous System Number) lookup
- ⏰ Timezone information
- 🔍 User agent details
- 🔗 URL shortening service with 4-character hex IDs
- 🧲 BitTorrent tracker IP check (IPv4 and IPv6)

## API Endpoints

| Endpoint       | Description                                                                                                             |
| -------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `/`            | Returns the client's IP address                                                                                         |
| `/agent`       | Returns the client's user agent string                                                                                  |
| `/geo`         | Provides detailed geolocation data including country, state, coordinates, and ISP information                           |
| `/ssl`         | Shows the client's SSL/TLS protocol version and cipher                                                                  |
| `/headers`     | Lists all request headers sent by the client                                                                            |
| `/asn`         | Returns ASN information for the client's IP                                                                             |
| `/asn?ip={ip}` | Looks up ASN information for a specific IP address                                                                      |
| `/date`        | Shows current time in Swedish and UTC timezones with week number (html and text, text only if user-agent is text-based) |
| `/ln/{id}`     | Redirects to the URL associated with the given 4-character hex ID (URL shortening service)                             |
| `/bt`          | BitTorrent HTTPS tracker IP check. Add the magnet to your client; tracker status shows `IP: <ipv4>, <ipv6>`            |
| `/bt.torrent`  | Dummy torrent file for the same IP check                                                                               |
| `/readme`      | Displays API documentation                                                                                              |

## URL Shortening

The service includes a built-in URL shortening feature that uses 4-character hexadecimal IDs. Short URLs follow the pattern `/ln/{id}` where `{id}` is a 1-4 character hex string (0-9, a-f).

### Usage Examples

- `/ln/a1b2` → Redirects to Google
- `/ln/04ac` → Redirects to peppoj.net

### Managing Short URLs

URL mappings are configured in the `urlMappings` constant within the worker code. To add new short URLs:

1. Use the provided utility script to generate unique hex IDs:

   ```bash
   node generate_hex_id.js https://example.com
   ```

2. Copy the generated mapping to the `urlMappings` constant in `ip_worker.ts`

3. Redeploy the worker

The system supports up to 65,536 unique short URLs (hex range 0000-ffff).

## BitTorrent IP Check

`/bt` is an HTTPS [BitTorrent tracker](https://www.bittorrent.org/beps/bep_0003.html) (HTTP GET + bencoded response), the same approach used by whatismyip.net and ipMagnet. It is not the peer-to-peer wire protocol, and UDP trackers are not supported on Cloudflare Workers.

1. Open `/bt` and add the magnet link to your BitTorrent client (or download `/bt.torrent`).
2. In the client, open the torrent's trackers tab. The tracker replies with a failure reason such as `IP: 203.0.113.1, 2001:db8::1`.
3. Dual-stack clients announce once over IPv4 and once over IPv6. If only one address appears, force a reannounce.

The magnet on `/bt` is unique to that page so the browser view can show the same addresses. `/bt.torrent` is a shared dummy file; use the client's tracker status for that path.

## Prerequisites

- Node.js
- Cloudflare account
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/) (Cloudflare Workers CLI)

## Environment Variables

The following environment variables are required:

- `IPGEOLOCATION_KEY`: API key for ipgeolocation.io service

## Installation

```bash
# Clone the repository
git clone https://github.com/stenstromen/flareip.git

# Install dependencies
npm install
```

## Development

```bash
# Run locally
npm run dev

# Build the project
npm run build

# Deploy to Cloudflare Workers
npm run deploy
```

## Tech Stack

- TypeScript
- Cloudflare Workers
- External APIs:
  - ipgeolocation.io (for geolocation data)
  - hackertarget.com (for ASN lookup)

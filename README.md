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

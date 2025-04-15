# FlareIP

![FlareIP Logo](flareip.webp)

A powerful Cloudflare Worker that provides detailed information about client connections, IP geolocation, ASN details, and more.

## Table of Contents

- [FlareIP](#flareip)
  - [Table of Contents](#table-of-contents)
  - [Features](#features)
  - [API Endpoints](#api-endpoints)
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

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `/` | Returns the client's IP address |
| `/agent` | Returns the client's user agent string |
| `/geo` | Provides detailed geolocation data including country, state, coordinates, and ISP information |
| `/ssl` | Shows the client's SSL/TLS protocol version and cipher |
| `/headers` | Lists all request headers sent by the client |
| `/asn` | Returns ASN information for the client's IP |
| `/asn?ip={ip}` | Looks up ASN information for a specific IP address |
| `/date` | Shows current time in Swedish and UTC timezones with week number |
| `/readme` | Displays API documentation |

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

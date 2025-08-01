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

/**
 * Respond to the request
 * @param {Request} request
 */
async function handleRequest(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const clientIP = request.headers.get("cf-connecting-ip") || "Unknown";

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

      const textBasedUserAgents = [
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

      if (
        textBasedUserAgents.some((agent) =>
          request.headers
            .get("user-agent")
            ?.toLowerCase()
            .includes(agent.toLowerCase())
        )
      ) {
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

declare const IPGEOLOCATION_KEY: string;

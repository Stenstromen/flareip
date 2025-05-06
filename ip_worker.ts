addEventListener("fetch", (event: FetchEvent) => {
  event.respondWith(handleRequest(event.request));
});

interface GeoData {
  ip: string;
  country_name: string;
  country_code2: string;
  is_eu: boolean;
  state_prov: string;
  state_code: string;
  zipcode: string;
  country_capital: string;
  latitude: string;
  longitude: string;
  isp: string;
  time_zone: {
    name: string;
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
Country: ${geoData.country_name}
Country (ISO code): ${geoData.country_code2}
Is EU?: ${geoData.is_eu}
State: ${geoData.state_prov}
State Code: ${geoData.state_code}
Zip Code: ${geoData.zipcode}
Country Capital: ${geoData.country_capital}
Latitude: ${geoData.latitude}
Longitude: ${geoData.longitude}
ISP: ${geoData.isp}
Timezone: ${geoData.time_zone.name}\n`;

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
      const lookupIP = queryParams.get('ip') || clientIP;
      

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
      const swedishTime = now.toLocaleString('sv-SE', { timeZone: 'Europe/Stockholm' });
      const firstDayOfYear = new Date(now.getFullYear(), 0, 1);
      const pastDaysOfYear = (now.getTime() - firstDayOfYear.getTime()) / 86400000;
      const weekNumber = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
      
      const dateResponse = `Swedish (Europe/Stockholm): ${swedishTime}
UTC: ${utcTime}
Week number: ${weekNumber}\n`;

      return new Response(dateResponse, {
        status: 200,
        headers: { "Content-Type": "text/plain" },
      });
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
          "/readme      - Returns this readme message.\n",
        { status: 200 }
      );
    default:
      return new Response("Not found\n", { status: 404 });
  }
}

declare const IPGEOLOCATION_KEY: string;

addEventListener("fetch", (event: FetchEvent) => {
  event.respondWith(handleRequest(event.request));
});

/**
 * Respond to the request
 * @param {Request} request
 */
async function handleRequest(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const clientIP = request.headers.get("cf-connecting-ip") || "Unknown";
  const userAgent = request.headers.get("user-agent") || "Unknown";

  switch (url.pathname) {
    case "/":
      return new Response(clientIP + "\n", { status: 200 });
    case "/agent":
      return new Response(userAgent + "\n", { status: 200 });
    case "/readme":
      return new Response(
          "/       - Returns the client's IP address.\n" +
          "/agent  - Returns the client's user agent.\n" +
          "/readme - Returns this readme message.\n",
        { status: 200 }
      );
    default:
      return new Response("Not found\n", { status: 404 });
  }
}

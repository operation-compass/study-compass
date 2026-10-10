export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "GET" && (url.pathname === "/" || url.pathname === "/index.html")) {
      const homeUrl = new URL("/home-v2.html", url.origin);
      const homeRequest = new Request(homeUrl.toString(), request);
      return env.ASSETS.fetch(homeRequest);
    }

    return env.ASSETS.fetch(request);
  }
};
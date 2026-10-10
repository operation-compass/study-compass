export default {
  async fetch(request, env) {
    const response = await env.ASSETS.fetch(request);
    const url = new URL(request.url);

    if (
      request.method !== "GET" ||
      (url.pathname !== "/" && url.pathname !== "/index.html") ||
      !response.headers.get("content-type")?.includes("text/html")
    ) {
      return response;
    }

    return new HTMLRewriter()
      .on("body", {
        element(element) {
          element.prepend(
            '<a href="/beta.html" aria-label="β学習メニューを開く" style="position:fixed;right:14px;bottom:18px;z-index:99999;text-decoration:none;background:#78e0c2;color:#09101c;font:800 13px/1 -apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;padding:12px 14px;border-radius:999px;box-shadow:0 8px 24px rgba(0,0,0,.28)">β学習</a>',
            { html: true }
          );
        }
      })
      .transform(response);
  }
};
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
            '<a href="/beta.html" aria-label="β学習メニューを開く" style="position:fixed;right:14px;bottom:18px;z-index:99999;text-decoration:none;background:linear-gradient(135deg,#1769ff,#31d7ff);color:#00101b;font:800 13px/1 -apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;padding:12px 14px;border-radius:999px;border:1px solid rgba(204,219,224,.55);box-shadow:0 0 22px rgba(0,168,255,.42),0 8px 24px rgba(0,0,0,.32)">β学習</a>',
            { html: true }
          );
        }
      })
      .transform(response);
  }
};
function renderWordwallActivity(container, breadcrumbText, embedUrl) {
  container.innerHTML = "";

  var wrap = document.createElement("div");
  wrap.className = "ww-wrap";

  var iframe = document.createElement("iframe");
  iframe.className = "ww-iframe";
  iframe.src = embedUrl;
  iframe.setAttribute("frameborder", "0");
  iframe.setAttribute("allowfullscreen", "true");
  wrap.appendChild(iframe);

  container.appendChild(wrap);
}

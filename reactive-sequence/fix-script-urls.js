// Note: this code just hijacks any `node_modules` script URLs and
// remaps them to external https:// equivalents, if this page is
// loaded in an http/https instead of file context.

(function IIFE(){

	var scripts = document.getElementsByTagName("script"),
		curScript = scripts[scripts.length - 1], src,
		scriptURLs = curScript.getAttribute("data-srcs").split(/\s+/),
		remoteURLNeeded = /^https?:\/\//.test(document.location.href.toString());

	for (var i=0; i<scriptURLs.length; i++) {
		src = scriptURLs[i];
		if (src) {
			try {
				if (remoteURLNeeded && /\/node_modules\//.test(src)) {
					src = src.replace(/^.*\/node_modules\/([^\/]+)\//,"https://unpkg.com/$1@latest/");
				}
				document.write("<sc" + "ript src=\"" + src + "\"></scr" + "ipt>");
			} catch (err) {}
		}
	}

})();

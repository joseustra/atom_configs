(function() {
  var cheerio, configureMathJax, path;

  cheerio = require('cheerio');

  path = require('path');

  module.exports = {
    loadMathJax: function() {
      var mathjaxPath, script;
      script = document.createElement("script");
      script.addEventListener("load", function() {
        return configureMathJax();
      });
      script.type = "text/javascript";
      try {
        mathjaxPath = atom.packages.getLoadedPackage('mathjax-wrapper');
        script.src = path.join(mathjaxPath.path, "node_modules/MathJax/MathJax.js?delayStartupUntil=configured");
        document.getElementsByTagName("head")[0].appendChild(script);
      } finally {
        return;
      }
    },
    mathProcessor: function(domElements) {
      if (typeof MathJax !== "undefined" && MathJax !== null) {
        MathJax.Hub.Queue(["Typeset", MathJax.Hub, domElements]);
      }
    }
  };

  configureMathJax = function() {
    MathJax.Hub.Config({
      jax: ["input/TeX", "output/HTML-CSS"],
      extensions: [],
      TeX: {
        extensions: ["AMSmath.js", "AMSsymbols.js", "noErrors.js", "noUndefined.js"]
      },
      messageStyle: "none",
      showMathMenu: false
    });
    MathJax.Hub.Configured();
  };

}).call(this);

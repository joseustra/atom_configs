(function() {
  "use strict";
  var MathJaxHelper, UpdatePreview, WrappedDomTree;

  WrappedDomTree = require('./wrapped-dom-tree');

  MathJaxHelper = require('./mathjax-helper');

  module.exports = UpdatePreview = (function() {
    function UpdatePreview(dom) {
      this.tree = new WrappedDomTree(dom, true);
      this.htmlStr = "";
    }

    UpdatePreview.prototype.update = function(htmlStr, renderLaTeX) {
      var firstTime, newDom, newTree, r;
      if (htmlStr === this.htmlStr) {
        return;
      }
      firstTime = this.htmlStr === "";
      this.htmlStr = htmlStr;
      newDom = document.createElement("div");
      newDom.className = "update-preview";
      newDom.innerHTML = htmlStr;
      newTree = new WrappedDomTree(newDom);
      r = this.tree.diffTo(newTree);
      newTree.removeSelf();
      if (firstTime) {
        r.possibleReplace = null;
        r.last = null;
      }
      if (renderLaTeX) {
        r.inserted = r.inserted.map(function(elm) {
          while (elm && !elm.innerHTML) {
            elm = elm.parentElement;
          }
          return elm;
        });
        r.inserted = r.inserted.filter(function(elm) {
          return !!elm;
        });
        MathJaxHelper.mathProcessor(r.inserted);
      }
      return r;
    };

    return UpdatePreview;

  })();

}).call(this);

(function() {
  var $, File, ScrollView, Task, View, WebBrowserPreviewView, http, url, _ref,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  _ref = require('atom'), $ = _ref.$, ScrollView = _ref.ScrollView, View = _ref.View, Task = _ref.Task, File = _ref.File;

  url = require("url");

  http = require("http");

  WebBrowserPreviewView = (function(_super) {
    __extends(WebBrowserPreviewView, _super);

    function WebBrowserPreviewView() {
      return WebBrowserPreviewView.__super__.constructor.apply(this, arguments);
    }

    WebBrowserPreviewView.content = function(params) {
      return this.iframe({
        outlet: "frame",
        "class": "iphone",
        src: params.url,
        sandbox: "none"
      });
    };

    WebBrowserPreviewView.prototype.getTitle = function() {
      return "Ionic: Preview";
    };

    WebBrowserPreviewView.prototype.initialize = function(params) {
      var me;
      me = $(this);
      this.url = params.url;
      return this.on('load', function() {
        return $(window).on('resize', function() {
          var height, _ref1;
          height = (_ref1 = me[0].parentNode) != null ? _ref1.scrollHeight : void 0;
          if ((height != null) && height < me.height()) {
            return me.css("transform", "scale(" + ((height - 100) / me.height()) + ")");
          } else {
            return me.css("transform", "none");
          }
        });
      });
    };

    WebBrowserPreviewView.prototype.go = function() {
      var height, me, _ref1;
      me = $(this);
      this.src = this.url;
      height = (_ref1 = me[0].parentNode) != null ? _ref1.scrollHeight : void 0;
      if ((height != null) && height < me.height()) {
        me.css("transform", "scale(" + ((height - 100) / me.height()) + ")");
      } else {
        me.css("transform", "none");
      }
      return me.css("display", "block");
    };

    return WebBrowserPreviewView;

  })(ScrollView);

  module.exports = {
    activate: function() {
      atom.workspaceView.command("ionic:preview", (function(_this) {
        return function() {
          return atom.workspace.open("ionic://localhost:8100", {
            split: "right"
          });
        };
      })(this));
      return atom.workspace.registerOpener(function(uri) {
        var host, pathname, preview, protocol, _ref1;
        try {
          _ref1 = url.parse(uri), protocol = _ref1.protocol, host = _ref1.host, pathname = _ref1.pathname;
        } catch (_error) {
          return;
        }
        if (protocol !== "ionic:") {
          return;
        }
        uri = url.parse(uri);
        uri.protocol = "http:";
        preview = new WebBrowserPreviewView({
          url: uri.format()
        });
        http.get(uri.format(), function() {
          preview.go();
          return atom.workspace.activateNextPane();
        }).on('error', function() {
          atom.workspace.destroyActivePaneItem();
          return alert("You have to start the ionic server first!");
        });
        return preview;
      });
    }
  };

}).call(this);

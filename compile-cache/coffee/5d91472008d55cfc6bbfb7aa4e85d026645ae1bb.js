(function() {
  var AlertView, TextEditorView, View,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  View = require('space-pen').View;

  TextEditorView = require('atom-space-pen-views').TextEditorView;

  module.exports = AlertView = (function(_super) {
    __extends(AlertView, _super);

    function AlertView() {
      return AlertView.__super__.constructor.apply(this, arguments);
    }

    AlertView.content = function(message) {
      return this.div((function(_this) {
        return function() {
          return _this.div(message);
        };
      })(this));
    };

    return AlertView;

  })(View);

}).call(this);

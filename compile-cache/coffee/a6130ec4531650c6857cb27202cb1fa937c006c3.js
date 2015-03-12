(function() {
  var InputView, TextEditorView, View,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  View = require('space-pen').View;

  TextEditorView = require('atom-space-pen-views').TextEditorView;

  module.exports = InputView = (function(_super) {
    __extends(InputView, _super);

    function InputView() {
      return InputView.__super__.constructor.apply(this, arguments);
    }

    InputView.content = function(label) {
      return this.div((function(_this) {
        return function() {
          _this.div(label);
          return _this.subview('miniEditor', new TextEditorView({
            mini: true
          }));
        };
      })(this));
    };

    return InputView;

  })(View);

}).call(this);

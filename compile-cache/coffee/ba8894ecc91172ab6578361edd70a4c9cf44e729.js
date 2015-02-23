(function() {
  var PomodoroView, View,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  View = require('atom').View;

  module.exports = PomodoroView = (function(_super) {
    __extends(PomodoroView, _super);

    function PomodoroView() {
      this.update = __bind(this.update, this);
      return PomodoroView.__super__.constructor.apply(this, arguments);
    }

    PomodoroView.content = function() {
      return this.div({
        "class": "pomodoro inline-block"
      }, (function(_this) {
        return function() {
          _this.span({
            style: "color: red"
          }, "" + (String.fromCharCode(10086)) + " ");
          return _this.span({
            outlet: 'statusText'
          });
        };
      })(this));
    };

    PomodoroView.prototype.initialize = function(timer) {
      return timer.setUpdateCallback(this.update);
    };

    PomodoroView.prototype.destroy = function() {
      return this.detach();
    };

    PomodoroView.prototype.update = function(status) {
      return this.statusText.text(status);
    };

    return PomodoroView;

  })(View);

}).call(this);

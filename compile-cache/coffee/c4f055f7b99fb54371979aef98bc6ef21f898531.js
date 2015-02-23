(function() {
  var PomodoroTimer, events,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  events = require('events');

  module.exports = PomodoroTimer = (function(_super) {
    var TIME;

    __extends(PomodoroTimer, _super);

    TIME = 25 * 60 * 1000;

    function PomodoroTimer() {
      this.ticktack = new Audio(require("../resources/ticktack").data());
      this.bell = new Audio(require("../resources/bell").data());
      this.ticktack.loop = true;
    }

    PomodoroTimer.prototype.start = function() {
      if (atom.config.get("pomodoro.playSounds")) {
        this.ticktack.play();
      }
      this.startTime = new Date();
      return this.timer = setInterval(((function(_this) {
        return function() {
          return _this.step();
        };
      })(this)), 1000);
    };

    PomodoroTimer.prototype.abort = function() {
      this.status = "aborted (" + (new Date()) + ")";
      return this.stop();
    };

    PomodoroTimer.prototype.finish = function() {
      this.status = "finished (" + (new Date()) + ")";
      this.stop();
      if (atom.config.get("pomodoro.playSounds")) {
        return this.bell.play();
      }
    };

    PomodoroTimer.prototype.stop = function() {
      this.ticktack.pause();
      clearTimeout(this.timer);
      return this.updateCallback(this.status);
    };

    PomodoroTimer.prototype.step = function() {
      var min, sec, time;
      time = (TIME - (new Date() - this.startTime)) / 1000;
      if (time <= 0) {
        return this.emit('finished');
      } else {
        min = this.zeroPadding(Math.floor(time / 60));
        sec = this.zeroPadding(Math.floor(time % 60));
        this.status = "" + min + ":" + sec;
        return this.updateCallback(this.status);
      }
    };

    PomodoroTimer.prototype.zeroPadding = function(num) {
      return ("0" + num).slice(-2);
    };

    PomodoroTimer.prototype.setUpdateCallback = function(fn) {
      return this.updateCallback = fn;
    };

    return PomodoroTimer;

  })(events.EventEmitter);

}).call(this);

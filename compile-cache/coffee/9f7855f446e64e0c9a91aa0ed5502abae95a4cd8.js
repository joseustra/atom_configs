(function() {
  var PomodoroTimer, PomodoroView, child, exec, _ref;

  _ref = require('child_process'), exec = _ref.exec, child = _ref.child;

  PomodoroTimer = require('./pomodoro-timer');

  PomodoroView = require('./pomodoro-view');

  module.exports = {
    configDefaults: {
      pathToExecuteWithTimerStart: "",
      pathToExecuteWithTimerAbort: "",
      pathToExecuteWithTimerFinish: "",
      playSounds: true
    },
    activate: function() {
      atom.workspaceView.command("pomodoro:start", (function(_this) {
        return function() {
          return _this.start();
        };
      })(this));
      atom.workspaceView.command("pomodoro:abort", (function(_this) {
        return function() {
          return _this.abort();
        };
      })(this));
      this.timer = new PomodoroTimer();
      this.view = new PomodoroView(this.timer);
      this.timer.on('finished', (function(_this) {
        return function() {
          return _this.finish();
        };
      })(this));
      return atom.workspaceView.statusBar.prependRight(this.view);
    },
    start: function() {
      console.log("pomodoro: start");
      this.timer.start();
      return this.exec(atom.config.get("pomodoro.pathToExecuteWithTimerStart"));
    },
    abort: function() {
      console.log("pomodoro: abort");
      this.timer.abort();
      return this.exec(atom.config.get("pomodoro.pathToExecuteWithTimerAbort"));
    },
    finish: function() {
      console.log("pomodoro: finish");
      this.timer.finish();
      return this.exec(atom.config.get("pomodoro.pathToExecuteWithTimerFinish"));
    },
    exec: function(path) {
      if (path) {
        return exec(path, function(err, stdout, stderr) {
          if (stderr) {
            console.log(stderr);
          }
          return console.log(stdout);
        });
      }
    },
    deactivate: function() {
      var _ref1;
      if ((_ref1 = this.view) != null) {
        _ref1.destroy();
      }
      return this.view = null;
    }
  };

}).call(this);

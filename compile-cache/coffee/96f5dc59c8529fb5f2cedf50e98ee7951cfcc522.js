(function() {
  var BufferedProcess, Executor, fs, spawnSync,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

  spawnSync = require('child_process').spawnSync;

  BufferedProcess = require('atom').BufferedProcess;

  fs = require('fs-plus');

  module.exports = Executor = (function() {
    function Executor(environment) {
      this.exec = __bind(this.exec, this);
      this.execSync = __bind(this.execSync, this);
      this.environment = environment;
    }

    Executor.prototype.execSync = function(command, cwd, env, args, input) {
      var done, message, options, result;
      if (input == null) {
        input = null;
      }
      options = {
        cwd: null,
        env: null,
        encoding: 'utf8'
      };
      if ((cwd != null) && cwd !== '' && cwd !== false && fs.existsSync(cwd)) {
        options.cwd = fs.realpathSync(cwd);
      }
      options.env = env != null ? env : this.environment;
      if (input) {
        options.input = input;
      }
      if (args == null) {
        args = [];
      }
      done = spawnSync(command, args, options);
      result = {
        code: done.status,
        stdout: (done != null ? done.stdout : void 0) != null ? done.stdout : '',
        stderr: (done != null ? done.stderr : void 0) != null ? done.stderr : '',
        messages: []
      };
      if (done.error != null) {
        if (done.error.code === 'ENOENT') {
          message = {
            line: false,
            column: false,
            msg: 'No file or directory: [' + command + ']',
            type: 'error',
            source: 'executor'
          };
          result.messages.push(message);
          result.code = 127;
        } else {
          console.log('Error: ' + done.error);
        }
      }
      return result;
    };

    Executor.prototype.exec = function(command, cwd, env, callback, args, input) {
      var bufferedprocess, code, error, exit, messages, options, output, stderr, stdout;
      if (input == null) {
        input = null;
      }
      output = '';
      error = '';
      code = 0;
      messages = [];
      options = {
        cwd: null,
        env: null
      };
      if ((cwd != null) && cwd !== '' && cwd !== false && fs.existsSync(cwd)) {
        options.cwd = fs.realpathSync(cwd);
      }
      options.env = env != null ? env : this.environment;
      stdout = function(data) {
        return output += data;
      };
      stderr = function(data) {
        return error += data;
      };
      exit = function(data) {
        var message;
        if ((error != null) && error !== '' && error.replace(/\r?\n|\r/g, '') === "\'" + command + "\' is not recognized as an internal or external command,operable program or batch file.") {
          message = {
            line: false,
            column: false,
            msg: 'No file or directory: [' + command + ']',
            type: 'error',
            source: 'executor'
          };
          messages.push(message);
          callback(127, output, error, messages);
          return;
        }
        code = data;
        return callback(code, output, error, messages);
      };
      if (args == null) {
        args = [];
      }
      bufferedprocess = new BufferedProcess({
        command: command,
        args: args,
        options: options,
        stdout: stdout,
        stderr: stderr,
        exit: exit
      });
      bufferedprocess.onWillThrowError(function(err) {
        var message;
        if (err == null) {
          return;
        }
        if (err.error.code === 'ENOENT') {
          message = {
            line: false,
            column: false,
            msg: 'No file or directory: [' + command + ']',
            type: 'error',
            source: 'executor'
          };
          messages.push(message);
        } else {
          console.log(err.error);
        }
        err.handle();
        return callback(127, output, error, messages);
      });
      if (input) {
        return bufferedprocess.process.stdin.end(input);
      }
    };

    return Executor;

  })();

}).call(this);

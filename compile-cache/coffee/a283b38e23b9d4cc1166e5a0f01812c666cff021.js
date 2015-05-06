(function() {
  var Environment, Executor, PathHelper, os, path, _;

  _ = require('underscore-plus');

  path = require('path');

  os = require('os');

  Environment = require('./../lib/environment');

  Executor = require('./../lib/executor');

  PathHelper = require('./util/pathhelper');

  describe('executor', function() {
    var environment, executor, pathhelper, prefix, _ref;
    _ref = [], environment = _ref[0], executor = _ref[1], pathhelper = _ref[2], prefix = _ref[3];
    beforeEach(function() {
      environment = new Environment(process.env);
      executor = new Executor(environment.Clone());
      pathhelper = new PathHelper();
      return prefix = os.platform() === 'win32' ? 'C:\\' : '/';
    });
    describe('when asynchronously executing a command', function() {
      it('succeeds', function() {
        var complete;
        complete = false;
        runs(function() {
          var command, done, result;
          command = os.platform() === 'win32' ? path.resolve(__dirname, 'tools', 'env', 'env_windows_amd64.exe') : 'env';
          done = function(exitcode, stdout, stderr, messages) {
            expect(exitcode).toBeDefined();
            expect(exitcode).toBe(0);
            expect(stdout).toBeDefined();
            expect(stdout).not.toBe('');
            expect(stderr).toBeDefined();
            expect(stderr).toBe('');
            expect(_.size(messages)).toBe(0);
            return complete = true;
          };
          return result = executor.exec(command, prefix, null, done, []);
        });
        return waitsFor(function() {
          return complete === true;
        });
      });
      it('sets the working directory correctly', function() {
        var complete;
        complete = false;
        runs(function() {
          var command, done, result;
          command = os.platform() === 'win32' ? path.resolve(__dirname, 'tools', 'pwd', 'pwd_windows_amd64.exe') : 'pwd';
          done = function(exitcode, stdout, stderr, messages) {
            expect(exitcode).toBeDefined();
            expect(exitcode).toBe(0);
            expect(stdout).toBeDefined();
            expect(stdout).toBe(pathhelper.home() + '\n');
            expect(stderr).toBeDefined();
            expect(stderr).toBe('');
            expect(_.size(messages)).toBe(0);
            return complete = true;
          };
          return result = executor.exec(command, pathhelper.home(), null, done, null);
        });
        return waitsFor(function() {
          return complete === true;
        });
      });
      it('sets the environment correctly', function() {
        var complete;
        complete = false;
        runs(function() {
          var command, done, env, result;
          command = os.platform() === 'win32' ? path.resolve(__dirname, 'tools', 'env', 'env_windows_amd64.exe') : 'env';
          done = function(exitcode, stdout, stderr, messages) {
            expect(exitcode).toBeDefined();
            expect(exitcode).toBe(0);
            expect(stdout).toBeDefined();
            expect(stdout).toContain('testenv=testing\n');
            expect(stderr).toBeDefined();
            expect(stderr).toBe('');
            expect(_.size(messages)).toBe(0);
            return complete = true;
          };
          env = {
            testenv: 'testing'
          };
          return result = executor.exec(command, null, env, done, null);
        });
        return waitsFor(function() {
          return complete === true;
        });
      });
      return it('returns a message if the command was not found', function() {
        var complete;
        complete = false;
        runs(function() {
          var done, result;
          done = function(exitcode, stdout, stderr, messages) {
            var _ref1;
            expect(exitcode).toBeDefined();
            expect(exitcode).not.toBe(0);
            expect(exitcode).toBe(127);
            expect(_.size(messages)).toBe(1);
            expect(messages[0]).toBeDefined();
            expect((_ref1 = messages[0]) != null ? _ref1.msg : void 0).toBe('No file or directory: [nonexistentcommand]');
            expect(stdout).toBeDefined();
            expect(stdout).toBe('');
            expect(stderr).toBeDefined();
            expect(stderr).toBe('');
            return complete = true;
          };
          return result = executor.exec('nonexistentcommand', null, null, done, null);
        });
        return waitsFor(function() {
          return complete === true;
        });
      });
    });
    return describe('when synchronously executing a command', function() {
      it('succeeds', function() {
        var command, result;
        command = os.platform() === 'win32' ? path.resolve(__dirname, 'tools', 'env', 'env_windows_amd64.exe') : 'env';
        result = executor.execSync(command);
        expect(result.code).toBeDefined();
        expect(result.code).toBe(0);
        expect(result.stdout).toBeDefined();
        expect(result.stdout).not.toBe('');
        expect(result.stderr).toBeDefined();
        return expect(result.stderr).toBe('');
      });
      return it('returns a message if the command was not found', function() {
        var result;
        result = executor.execSync('nonexistentcommand');
        expect(result.code).toBeDefined();
        expect(result.code).toBe(127);
        expect(_.size(result.messages)).toBe(1);
        expect(result.messages[0]).toBeDefined();
        expect(result.messages[0].msg).toBe('No file or directory: [nonexistentcommand]');
        expect(result.stdout).toBeDefined();
        expect(result.stdout).toBe('');
        expect(result.stderr).toBeDefined();
        return expect(result.stderr).toBe('');
      });
    });
  });

}).call(this);

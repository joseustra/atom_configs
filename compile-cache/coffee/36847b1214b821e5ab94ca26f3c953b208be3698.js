(function() {
  var AtomConfig, Environment, GoExecutable, fs, os, path, temp, _;

  path = require('path');

  fs = require('fs-plus');

  os = require('os');

  temp = require('temp').track();

  _ = require('underscore-plus');

  GoExecutable = require('./../lib/goexecutable');

  Environment = require('./../lib/environment');

  AtomConfig = require('./util/atomconfig');

  describe('go executable', function() {
    var directory, env, environment, go, goexecutable, _ref;
    _ref = [], environment = _ref[0], goexecutable = _ref[1], directory = _ref[2], env = _ref[3], go = _ref[4];
    beforeEach(function() {
      var done;
      done = false;
      runs(function() {
        var atomconfig;
        atomconfig = new AtomConfig();
        atomconfig.defaults();
        environment = new Environment(process.env);
        directory = temp.mkdirSync();
        env = environment.Clone();
        env['GOPATH'] = directory;
        goexecutable = new GoExecutable(env);
        goexecutable.once('detect-complete', function(thego) {
          go = thego;
          return done = true;
        });
        return goexecutable.detect();
      });
      return waitsFor(function() {
        return done === true;
      });
    });
    return describe('when user has the go executable in their path', function() {
      it('determines the current go version', function() {
        return runs(function() {
          expect(goexecutable).toBeDefined;
          expect(go).toBeDefined;
          expect(go).toBeTruthy;
          if (go.version !== 'devel') {
            expect(go.name.substring(0, 2)).toBe('go');
          }
          if (go.version !== 'devel') {
            expect(go.version.substring(0, 2)).toBe('go');
          }
          if (go.version !== 'devel') {
            expect(go.arch).toBe('amd64');
          }
          if (os.platform() === 'win32') {
            return expect(go.executable.substring(go.executable.length - 6, go.executable.length)).toBe('go.exe');
          } else {
            return expect(go.executable.substring(go.executable.length - 2, go.executable.length)).toBe('go');
          }
        });
      });
      xit('fetches missing tools if requested', function() {
        var done;
        done = false;
        runs(function() {
          var suffix;
          suffix = os.platform() === 'win32' ? '.exe' : '';
          expect(goexecutable).toBeDefined;
          expect(go).toBeDefined;
          expect(go).toBeTruthy;
          expect(go.gopath).toBe(directory);
          expect(go.goimports()).toBe(false);
          expect(go.goreturns()).toBe(false);
          expect(go.golint()).toBe(false);
          expect(go.oracle()).toBe(false);
          goexecutable.once('gettools-complete', function() {
            go = goexecutable.current();
            expect(go).toBeDefined;
            expect(go).toBeTruthy;
            expect(go.gopath).toBe(directory);
            expect(go.goimports()).toBe(fs.realpathSync(path.join(directory, 'bin', 'goimports' + suffix)));
            expect(go.goreturns()).toBe(false);
            expect(go.golint()).toBe(fs.realpathSync(path.join(directory, 'bin', 'golint' + suffix)));
            expect(go.oracle()).toBe(path.join(directory, 'bin', 'oracle' + suffix));
            return done = true;
          });
          return goexecutable.gettools(go, true);
        });
        waitsFor(function() {
          return done === true;
        }, 60000);
        runs(function() {
          var suffix;
          suffix = os.platform() === 'win32' ? '.exe' : '';
          expect(goexecutable).toBeDefined;
          expect(go).toBeDefined;
          expect(go).toBeTruthy;
          expect(go.gopath).toBe(directory);
          expect(go.goimports()).not.toBe(false);
          expect(go.goreturns()).toBe(false);
          expect(go.golint()).not.toBe(false);
          expect(go.oracle()).toBe(false);
          goexecutable.once('gettools-complete', function() {
            go = goexecutable.current();
            expect(go).toBeDefined;
            expect(go).toBeTruthy;
            expect(go.gopath).toBe(directory);
            expect(go.goimports()).toBe(fs.realpathSync(path.join(directory, 'bin', 'goimports' + suffix)));
            expect(go.goreturns()).toBe(fs.realpathSync(path.join(directory, 'bin', 'goreturns' + suffix)));
            expect(go.golint()).toBe(fs.realpathSync(path.join(directory, 'bin', 'golint' + suffix)));
            expect(go.oracle()).toBe(path.join(directory, 'bin', 'oracle' + suffix));
            return done = true;
          });
          return goexecutable.gettools(go, true);
        });
        return waitsFor(function() {
          return done === true;
        }, 60000);
      });
      it('finds tools if they are on the PATH but not in the GOPATH', function() {
        var done;
        done = false;
        runs(function() {
          env = environment.Clone();
          env['GOPATH'] = '';
          atom.config.set('go-plus.goPath', '');
          goexecutable = new GoExecutable(env);
          goexecutable.once('detect-complete', function(thego) {
            go = thego;
            return done = true;
          });
          return goexecutable.detect();
        });
        waitsFor(function() {
          return done === true;
        });
        return runs(function() {
          done = false;
          expect(goexecutable).toBeDefined;
          expect(go).toBeDefined;
          expect(go).toBeTruthy;
          expect(go.gopath).toBe('');
          expect(go.goimports()).not.toBe(false);
          return expect(go.golint()).not.toBe(false);
        });
      });
      return it('skips fetching tools if GOPATH is empty', function() {
        var done;
        done = false;
        runs(function() {
          env = environment.Clone();
          env['GOPATH'] = '';
          if (os.platform() === 'win32') {
            env['Path'] = '';
          } else {
            env['PATH'] = '';
          }
          atom.config.set('go-plus.goPath', '');
          goexecutable = new GoExecutable(env);
          goexecutable.once('detect-complete', function(thego) {
            go = thego;
            return done = true;
          });
          return goexecutable.detect();
        });
        waitsFor(function() {
          return done === true;
        });
        runs(function() {
          done = false;
          expect(goexecutable).toBeDefined;
          expect(go).toBeDefined;
          expect(go).toBeTruthy;
          expect(go.gopath).toBe('');
          expect(go.goimports()).toBe(false);
          expect(go.golint()).toBe(false);
          goexecutable.once('gettools-complete', function() {
            go = goexecutable.current();
            expect(go).toBeDefined;
            expect(go).toBeTruthy;
            expect(go.gopath).toBe('');
            expect(go.goimports()).toBe(false);
            expect(go.golint()).toBe(false);
            return done = true;
          });
          return goexecutable.gettools(go, true);
        });
        return waitsFor(function() {
          return done === true;
        });
      });
    });
  });

}).call(this);

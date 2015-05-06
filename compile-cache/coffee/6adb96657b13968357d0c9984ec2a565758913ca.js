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
      return runs(function() {
        var atomconfig;
        atomconfig = new AtomConfig();
        atomconfig.defaults();
        environment = new Environment(process.env);
        directory = temp.mkdirSync();
        env = environment.Clone();
        return env['GOPATH'] = directory;
      });
    });
    describe('when there is a symlink to a directory called go in a directory in the path', function() {
      var pathDirectory;
      pathDirectory = [][0];
      beforeEach(function() {
        runs(function() {
          pathDirectory = temp.mkdirSync();
          fs.mkdirSync(path.join(pathDirectory, 'bin'));
          fs.mkdirSync(path.join(pathDirectory, 'otherbin'));
          fs.mkdirSync(path.join(pathDirectory, 'otherbin', 'go'));
          fs.mkdirSync(path.join(pathDirectory, 'go'));
          fs.symlinkSync(path.join(pathDirectory, 'go'), path.join(pathDirectory, 'bin', 'go'));
          env['PATH'] = env['PATH'] + path.delimiter + path.join(pathDirectory, 'bin') + path.delimiter + path.join(pathDirectory, 'otherbin');
          return goexecutable = new GoExecutable(env);
        });
        return waitsForPromise(function() {
          return goexecutable.detect().then(function(gos) {
            return go = goexecutable.current();
          });
        });
      });
      return it('chooses the correct go', function() {
        expect(goexecutable).toBeDefined();
        expect(go).toBeDefined();
        return expect(go).toBeTruthy();
      });
    });
    describe('when the GOPATH is empty', function() {
      beforeEach(function() {
        runs(function() {
          env['GOPATH'] = '';
          atom.config.set('go-plus.goPath', '');
          return goexecutable = new GoExecutable(env);
        });
        return waitsForPromise(function() {
          return goexecutable.detect().then(function(gos) {
            return go = goexecutable.current();
          });
        });
      });
      return it('finds tools if they are on the PATH but not in the GOPATH', function() {
        var done;
        done = false;
        expect(goexecutable).toBeDefined();
        expect(go).toBeDefined();
        expect(go).toBeTruthy();
        expect(go.gopath).toBe('');
        expect(go.goimports()).not.toBe(false);
        return expect(go.golint()).not.toBe(false);
      });
    });
    describe('when the GOPATH and PATH are empty', function() {
      beforeEach(function() {
        runs(function() {
          env['GOPATH'] = '';
          atom.config.set('go-plus.goPath', '');
          if (os.platform() === 'win32') {
            env['Path'] = '';
          } else {
            env['PATH'] = '';
          }
          return goexecutable = new GoExecutable(env);
        });
        return waitsForPromise(function() {
          return goexecutable.detect().then(function(gos) {
            return go = goexecutable.current();
          });
        });
      });
      return it('skips fetching tools if GOPATH is empty', function() {
        var done;
        done = false;
        expect(goexecutable).toBeDefined();
        expect(go).toBeDefined();
        expect(go).toBeTruthy();
        expect(go.gopath).toBe('');
        expect(go.goimports()).toBe(false);
        expect(go.golint()).toBe(false);
        goexecutable.once('gettools-complete', function() {
          go = goexecutable.current();
          expect(go).toBeDefined();
          expect(go).toBeTruthy();
          expect(go.gopath).toBe('');
          expect(go.goimports()).toBe(false);
          expect(go.golint()).toBe(false);
          return done = true;
        });
        goexecutable.gettools(go, true);
        return waitsFor(function() {
          return done === true;
        });
      });
    });
    return describe('when user has the go executable in their path', function() {
      beforeEach(function() {
        runs(function() {
          return goexecutable = new GoExecutable(env);
        });
        return waitsForPromise(function() {
          return goexecutable.detect().then(function(gos) {
            return go = goexecutable.current();
          });
        });
      });
      it('determines the current go version', function() {
        return runs(function() {
          expect(goexecutable).toBeDefined();
          expect(go).toBeDefined();
          expect(go).toBeTruthy();
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
      return xit('fetches missing tools if requested', function() {
        var done;
        done = false;
        runs(function() {
          var suffix;
          suffix = os.platform() === 'win32' ? '.exe' : '';
          expect(goexecutable).toBeDefined();
          expect(go).toBeDefined();
          expect(go).toBeTruthy();
          expect(go.gopath).toBe(directory);
          expect(go.goimports()).toBe(false);
          expect(go.goreturns()).toBe(false);
          expect(go.golint()).toBe(false);
          expect(go.oracle()).toBe(false);
          goexecutable.once('gettools-complete', function() {
            go = goexecutable.current();
            expect(go).toBeDefined();
            expect(go).toBeTruthy();
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
          expect(goexecutable).toBeDefined();
          expect(go).toBeDefined();
          expect(go).toBeTruthy();
          expect(go.gopath).toBe(directory);
          expect(go.goimports()).not.toBe(false);
          expect(go.goreturns()).toBe(false);
          expect(go.golint()).not.toBe(false);
          expect(go.oracle()).toBe(false);
          goexecutable.once('gettools-complete', function() {
            go = goexecutable.current();
            expect(go).toBeDefined();
            expect(go).toBeTruthy();
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
    });
  });

}).call(this);

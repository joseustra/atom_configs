(function() {
  var Emitter, Executor, Go, GoExecutable, PathExpander, Subscriber, async, fs, os, path, _, _ref,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

  async = require('async');

  path = require('path');

  fs = require('fs-plus');

  os = require('os');

  Go = require('./go');

  _ = require('underscore-plus');

  Executor = require('./executor');

  PathExpander = require('./util/pathexpander');

  _ref = require('emissary'), Subscriber = _ref.Subscriber, Emitter = _ref.Emitter;

  module.exports = GoExecutable = (function() {
    Subscriber.includeInto(GoExecutable);

    Emitter.includeInto(GoExecutable);

    function GoExecutable(env) {
      this.current = __bind(this.current, this);
      this.gettools = __bind(this.gettools, this);
      this.detect = __bind(this.detect, this);
      this.buildCandidates = __bind(this.buildCandidates, this);
      this.env = env;
      this.gos = [];
      this.currentgo = '';
      this.executor = new Executor(this.env);
      this.pathexpander = new PathExpander(this.env);
    }

    GoExecutable.prototype.destroy = function() {
      this.unsubscribe();
      this.executor = null;
      this.pathexpander = null;
      this.gos = [];
      this.currentgo = '';
      return this.reset();
    };

    GoExecutable.prototype.reset = function() {
      this.gos = [];
      this.currentgo = '';
      return this.emit('reset');
    };

    GoExecutable.prototype.buildCandidates = function() {
      var candidates, element, elements, goinstallation, _i, _j, _len, _len1, _ref1;
      candidates = [];
      goinstallation = atom.config.get('go-plus.goInstallation');
      switch (os.platform()) {
        case 'darwin':
        case 'freebsd':
        case 'linux':
        case 'sunos':
          if ((goinstallation != null) && goinstallation.trim() !== '') {
            if (fs.existsSync(goinstallation)) {
              if ((_ref1 = fs.lstatSync(goinstallation)) != null ? _ref1.isDirectory() : void 0) {
                candidates.push(path.normalize(path.join(goinstallation, 'bin', 'go')));
              } else if (goinstallation.lastIndexOf(path.sep + 'go') === goinstallation.length - 3 || goinstallation.lastIndexOf(path.sep + 'goapp') === goinstallation.length - 6) {
                candidates.push(path.normalize(goinstallation));
              }
            }
          }
          if (this.env.PATH != null) {
            elements = this.env.PATH.split(path.delimiter);
            for (_i = 0, _len = elements.length; _i < _len; _i++) {
              element = elements[_i];
              candidates.push(path.normalize(path.join(element, 'go')));
            }
          }
          candidates.push(path.normalize(path.join('/usr', 'local', 'go', 'bin', 'go')));
          candidates.push(path.normalize(path.join('/usr', 'local', 'bin', 'go')));
          break;
        case 'win32':
          if ((goinstallation != null) && goinstallation.trim() !== '') {
            if (goinstallation.lastIndexOf(path.sep + 'go.exe') === goinstallation.length - 7 || goinstallation.lastIndexOf(path.sep + 'goapp.bat') === goinstallation.length - 10) {
              candidates.push(path.normalize(goinstallation));
            }
          }
          if (this.env.Path != null) {
            elements = this.env.Path.split(path.delimiter);
            for (_j = 0, _len1 = elements.length; _j < _len1; _j++) {
              element = elements[_j];
              candidates.push(path.normalize(path.join(element, 'go.exe')));
            }
          }
          candidates.push(path.normalize(path.join('C:', 'go', 'bin', 'go.exe')));
          candidates.push(path.normalize(path.join('C:', 'tools', 'go', 'bin', 'go.exe')));
      }
      candidates = _.chain(candidates).uniq().map(function(e) {
        return path.resolve(path.normalize(e));
      }).filter(function(e) {
        return fs.existsSync(e);
      }).reject(function(e) {
        var _ref2;
        return (_ref2 = fs.lstatSync(e)) != null ? _ref2.isDirectory() : void 0;
      }).value();
      return candidates;
    };

    GoExecutable.prototype.detect = function() {
      return new Promise((function(_this) {
        return function(resolve) {
          var candidate, candidates, envResult, error, go, item, items, key, tuple, value, versionComponents, versionResult, _i, _j, _len, _len1;
          _this.gos = [];
          try {
            candidates = _this.buildCandidates();
            for (_i = 0, _len = candidates.length; _i < _len; _i++) {
              candidate = candidates[_i];
              if (!((candidate != null) && candidate.trim() !== '')) {
                break;
              }
              versionResult = _this.executor.execSync(candidate, false, _this.env, ['version']);
              if (versionResult == null) {
                break;
              }
              if (versionResult.error != null) {
                console.log('Error running go version for go: [' + candidate + '] (probably not a valid go)');
                console.log('Error detail: ' + versionResult.error);
                break;
              }
              if ((versionResult.stderr != null) && versionResult.stderr !== '') {
                console.log(versionResult.stderr);
                break;
              }
              if ((versionResult.stdout != null) && versionResult.stdout !== '') {
                versionComponents = versionResult.stdout.replace(/\r?\n|\r/g, '').split(' ');
                go = new Go(candidate, _this.pathexpander);
                if (go != null) {
                  go.name = versionComponents[2] + ' ' + versionComponents[3];
                }
                if (go != null) {
                  go.version = versionComponents[2];
                }
                if (go != null) {
                  go.env = _this.env;
                }
              }
              if (go !== null) {
                envResult = _this.executor.execSync(candidate, false, _this.env, ['env']);
              }
              if (envResult == null) {
                break;
              }
              if (envResult.error != null) {
                console.log('Error running go env for go: [' + candidate + '] (probably not a valid go)');
                console.log('Error detail: ' + envResult.error);
                break;
              }
              if ((envResult.stderr != null) && envResult.stderr !== '') {
                console.log(envResult.stderr);
                break;
              }
              if ((envResult.stdout != null) && envResult.stdout !== '') {
                items = envResult.stdout.split('\n');
                for (_j = 0, _len1 = items.length; _j < _len1; _j++) {
                  item = items[_j];
                  if ((item != null) && item !== '' && item.trim() !== '') {
                    tuple = item.split('=');
                    key = tuple[0];
                    value = '';
                    if (os.platform() === 'win32') {
                      value = tuple[1];
                    } else {
                      if (tuple[1].length > 2) {
                        value = tuple[1].substring(1, tuple[1].length - 1);
                      }
                    }
                    if (os.platform() === 'win32') {
                      switch (key) {
                        case 'set GOARCH':
                          go.arch = value;
                          break;
                        case 'set GOOS':
                          go.os = value;
                          break;
                        case 'set GOPATH':
                          go.gopath = value;
                          break;
                        case 'set GOROOT':
                          go.goroot = value;
                          break;
                        case 'set GOTOOLDIR':
                          go.gotooldir = value;
                          break;
                        case 'set GOEXE':
                          go.exe = value;
                      }
                    } else {
                      switch (key) {
                        case 'GOARCH':
                          go.arch = value;
                          break;
                        case 'GOOS':
                          go.os = value;
                          break;
                        case 'GOPATH':
                          go.gopath = value;
                          break;
                        case 'GOROOT':
                          go.goroot = value;
                          break;
                        case 'GOTOOLDIR':
                          go.gotooldir = value;
                          break;
                        case 'GOEXE':
                          go.exe = value;
                      }
                    }
                  }
                }
              }
              if ((go != null) && (go.executable != null) && (go.gotooldir != null) && go.gotooldir !== '') {
                _this.gos.push(go);
              }
            }
          } catch (_error) {
            error = _error;
            console.log(error);
          }
          return resolve(_this.gos);
        };
      })(this));
    };

    GoExecutable.prototype.gettools = function(go, updateExistingTools) {
      var gogetenv, gopath;
      if (go == null) {
        this.emit('gettools-complete');
        return;
      }
      gogetenv = _.clone(this.env);
      gopath = go.buildgopath();
      if (!((gopath != null) && gopath.trim() !== '')) {
        this.emit('gettools-complete');
        return;
      }
      gogetenv['GOPATH'] = gopath;
      return async.series([
        (function(_this) {
          return function(callback) {
            var done;
            done = function(exitcode, stdout, stderr) {
              return callback(null);
            };
            if (go.vet() !== false && !updateExistingTools) {
              return done();
            } else {
              return _this.executor.exec(go.executable, false, gogetenv, done, ['get', '-u', 'golang.org/x/tools/cmd/vet']);
            }
          };
        })(this), (function(_this) {
          return function(callback) {
            var done;
            done = function(exitcode, stdout, stderr) {
              return callback(null);
            };
            if (go.cover() !== false && !updateExistingTools) {
              return done();
            } else {
              return _this.executor.exec(go.executable, false, gogetenv, done, ['get', '-u', 'golang.org/x/tools/cmd/cover']);
            }
          };
        })(this), (function(_this) {
          return function(callback) {
            var done, pkg;
            done = function(exitcode, stdout, stderr) {
              return callback(null);
            };
            if (go.format() !== false && !updateExistingTools) {
              return done();
            } else {
              pkg = (function() {
                switch (atom.config.get('go-plus.formatTool')) {
                  case 'goimports':
                    return 'golang.org/x/tools/cmd/goimports';
                  case 'goreturns':
                    return 'sourcegraph.com/sqs/goreturns';
                  default:
                    return false;
                }
              })();
              if (pkg == null) {
                done();
              }
              return _this.executor.exec(go.executable, false, gogetenv, done, ['get', '-u', pkg]);
            }
          };
        })(this), (function(_this) {
          return function(callback) {
            var done;
            done = function(exitcode, stdout, stderr) {
              return callback(null);
            };
            if (go.golint() !== false && !updateExistingTools) {
              return done();
            } else {
              return _this.executor.exec(go.executable, false, gogetenv, done, ['get', '-u', 'github.com/golang/lint/golint']);
            }
          };
        })(this), (function(_this) {
          return function(callback) {
            var done;
            done = function(exitcode, stdout, stderr) {
              return callback(null);
            };
            if (go.gocode() !== false && !updateExistingTools) {
              return done();
            } else {
              return _this.executor.exec(go.executable, false, gogetenv, done, ['get', '-u', 'github.com/nsf/gocode']);
            }
          };
        })(this), (function(_this) {
          return function(callback) {
            var done;
            done = function(exitcode, stdout, stderr) {
              return callback(null);
            };
            if (go.oracle() !== false && !updateExistingTools) {
              return done();
            } else {
              return _this.executor.exec(go.executable, false, gogetenv, done, ['get', '-u', 'golang.org/x/tools/cmd/oracle']);
            }
          };
        })(this)
      ], (function(_this) {
        return function(err, results) {
          return _this.emit('gettools-complete');
        };
      })(this));
    };

    GoExecutable.prototype.current = function() {
      var go, _i, _len, _ref1, _ref2;
      if (!(((_ref1 = this.gos) != null ? _ref1.length : void 0) > 0)) {
        return false;
      }
      if (_.size(this.gos) === 1) {
        return this.gos[0];
      }
      _ref2 = this.gos;
      for (_i = 0, _len = _ref2.length; _i < _len; _i++) {
        go = _ref2[_i];
        if ((go != null ? go.executable : void 0) === this.currentgo && this.currentgo !== '') {
          return go;
        }
      }
      return this.gos[0];
    };

    return GoExecutable;

  })();

}).call(this);

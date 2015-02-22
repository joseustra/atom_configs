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
      this.introspect = __bind(this.introspect, this);
      this.detect = __bind(this.detect, this);
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

    GoExecutable.prototype.detect = function() {
      var element, elements, executables, goinstallation, _i, _j, _len, _len1, _ref1;
      executables = [];
      goinstallation = atom.config.get('go-plus.goInstallation');
      switch (os.platform()) {
        case 'darwin':
        case 'freebsd':
        case 'linux':
        case 'sunos':
          if ((goinstallation != null) && goinstallation.trim() !== '') {
            if (fs.existsSync(goinstallation)) {
              if ((_ref1 = fs.lstatSync(goinstallation)) != null ? _ref1.isDirectory() : void 0) {
                executables.push(path.normalize(path.join(goinstallation, 'bin', 'go')));
              } else if (goinstallation.lastIndexOf(path.sep + 'go') === goinstallation.length - 3 || goinstallation.lastIndexOf(path.sep + 'goapp') === goinstallation.length - 6) {
                executables.push(path.normalize(goinstallation));
              }
            }
          }
          if (this.env.PATH != null) {
            elements = this.env.PATH.split(path.delimiter);
            for (_i = 0, _len = elements.length; _i < _len; _i++) {
              element = elements[_i];
              executables.push(path.normalize(path.join(element, 'go')));
            }
          }
          executables.push(path.normalize(path.join('/usr', 'local', 'go', 'bin', 'go')));
          executables.push(path.normalize(path.join('/usr', 'local', 'bin', 'go')));
          break;
        case 'win32':
          if ((goinstallation != null) && goinstallation.trim() !== '') {
            if (goinstallation.lastIndexOf(path.sep + 'go.exe') === goinstallation.length - 7 || goinstallation.lastIndexOf(path.sep + 'goapp.bat') === goinstallation.length - 10) {
              executables.push(path.normalize(goinstallation));
            }
          }
          if (this.env.Path != null) {
            elements = this.env.Path.split(path.delimiter);
            for (_j = 0, _len1 = elements.length; _j < _len1; _j++) {
              element = elements[_j];
              executables.push(path.normalize(path.join(element, 'go.exe')));
            }
          }
          executables.push(path.normalize(path.join('C:', 'go', 'bin', 'go.exe')));
          executables.push(path.normalize(path.join('C:', 'tools', 'go', 'bin', 'go.exe')));
      }
      executables = _.uniq(executables);
      return async.filter(executables, fs.exists, (function(_this) {
        return function(results) {
          executables = results;
          return async.map(executables, _this.introspect, function(err, results) {
            if (err != null) {
              console.log('Error mapping go: ' + err);
            }
            _this.gos = results;
            return _this.emit('detect-complete', _this.current());
          });
        };
      })(this));
    };

    GoExecutable.prototype.introspect = function(executable, outercallback) {
      var absoluteExecutable, go, _ref1;
      absoluteExecutable = path.resolve(executable);
      if ((_ref1 = fs.lstatSync(absoluteExecutable)) != null ? _ref1.isDirectory() : void 0) {
        outercallback(null);
        return;
      }
      go = new Go(absoluteExecutable, this.pathexpander);
      return async.series([
        (function(_this) {
          return function(callback) {
            var done, error;
            done = function(exitcode, stdout, stderr) {
              var components;
              if (!((stderr != null) && stderr !== '')) {
                if ((stdout != null) && stdout !== '') {
                  components = stdout.replace(/\r?\n|\r/g, '').split(' ');
                  if (go != null) {
                    go.name = components[2] + ' ' + components[3];
                  }
                  if (go != null) {
                    go.version = components[2];
                  }
                  if (go != null) {
                    go.env = _this.env;
                  }
                }
              }
              if (typeof err !== "undefined" && err !== null) {
                console.log('Error running go version: ' + err);
              }
              if ((stderr != null) && stderr !== '') {
                console.log('Error detail: ' + stderr);
              }
              return callback(null);
            };
            try {
              return _this.executor.exec(absoluteExecutable, false, _this.env, done, ['version']);
            } catch (_error) {
              error = _error;
              console.log('go [' + absoluteExecutable + '] is not a valid go');
              return go = null;
            }
          };
        })(this), (function(_this) {
          return function(callback) {
            var done, error;
            done = function(exitcode, stdout, stderr) {
              var item, items, key, tuple, value, _i, _len;
              if (!((stderr != null) && stderr !== '')) {
                if ((stdout != null) && stdout !== '') {
                  items = stdout.split('\n');
                  for (_i = 0, _len = items.length; _i < _len; _i++) {
                    item = items[_i];
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
              }
              if (typeof err !== "undefined" && err !== null) {
                console.log('Error running go env: ' + err);
              }
              if ((stderr != null) && stderr !== '') {
                console.log('Error detail: ' + stderr);
              }
              return callback(null);
            };
            try {
              if (go !== null) {
                return _this.executor.exec(absoluteExecutable, false, _this.env, done, ['env']);
              }
            } catch (_error) {
              error = _error;
              return console.log('go [' + absoluteExecutable + '] is not a valid go');
            }
          };
        })(this)
      ], function(err, results) {
        return outercallback(err, go);
      });
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
      var go, _i, _len, _ref1;
      if (_.size(this.gos) === 1) {
        return this.gos[0];
      }
      _ref1 = this.gos;
      for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
        go = _ref1[_i];
        if ((go != null ? go.executable : void 0) === this.currentgo) {
          return go;
        }
      }
      return this.gos[0];
    };

    return GoExecutable;

  })();

}).call(this);

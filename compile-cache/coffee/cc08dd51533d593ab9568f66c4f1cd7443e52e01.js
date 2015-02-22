(function() {
  var AtomConfig, fs, path, temp, _;

  path = require('path');

  fs = require('fs-plus');

  temp = require('temp').track();

  _ = require('underscore-plus');

  AtomConfig = require('./util/atomconfig');

  describe('format', function() {
    var buffer, dispatch, editor, filePath, mainModule, _ref;
    _ref = [], mainModule = _ref[0], editor = _ref[1], dispatch = _ref[2], buffer = _ref[3], filePath = _ref[4];
    beforeEach(function() {
      var atomconfig, directory;
      atomconfig = new AtomConfig();
      atomconfig.allfunctionalitydisabled();
      directory = temp.mkdirSync();
      atom.project.setPaths(directory);
      filePath = path.join(directory, 'go-plus.go');
      fs.writeFileSync(filePath, '');
      jasmine.unspy(window, 'setTimeout');
      waitsForPromise(function() {
        return atom.workspace.open(filePath).then(function(e) {
          editor = e;
          return buffer = editor.getBuffer();
        });
      });
      waitsForPromise(function() {
        return atom.packages.activatePackage('language-go');
      });
      waitsForPromise(function() {
        return atom.packages.activatePackage('go-plus').then(function(g) {
          return mainModule = g.mainModule;
        });
      });
      waitsFor(function() {
        var _ref1;
        return (_ref1 = mainModule.dispatch) != null ? _ref1.ready : void 0;
      });
      return runs(function() {
        return dispatch = mainModule.dispatch;
      });
    });
    describe('when format on save is enabled', function() {
      beforeEach(function() {
        return atom.config.set('go-plus.formatOnSave', true);
      });
      it('reformats the file', function() {
        var done;
        done = false;
        runs(function() {
          dispatch.once('dispatch-complete', function() {
            expect(fs.readFileSync(filePath, {
              encoding: 'utf8'
            })).toBe('package main\n\nfunc main() {\n}\n');
            expect(dispatch.messages != null).toBe(true);
            expect(_.size(dispatch.messages)).toBe(0);
            return done = true;
          });
          buffer.setText('package main\n\nfunc main()  {\n}\n');
          return buffer.save();
        });
        return waitsFor(function() {
          return done === true;
        });
      });
      it('reformats the file after multiple saves', function() {
        var displayDone, done;
        done = false;
        displayDone = false;
        runs(function() {
          dispatch.once('dispatch-complete', function() {
            expect(fs.readFileSync(filePath, {
              encoding: 'utf8'
            })).toBe('package main\n\nfunc main() {\n}\n');
            expect(dispatch.messages != null).toBe(true);
            expect(_.size(dispatch.messages)).toBe(0);
            return done = true;
          });
          dispatch.once('display-complete', function() {
            return displayDone = true;
          });
          buffer.setText('package main\n\nfunc main()  {\n}\n');
          return buffer.save();
        });
        waitsFor(function() {
          return done === true;
        });
        waitsFor(function() {
          return displayDone === true;
        });
        runs(function() {
          done = false;
          dispatch.once('dispatch-complete', function() {
            expect(fs.readFileSync(filePath, {
              encoding: 'utf8'
            })).toBe('package main\n\nfunc main() {\n}\n');
            expect(dispatch.messages != null).toBe(true);
            expect(_.size(dispatch.messages)).toBe(0);
            return done = true;
          });
          buffer.setText('package main\n\nfunc main()  {\n}\n');
          return buffer.save();
        });
        return waitsFor(function() {
          return done === true;
        });
      });
      it('collects errors when the input is invalid', function() {
        var done;
        done = false;
        runs(function() {
          dispatch.once('dispatch-complete', function(editor) {
            expect(fs.readFileSync(filePath, {
              encoding: 'utf8'
            })).toBe('package main\n\nfunc main(!)  {\n}\n');
            expect(dispatch.messages != null).toBe(true);
            expect(_.size(dispatch.messages)).toBe(1);
            expect(dispatch.messages[0].column).toBe('11');
            expect(dispatch.messages[0].line).toBe('3');
            expect(dispatch.messages[0].msg).toBe('expected type, found \'!\'');
            return done = true;
          });
          buffer.setText('package main\n\nfunc main(!)  {\n}\n');
          return buffer.save();
        });
        return waitsFor(function() {
          return done === true;
        });
      });
      it('uses goimports to reorganize imports if enabled', function() {
        var done;
        done = false;
        runs(function() {
          atom.config.set('go-plus.formatTool', 'goimports');
          dispatch.once('dispatch-complete', function() {
            expect(fs.readFileSync(filePath, {
              encoding: 'utf8'
            })).toBe('package main\n\nimport "fmt"\n\nfunc main() {\n\tfmt.Println("Hello, 世界")\n}\n');
            expect(dispatch.messages != null).toBe(true);
            expect(_.size(dispatch.messages)).toBe(0);
            return done = true;
          });
          buffer.setText('package main\n\nfunc main()  {\n\tfmt.Println("Hello, 世界")\n}\n');
          return buffer.save();
        });
        return waitsFor(function() {
          return done === true;
        });
      });
      return it('uses goreturns to handle returns if enabled', function() {
        var done;
        done = false;
        runs(function() {
          atom.config.set('go-plus.formatTool', 'goreturns');
          dispatch.once('dispatch-complete', function() {
            expect(fs.readFileSync(filePath, {
              encoding: 'utf8'
            })).toBe('package demo\n\nimport "errors"\n\nfunc F() (string, int, error) {\n\treturn "", 0, errors.New("foo")\n}\n');
            expect(dispatch.messages != null).toBe(true);
            expect(_.size(dispatch.messages)).toBe(0);
            return done = true;
          });
          buffer.setText('package demo\n\nfunc F() (string, int, error)     {\nreturn errors.New("foo") }');
          return buffer.save();
        });
        return waitsFor(function() {
          return done === true;
        });
      });
    });
    return describe('when format on save is disabled', function() {
      beforeEach(function() {
        return atom.config.set('go-plus.formatOnSave', false);
      });
      return it('does not reformat the file', function() {
        var done;
        done = false;
        runs(function() {
          dispatch.once('dispatch-complete', function() {
            expect(fs.readFileSync(filePath, {
              encoding: 'utf8'
            })).toBe('package main\n\nfunc main()  {\n}\n');
            expect(dispatch.messages != null).toBe(true);
            expect(_.size(dispatch.messages)).toBe(0);
            return done = true;
          });
          buffer.setText('package main\n\nfunc main()  {\n}\n');
          return buffer.save();
        });
        return waitsFor(function() {
          return done === true;
        });
      });
    });
  });

}).call(this);

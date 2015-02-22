(function() {
  var AtomConfig, fs, path, temp, _;

  path = require('path');

  fs = require('fs-plus');

  temp = require('temp').track();

  _ = require('underscore-plus');

  AtomConfig = require('./util/atomconfig');

  describe('gopath', function() {
    var directory, dispatch, editor, filePath, mainModule, oldGoPath, _ref;
    _ref = [], mainModule = _ref[0], editor = _ref[1], dispatch = _ref[2], directory = _ref[3], filePath = _ref[4], oldGoPath = _ref[5];
    beforeEach(function() {
      var atomconfig;
      atomconfig = new AtomConfig();
      atomconfig.allfunctionalitydisabled();
      directory = temp.mkdirSync();
      oldGoPath = process.env.GOPATH;
      process.env['GOPATH'] = directory;
      atom.project.setPaths(directory);
      return jasmine.unspy(window, 'setTimeout');
    });
    afterEach(function() {
      return process.env['GOPATH'] = oldGoPath;
    });
    describe('when syntax check on save is enabled and goPath is set', function() {
      beforeEach(function() {
        atom.config.set('go-plus.goPath', directory);
        atom.config.set('go-plus.syntaxCheckOnSave', true);
        filePath = path.join(directory, 'wrongsrc', 'github.com', 'testuser', 'example', 'go-plus.go');
        fs.writeFileSync(filePath, '');
        waitsForPromise(function() {
          return atom.workspace.open(filePath).then(function(e) {
            return editor = e;
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
      it("displays a warning for a GOPATH without 'src' directory", function() {
        var done;
        done = false;
        runs(function() {
          var buffer;
          fs.unlinkSync(filePath);
          buffer = editor.getBuffer();
          buffer.setText('package main\n\nfunc main() {\n\treturn\n}\n');
          dispatch.once('dispatch-complete', function() {
            var _ref1, _ref2, _ref3, _ref4;
            expect(fs.readFileSync(filePath, {
              encoding: 'utf8'
            })).toBe('package main\n\nfunc main() {\n\treturn\n}\n');
            expect(dispatch.messages != null).toBe(true);
            expect(_.size(dispatch.messages)).toBe(1);
            expect((_ref1 = dispatch.messages[0]) != null ? _ref1.column : void 0).toBe(false);
            expect((_ref2 = dispatch.messages[0]) != null ? _ref2.line : void 0).toBe(false);
            expect((_ref3 = dispatch.messages[0]) != null ? _ref3.msg : void 0).toBe('Warning: GOPATH [' + directory + '] does not contain a "src" directory - please review http://golang.org/doc/code.html#Workspaces');
            expect((_ref4 = dispatch.messages[0]) != null ? _ref4.type : void 0).toBe('warning');
            return done = true;
          });
          return buffer.save();
        });
        return waitsFor(function() {
          return done === true;
        });
      });
      return it('displays a warning for a non-existent GOPATH', function() {
        var done;
        done = false;
        runs(function() {
          var buffer;
          dispatch.goexecutable.current().gopath = path.join(directory, 'nonexistent');
          fs.unlinkSync(filePath);
          buffer = editor.getBuffer();
          buffer.setText('package main\n\nfunc main() {\n\treturn\n}\n');
          dispatch.once('dispatch-complete', function() {
            var _ref1, _ref2, _ref3, _ref4;
            expect(fs.readFileSync(filePath, {
              encoding: 'utf8'
            })).toBe('package main\n\nfunc main() {\n\treturn\n}\n');
            expect(dispatch.messages != null).toBe(true);
            expect(_.size(dispatch.messages)).toBe(1);
            expect((_ref1 = dispatch.messages[0]) != null ? _ref1.column : void 0).toBe(false);
            expect((_ref2 = dispatch.messages[0]) != null ? _ref2.line : void 0).toBe(false);
            expect((_ref3 = dispatch.messages[0]) != null ? _ref3.msg : void 0).toBe('Warning: GOPATH [' + path.join(directory, 'nonexistent') + '] does not exist');
            expect((_ref4 = dispatch.messages[0]) != null ? _ref4.type : void 0).toBe('warning');
            return done = true;
          });
          return buffer.save();
        });
        return waitsFor(function() {
          return done === true;
        });
      });
    });
    return describe('when syntax check on save is enabled and GOPATH is not set', function() {
      beforeEach(function() {
        atom.config.set('go-plus.goPath', '');
        atom.config.set('go-plus.syntaxCheckOnSave', true);
        filePath = path.join(directory, 'wrongsrc', 'github.com', 'testuser', 'example', 'go-plus.go');
        fs.writeFileSync(filePath, '');
        waitsForPromise(function() {
          return atom.workspace.open(filePath).then(function(e) {
            return editor = e;
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
      return it('displays warnings for an unset GOPATH', function() {
        var done;
        done = false;
        runs(function() {
          var buffer;
          dispatch.goexecutable.current().env['GOPATH'] = '';
          dispatch.goexecutable.current().gopath = '';
          fs.unlinkSync(filePath);
          buffer = editor.getBuffer();
          buffer.setText('package main\n\nfunc main() {\n\treturn\n}\n');
          dispatch.once('dispatch-complete', function() {
            var _ref1, _ref2, _ref3, _ref4;
            expect(fs.readFileSync(filePath, {
              encoding: 'utf8'
            })).toBe('package main\n\nfunc main() {\n\treturn\n}\n');
            expect(dispatch.messages != null).toBe(true);
            expect(_.size(dispatch.messages)).toBe(1);
            expect((_ref1 = dispatch.messages[0]) != null ? _ref1.column : void 0).toBe(false);
            expect((_ref2 = dispatch.messages[0]) != null ? _ref2.line : void 0).toBe(false);
            expect((_ref3 = dispatch.messages[0]) != null ? _ref3.msg : void 0).toBe('Warning: GOPATH is not set – either set the GOPATH environment variable or define the Go Path in go-plus package preferences');
            expect((_ref4 = dispatch.messages[0]) != null ? _ref4.type : void 0).toBe('warning');
            return done = true;
          });
          return buffer.save();
        });
        return waitsFor(function() {
          return done === true;
        });
      });
    });
  });

}).call(this);

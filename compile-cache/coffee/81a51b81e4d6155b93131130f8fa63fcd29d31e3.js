(function() {
  var AtomConfig, PathHelper, fs, path, temp, _;

  path = require('path');

  fs = require('fs-plus');

  temp = require('temp').track();

  _ = require('underscore-plus');

  PathHelper = require('./util/pathhelper');

  AtomConfig = require('./util/atomconfig');

  describe('build', function() {
    var directory, dispatch, editor, filePath, mainModule, oldGoPath, pathhelper, secondEditor, secondFilePath, testEditor, testFilePath, thirdEditor, thirdFilePath, _ref;
    _ref = [], mainModule = _ref[0], editor = _ref[1], dispatch = _ref[2], secondEditor = _ref[3], thirdEditor = _ref[4], testEditor = _ref[5], directory = _ref[6], filePath = _ref[7], secondFilePath = _ref[8], thirdFilePath = _ref[9], testFilePath = _ref[10], oldGoPath = _ref[11], pathhelper = _ref[12];
    beforeEach(function() {
      var atomconfig;
      atomconfig = new AtomConfig();
      pathhelper = new PathHelper();
      atomconfig.allfunctionalitydisabled();
      directory = temp.mkdirSync();
      oldGoPath = process.env.GOPATH;
      if (process.env.GOPATH == null) {
        oldGoPath = pathhelper.home() + path.sep + 'go';
      }
      process.env['GOPATH'] = directory;
      atom.project.setPaths(directory);
      return jasmine.unspy(window, 'setTimeout');
    });
    afterEach(function() {
      return process.env['GOPATH'] = oldGoPath;
    });
    describe('when syntax check on save is enabled', function() {
      var ready;
      ready = false;
      beforeEach(function() {
        atom.config.set('go-plus.goPath', directory);
        atom.config.set('go-plus.syntaxCheckOnSave', true);
        filePath = path.join(directory, 'src', 'github.com', 'testuser', 'example', 'go-plus.go');
        testFilePath = path.join(directory, 'src', 'github.com', 'testuser', 'example', 'go-plus_test.go');
        fs.writeFileSync(filePath, '');
        fs.writeFileSync(testFilePath, '');
        waitsForPromise(function() {
          return atom.workspace.open(filePath).then(function(e) {
            return editor = e;
          });
        });
        waitsForPromise(function() {
          return atom.workspace.open(testFilePath).then(function(e) {
            return testEditor = e;
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
      it('displays errors for unused code', function() {
        var done;
        done = false;
        runs(function() {
          var buffer;
          fs.unlinkSync(testFilePath);
          buffer = editor.getBuffer();
          buffer.setText('package main\n\nimport "fmt"\n\nfunc main()  {\n42\nreturn\nfmt.Println("Unreachable...")}\n');
          dispatch = atom.packages.getLoadedPackage('go-plus').mainModule.dispatch;
          dispatch.once('dispatch-complete', function() {
            var _ref1, _ref2, _ref3;
            expect(fs.readFileSync(filePath, {
              encoding: 'utf8'
            })).toBe('package main\n\nimport "fmt"\n\nfunc main()  {\n42\nreturn\nfmt.Println("Unreachable...")}\n');
            expect(dispatch.messages != null).toBe(true);
            expect(_.size(dispatch.messages)).toBe(1);
            expect((_ref1 = dispatch.messages[0]) != null ? _ref1.column : void 0).toBe(false);
            expect((_ref2 = dispatch.messages[0]) != null ? _ref2.line : void 0).toBe('6');
            expect((_ref3 = dispatch.messages[0]) != null ? _ref3.msg : void 0).toBe('42 evaluated but not used');
            return done = true;
          });
          return buffer.save();
        });
        return waitsFor(function() {
          return done === true;
        });
      });
      it('displays errors for unused code in a test file', function() {
        var done;
        done = false;
        runs(function() {
          var testBuffer;
          fs.unlinkSync(filePath);
          testBuffer = testEditor.getBuffer();
          testBuffer.setText('package main\n\nimport "testing"\n\nfunc TestExample(t *testing.T) {\n\t42\n\tt.Error("Example Test")\n}');
          dispatch = atom.packages.getLoadedPackage('go-plus').mainModule.dispatch;
          dispatch.once('dispatch-complete', function() {
            var _ref1, _ref2, _ref3;
            expect(fs.readFileSync(testFilePath, {
              encoding: 'utf8'
            })).toBe('package main\n\nimport "testing"\n\nfunc TestExample(t *testing.T) {\n\t42\n\tt.Error("Example Test")\n}');
            expect(dispatch.messages != null).toBe(true);
            expect(_.size(dispatch.messages)).toBe(1);
            expect((_ref1 = dispatch.messages[0]) != null ? _ref1.column : void 0).toBe(false);
            expect((_ref2 = dispatch.messages[0]) != null ? _ref2.line : void 0).toBe('6');
            expect((_ref3 = dispatch.messages[0]) != null ? _ref3.msg : void 0).toBe('42 evaluated but not used');
            return done = true;
          });
          return testBuffer.save();
        });
        return waitsFor(function() {
          return done === true;
        });
      });
      it('cleans up test file', function() {
        var done;
        done = false;
        runs(function() {
          var go, testBuffer;
          fs.unlinkSync(filePath);
          testBuffer = testEditor.getBuffer();
          testBuffer.setText('package main\n\nimport "testing"\n\nfunc TestExample(t *testing.T) {\n\tt.Error("Example Test")\n}');
          dispatch = atom.packages.getLoadedPackage('go-plus').mainModule.dispatch;
          go = dispatch.goexecutable.current();
          dispatch.once('dispatch-complete', function() {
            expect(fs.existsSync(path.join(directory, 'src', 'github.com', 'testuser', 'example', 'example.test' + go.exe))).toBe(false);
            return done = true;
          });
          return testBuffer.save();
        });
        return waitsFor(function() {
          return done === true;
        });
      });
      return it("does not error when a file is saved that is missing the 'package ...' directive", function() {
        var done;
        done = false;
        runs(function() {
          var testBuffer;
          fs.unlinkSync(filePath);
          testBuffer = testEditor.getBuffer();
          testBuffer.setText("");
          dispatch = atom.packages.getLoadedPackage('go-plus').mainModule.dispatch;
          dispatch.once('dispatch-complete', function() {
            var _ref1;
            expect(fs.readFileSync(testFilePath, {
              encoding: 'utf8'
            })).toBe("");
            expect(dispatch.messages != null).toBe(true);
            expect(_.size(dispatch.messages)).toBe(1);
            expect((_ref1 = dispatch.messages[0]) != null ? _ref1.msg : void 0).toBe("expected 'package', found 'EOF'");
            return done = true;
          });
          return testBuffer.save();
        });
        return waitsFor(function() {
          return done === true;
        });
      });
    });
    describe('when working with multiple files', function() {
      beforeEach(function() {
        atom.config.set('go-plus.goPath', directory);
        atom.config.set('go-plus.syntaxCheckOnSave', true);
        filePath = path.join(directory, 'src', 'github.com', 'testuser', 'example', 'go-plus.go');
        secondFilePath = path.join(directory, 'src', 'github.com', 'testuser', 'example', 'util', 'util.go');
        thirdFilePath = path.join(directory, 'src', 'github.com', 'testuser', 'example', 'util', 'strings.go');
        testFilePath = path.join(directory, 'src', 'github.com', 'testuser', 'example', 'go-plus_test.go');
        fs.writeFileSync(filePath, '');
        fs.writeFileSync(secondFilePath, '');
        fs.writeFileSync(thirdFilePath, '');
        fs.writeFileSync(testFilePath, '');
        waitsForPromise(function() {
          return atom.workspace.open(filePath).then(function(e) {
            return editor = e;
          });
        });
        waitsForPromise(function() {
          return atom.workspace.open(secondFilePath).then(function(e) {
            return secondEditor = e;
          });
        });
        waitsForPromise(function() {
          return atom.workspace.open(thirdFilePath).then(function(e) {
            return thirdEditor = e;
          });
        });
        waitsForPromise(function() {
          return atom.workspace.open(testFilePath).then(function(e) {
            return testEditor = e;
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
      it('does not display errors for dependent functions spread across multiple files in the same package', function() {
        var done;
        done = false;
        runs(function() {
          var buffer, secondBuffer, thirdBuffer;
          fs.unlinkSync(testFilePath);
          buffer = editor.getBuffer();
          secondBuffer = secondEditor.getBuffer();
          thirdBuffer = thirdEditor.getBuffer();
          buffer.setText('package main\n\nimport "fmt"\nimport "github.com/testuser/example/util"\n\nfunc main() {\n\tfmt.Println("Hello, world!")\n\tutil.ProcessString("Hello, world!")\n}');
          secondBuffer.setText('package util\n\nimport "fmt"\n\n// ProcessString processes strings\nfunc ProcessString(text string) {\n\tfmt.Println("Processing...")\n\tfmt.Println(Stringify("Testing"))\n}');
          thirdBuffer.setText('package util\n\n// Stringify stringifies text\nfunc Stringify(text string) string {\n\treturn text + "-stringified"\n}');
          buffer.save();
          secondBuffer.save();
          thirdBuffer.save();
          dispatch = atom.packages.getLoadedPackage('go-plus').mainModule.dispatch;
          dispatch.once('dispatch-complete', function() {
            expect(fs.readFileSync(secondFilePath, {
              encoding: 'utf8'
            })).toBe('package util\n\nimport "fmt"\n\n// ProcessString processes strings\nfunc ProcessString(text string) {\n\tfmt.Println("Processing...")\n\tfmt.Println(Stringify("Testing"))\n}');
            expect(dispatch.messages != null).toBe(true);
            expect(_.size(dispatch.messages)).toBe(0);
            return done = true;
          });
          return secondBuffer.save();
        });
        return waitsFor(function() {
          return done === true;
        });
      });
      it('does display errors for errors in dependent functions spread across multiple files in the same package', function() {
        var done;
        done = false;
        runs(function() {
          var buffer, secondBuffer, thirdBuffer;
          fs.unlinkSync(testFilePath);
          buffer = editor.getBuffer();
          secondBuffer = secondEditor.getBuffer();
          thirdBuffer = thirdEditor.getBuffer();
          buffer.setText('package main\n\nimport "fmt"\nimport "github.com/testuser/example/util"\n\nfunc main() {\n\tfmt.Println("Hello, world!")\n\tutil.ProcessString("Hello, world!")\n}');
          secondBuffer.setText('package util\n\nimport "fmt"\n\n// ProcessString processes strings\nfunc ProcessString(text string) {\n\tfmt.Println("Processing...")\n\tfmt.Println(Stringify("Testing"))\n}');
          thirdBuffer.setText('package util\n\n// Stringify stringifies text\nfunc Stringify(text string) string {\n\t42\n\treturn text + "-stringified"\n}');
          buffer.save();
          secondBuffer.save();
          thirdBuffer.save();
          dispatch = atom.packages.getLoadedPackage('go-plus').mainModule.dispatch;
          dispatch.once('dispatch-complete', function() {
            expect(fs.readFileSync(secondFilePath, {
              encoding: 'utf8'
            })).toBe('package util\n\nimport "fmt"\n\n// ProcessString processes strings\nfunc ProcessString(text string) {\n\tfmt.Println("Processing...")\n\tfmt.Println(Stringify("Testing"))\n}');
            expect(dispatch.messages != null).toBe(true);
            expect(_.size(dispatch.messages)).toBe(1);
            expect(dispatch.messages[0].file).toBe(thirdFilePath);
            expect(dispatch.messages[0].line).toBe('5');
            expect(dispatch.messages[0].msg).toBe('42 evaluated but not used');
            expect(dispatch.messages[0].type).toBe('error');
            expect(dispatch.messages[0].column).toBe(false);
            return done = true;
          });
          return secondBuffer.save();
        });
        return waitsFor(function() {
          return done === true;
        });
      });
      return it('displays errors for unused code in a file under test', function() {
        var done;
        done = false;
        runs(function() {
          var secondBuffer, testBuffer, thirdBuffer;
          fs.unlinkSync(filePath);
          secondBuffer = secondEditor.getBuffer();
          thirdBuffer = thirdEditor.getBuffer();
          testBuffer = testEditor.getBuffer();
          secondBuffer.setText('package util\n\nimport "fmt"\n\n// ProcessString processes strings\nfunc ProcessString(text string) {\n\tfmt.Println("Processing...")\n\tfmt.Println(Stringify("Testing"))\n}');
          thirdBuffer.setText('package util\n\n// Stringify stringifies text\nfunc Stringify(text string) string {\n\t42\n\treturn text + "-stringified"\n}');
          testBuffer.setText('package util\n\nimport "testing"\nimport "fmt"\n\nfunc TestExample(t *testing.T) {\n\tfmt.Println(Stringify("Testing"))\n}');
          secondBuffer.save();
          thirdBuffer.save();
          dispatch = atom.packages.getLoadedPackage('go-plus').mainModule.dispatch;
          dispatch.once('dispatch-complete', function() {
            expect(fs.readFileSync(secondFilePath, {
              encoding: 'utf8'
            })).toBe('package util\n\nimport "fmt"\n\n// ProcessString processes strings\nfunc ProcessString(text string) {\n\tfmt.Println("Processing...")\n\tfmt.Println(Stringify("Testing"))\n}');
            expect(dispatch.messages != null).toBe(true);
            expect(_.size(dispatch.messages)).toBe(1);
            expect(dispatch.messages[0].file).toBe(thirdFilePath);
            expect(dispatch.messages[0].line).toBe('5');
            expect(dispatch.messages[0].msg).toBe('42 evaluated but not used');
            expect(dispatch.messages[0].type).toBe('error');
            expect(dispatch.messages[0].column).toBe(false);
            return done = true;
          });
          return testBuffer.save();
        });
        return waitsFor(function() {
          return done === true;
        });
      });
    });
    return describe('when files are opened outside a gopath', function() {
      var otherdirectory, ready;
      otherdirectory = [][0];
      ready = false;
      beforeEach(function() {
        otherdirectory = temp.mkdirSync();
        process.env['GOPATH'] = otherdirectory;
        atom.config.set('go-plus.goPath', otherdirectory);
        atom.config.set('go-plus.syntaxCheckOnSave', true);
        filePath = path.join(directory, 'src', 'github.com', 'testuser', 'example', 'go-plus.go');
        testFilePath = path.join(directory, 'src', 'github.com', 'testuser', 'example', 'go-plus_test.go');
        fs.writeFileSync(filePath, '');
        fs.writeFileSync(testFilePath, '');
        waitsForPromise(function() {
          return atom.workspace.open(filePath).then(function(e) {
            return editor = e;
          });
        });
        waitsForPromise(function() {
          return atom.workspace.open(testFilePath).then(function(e) {
            return testEditor = e;
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
      return it('displays warnings about the gopath, but still displays errors', function() {
        var done;
        done = false;
        runs(function() {
          var buffer;
          fs.unlinkSync(testFilePath);
          buffer = editor.getBuffer();
          buffer.setText('package main\n\nimport "fmt"\n\nfunc main()  {\n42\nreturn\nfmt.Println("Unreachable...")}\n');
          dispatch = atom.packages.getLoadedPackage('go-plus').mainModule.dispatch;
          dispatch.once('dispatch-complete', function() {
            var _ref1, _ref2, _ref3, _ref4, _ref5, _ref6, _ref7;
            expect(fs.readFileSync(filePath, {
              encoding: 'utf8'
            })).toBe('package main\n\nimport "fmt"\n\nfunc main()  {\n42\nreturn\nfmt.Println("Unreachable...")}\n');
            expect(dispatch.messages != null).toBe(true);
            expect(_.size(dispatch.messages)).toBe(2);
            expect((_ref1 = dispatch.messages[0]) != null ? _ref1.column : void 0).toBe(false);
            expect((_ref2 = dispatch.messages[0]) != null ? _ref2.line : void 0).toBe(false);
            expect((_ref3 = dispatch.messages[0]) != null ? _ref3.msg : void 0).toBe('Warning: GOPATH [' + otherdirectory + '] does not contain a "src" directory - please review http://golang.org/doc/code.html#Workspaces');
            expect((_ref4 = dispatch.messages[1]) != null ? _ref4.column : void 0).toBe(false);
            expect((_ref5 = dispatch.messages[1]) != null ? _ref5.file : void 0).toBe(fs.realpathSync(filePath));
            expect((_ref6 = dispatch.messages[1]) != null ? _ref6.line : void 0).toBe('6');
            expect((_ref7 = dispatch.messages[1]) != null ? _ref7.msg : void 0).toBe('42 evaluated but not used');
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

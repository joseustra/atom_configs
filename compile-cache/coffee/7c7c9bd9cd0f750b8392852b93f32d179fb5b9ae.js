(function() {
  var AtomConfig, PathHelper, fs, path, temp, _;

  path = require('path');

  fs = require('fs-plus');

  temp = require('temp').track();

  _ = require('underscore-plus');

  PathHelper = require('./util/pathhelper');

  AtomConfig = require('./util/atomconfig');

  describe('gocover', function() {
    var atomconfig, directory, dispatch, editor, filePath, mainModule, oldGoPath, pathhelper, testEditor, testFilePath, _ref;
    _ref = [], mainModule = _ref[0], atomconfig = _ref[1], editor = _ref[2], dispatch = _ref[3], testEditor = _ref[4], directory = _ref[5], filePath = _ref[6], testFilePath = _ref[7], oldGoPath = _ref[8], pathhelper = _ref[9];
    beforeEach(function() {
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
    return describe('when run coverage on save is enabled', function() {
      var ready;
      ready = false;
      beforeEach(function() {
        atom.config.set('go-plus.runCoverageOnSave', true);
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
      return it('displays coverage for go source', function() {
        var done;
        done = false;
        runs(function() {
          var buffer, testBuffer;
          buffer = editor.getBuffer();
          buffer.setText('package main\n\nimport "fmt"\n\nfunc main()  {\n\tfmt.Println(Hello())\n}\n\nfunc Hello() string {\n\treturn "Hello, 世界"\n}\n');
          testBuffer = testEditor.getBuffer();
          testBuffer.setText('package main\n\nimport "testing"\n\nfunc TestHello(t *testing.T) {\n\tresult := Hello()\n\tif result != "Hello, 世界" {\n\t\tt.Errorf("Expected %s - got %s", "Hello, 世界", result)\n\t}\n}');
          dispatch = atom.packages.getLoadedPackage('go-plus').mainModule.dispatch;
          dispatch.once('coverage-complete', function() {
            expect(dispatch.messages != null).toBe(true);
            expect(_.size(dispatch.messages)).toBe(0);
            dispatch.once('coverage-complete', function() {
              var markers;
              expect(dispatch.messages != null).toBe(true);
              expect(_.size(dispatch.messages)).toBe(0);
              markers = buffer.findMarkers({
                "class": 'gocover'
              });
              expect(markers).toBeDefined();
              expect(_.size(markers)).toBe(2);
              expect(markers[0]).toBeDefined;
              expect(markers[0].range).toBeDefined;
              expect(markers[0].range.start.row).toBe(4);
              expect(markers[0].range.start.column).toBe(13);
              expect(markers[0].range.end.row).toBe(6);
              expect(markers[0].range.end.column).toBe(1);
              expect(markers[1]).toBeDefined;
              expect(markers[1].range).toBeDefined;
              expect(markers[1].range.start.row).toBe(8);
              expect(markers[1].range.start.column).toBe(20);
              expect(markers[1].range.end.row).toBe(10);
              expect(markers[1].range.end.column).toBe(1);
              return done = true;
            });
            return testBuffer.save();
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

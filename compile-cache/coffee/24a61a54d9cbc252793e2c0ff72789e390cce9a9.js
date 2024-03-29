(function() {
  var Environment, Executor, GoExecutable, GocoverParser, fs, os, path, temp, _;

  path = require('path');

  fs = require('fs-plus');

  temp = require('temp').track();

  os = require('os');

  _ = require('underscore-plus');

  GoExecutable = require('./../../lib/goexecutable');

  GocoverParser = require('./../../lib/gocover/gocover-parser');

  Environment = require('./../../lib/environment');

  Executor = require('./../../lib/executor');

  describe('gocover parser', function() {
    var directory, done, env, environment, executor, filePath, go, gocoverparser, goexecutable, testFilePath, _ref;
    _ref = [], done = _ref[0], gocoverparser = _ref[1], environment = _ref[2], executor = _ref[3], goexecutable = _ref[4], go = _ref[5], env = _ref[6], directory = _ref[7], filePath = _ref[8], testFilePath = _ref[9];
    beforeEach(function() {
      done = false;
      environment = new Environment(process.env);
      executor = new Executor(environment.Clone());
      gocoverparser = new GocoverParser();
      directory = temp.mkdirSync();
      env = _.clone(process.env);
      env['GOPATH'] = directory;
      goexecutable = new GoExecutable(env);
      filePath = path.join(directory, 'src', 'github.com', 'testuser', 'example', 'go-plus.go');
      testFilePath = path.join(directory, 'src', 'github.com', 'testuser', 'example', 'go-plus_test.go');
      fs.writeFileSync(filePath, 'package main\n\nimport "fmt"\n\nfunc main()  {\n\tfmt.Println(Hello())\n}\n\nfunc Hello() string {\n\treturn "Hello, 世界"\n}\n');
      fs.writeFileSync(testFilePath, 'package main\n\nimport "testing"\n\nfunc TestHello(t *testing.T) {\n\tresult := Hello()\n\tif result != "Hello, 世界" {\n\t\tt.Errorf("Expected %s - got %s", "Hello, 世界", result)\n\t}\n}');
      runs(function() {
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
        return done = false;
      });
    });
    return it('parses the file for a single package correctly', function() {
      var args, cmd, cwd, tempDir, tempFile;
      done = false;
      cmd = go.executable;
      tempDir = temp.mkdirSync();
      tempFile = path.join(tempDir, 'coverage.out');
      args = ['test', "-coverprofile=" + tempFile];
      cwd = path.join(directory, 'src', 'github.com', 'testuser', 'example');
      done = function(exitcode, stdout, stderr, messages) {
        expect(exitcode).toBe(0);
        if (exitcode === 0) {
          gocoverparser.setDataFile(tempFile);
          return done = true;
        }
      };
      runs(function() {
        return executor.exec(cmd, cwd, env, done, args);
      });
      waitsFor(function() {
        return done === true;
      });
      return runs(function() {
        var packagePath, re, result, retext;
        retext = '^' + path.join(directory, 'src') + path.sep;
        if (os.platform() === 'win32') {
          retext = retext.replace(/\\/g, '\\\\');
        }
        re = new RegExp(retext);
        packagePath = filePath.replace(re, '');
        result = gocoverparser.rangesForFile(filePath);
        expect(result).toBeDefined();
        expect(_.size(result)).toBe(2);
        expect(result[0]).toBeDefined();
        expect(result[0].range.start).toBeDefined();
        expect(result[0].range.end).toBeDefined();
        expect(result[0].range.start.column).toBe(13);
        expect(result[0].range.start.row).toBe(4);
        expect(result[0].range.end.column).toBe(1);
        expect(result[0].range.end.row).toBe(6);
        expect(result[0].count).toBe(0);
        expect(result[0].file).toBe(packagePath);
        expect(result[1]).toBeDefined();
        expect(result[1].range.start).toBeDefined();
        expect(result[1].range.end).toBeDefined();
        expect(result[1].range.start.column).toBe(20);
        expect(result[1].range.start.row).toBe(8);
        expect(result[1].range.end.column).toBe(1);
        expect(result[1].range.end.row).toBe(10);
        expect(result[1].count).toBe(1);
        return expect(result[1].file).toBe(packagePath);
      });
    });
  });

}).call(this);

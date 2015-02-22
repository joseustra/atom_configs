(function() {
  var AtomConfig, fs, path, temp, _;

  path = require('path');

  fs = require('fs-plus');

  temp = require('temp').track();

  _ = require('underscore-plus');

  AtomConfig = require('./util/atomconfig');

  describe('vet', function() {
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
    describe('when vet on save is enabled', function() {
      beforeEach(function() {
        return atom.config.set('go-plus.vetOnSave', true);
      });
      it('displays errors for unreachable code', function() {
        var done;
        done = false;
        runs(function() {
          buffer.setText('package main\n\nimport "fmt"\n\nfunc main()  {\nreturn\nfmt.Println("Unreachable...")}\n');
          dispatch.once('dispatch-complete', function() {
            expect(fs.readFileSync(filePath, {
              encoding: 'utf8'
            })).toBe('package main\n\nimport "fmt"\n\nfunc main()  {\nreturn\nfmt.Println("Unreachable...")}\n');
            expect(dispatch.messages != null).toBe(true);
            expect(_.size(dispatch.messages)).toBe(1);
            expect(dispatch.messages[0]).toBeDefined();
            expect(dispatch.messages[0].column).toBe(false);
            expect(dispatch.messages[0].line).toBe('7');
            expect(dispatch.messages[0].msg).toBe('unreachable code');
            return done = true;
          });
          return buffer.save();
        });
        return waitsFor(function() {
          return done === true;
        });
      });
      return it('allows vet args to be specified', function() {
        var done;
        done = false;
        runs(function() {
          atom.config.set('go-plus.vetArgs', '-unreachable=true');
          buffer.setText('package main\n\nimport "fmt"\n\nfunc main()  {\nreturn\nfmt.Println("Unreachable...")}\n');
          dispatch.once('dispatch-complete', function() {
            expect(fs.readFileSync(filePath, {
              encoding: 'utf8'
            })).toBe('package main\n\nimport "fmt"\n\nfunc main()  {\nreturn\nfmt.Println("Unreachable...")}\n');
            expect(dispatch.messages != null).toBe(true);
            expect(_.size(dispatch.messages)).toBe(1);
            expect(dispatch.messages[0]).toBeDefined();
            expect(dispatch.messages[0].column).toBe(false);
            expect(dispatch.messages[0].line).toBe('7');
            expect(dispatch.messages[0].msg).toBe('unreachable code');
            return done = true;
          });
          return buffer.save();
        });
        return waitsFor(function() {
          return done === true;
        });
      });
    });
    return describe('when vet on save and format on save are enabled', function() {
      beforeEach(function() {
        atom.config.set('go-plus.formatOnSave', true);
        return atom.config.set('go-plus.vetOnSave', true);
      });
      return it('formats the file and displays errors for unreachable code', function() {
        var done;
        done = false;
        runs(function() {
          buffer.setText('package main\n\nimport "fmt"\n\nfunc main()  {\nreturn\nfmt.Println("Unreachable...")}\n');
          dispatch.once('dispatch-complete', function() {
            expect(fs.readFileSync(filePath, {
              encoding: 'utf8'
            })).toBe('package main\n\nimport "fmt"\n\nfunc main() {\n\treturn\n\tfmt.Println("Unreachable...")\n}\n');
            expect(dispatch.messages != null).toBe(true);
            expect(_.size(dispatch.messages)).toBe(1);
            expect(dispatch.messages[0]).toBeDefined();
            expect(dispatch.messages[0].column).toBe(false);
            expect(dispatch.messages[0].line).toBe('7');
            expect(dispatch.messages[0].msg).toBe('unreachable code');
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

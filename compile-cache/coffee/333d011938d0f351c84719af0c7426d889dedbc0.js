(function() {
  var AtomConfig, fs, path, temp;

  path = require('path');

  fs = require('fs-plus');

  temp = require('temp').track();

  AtomConfig = require('./util/atomconfig');

  describe('Go Plus', function() {
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
    return describe('when the editor is destroyed', function() {
      beforeEach(function() {
        atom.config.set('go-plus.formatOnSave', true);
        return editor.destroy();
      });
      return it('unsubscribes from the buffer', function() {
        var done;
        editor.destroy();
        done = false;
        runs(function() {
          var bufferSubscription;
          buffer.setText('package main\n\nfunc main()  {\n}\n');
          expect(editor.getGrammar().scopeName).toBe('source.go');
          bufferSubscription = buffer.onDidSave(function() {
            if (bufferSubscription != null) {
              bufferSubscription.dispose();
            }
            expect(fs.readFileSync(filePath, {
              encoding: 'utf8'
            })).toBe('package main\n\nfunc main()  {\n}\n');
            return done = true;
          });
          buffer.save();
          return expect(buffer.getText()).toBe('package main\n\nfunc main()  {\n}\n');
        });
        waits(function() {
          return 500;
        });
        runs(function() {
          return expect(fs.readFileSync(filePath, {
            encoding: 'utf8'
          })).toBe('package main\n\nfunc main()  {\n}\n');
        });
        return waitsFor(function() {
          return done === true;
        });
      });
    });
  });

}).call(this);

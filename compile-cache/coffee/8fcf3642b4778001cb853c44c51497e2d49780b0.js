(function() {
  var ShowTodoView, WorkspaceView, pathname, scan_mock, showTodoView;

  ShowTodoView = require('../lib/show-todo-view');

  WorkspaceView = require('atom').WorkspaceView;

  pathname = "dummyData";

  showTodoView = new ShowTodoView(pathname);

  describe("buildRegexLookups(regexes)", function() {
    return it("should return an array of objects (title, regex, results) when passed an array of regexes (and titles)", function() {
      var exp_regexes, findTheseRegexes, regexes;
      findTheseRegexes = ['FIXMEs', '/FIXME:(.+$)/g', 'TODOs', '/TODO:(.+$)/g', 'CHANGEDs', '/CHANGED:(.+$)/g'];
      regexes = showTodoView.buildRegexLookups(findTheseRegexes);
      exp_regexes = [
        {
          'title': 'FIXMEs',
          'regex': '/FIXME:(.+$)/g',
          'results': []
        }, {
          'title': 'TODOs',
          'regex': '/TODO:(.+$)/g',
          'results': []
        }, {
          'title': 'CHANGEDs',
          'regex': '/CHANGED:(.+$)/g',
          'results': []
        }
      ];
      return expect(regexes).toEqual(exp_regexes);
    });
  });

  describe("makeRegexObj(regexStr)", function() {
    it("should return a RegExp obj when passed a regex literal (string)", function() {
      var regexObj, regexStr;
      regexStr = "/TODO:(.+$)/g";
      regexObj = showTodoView.makeRegexObj(regexStr);
      expect(typeof regexObj.test).toBe("function");
      return expect(typeof regexObj.exec).toBe("function");
    });
    return it("should return false bool when passed an invalid regex literal (string)", function() {
      var regexObj, regexStr;
      regexStr = "arstastTODO:.+$)/g";
      regexObj = showTodoView.makeRegexObj(regexStr);
      return expect(regexObj).toBe(false);
    });
  });

  scan_mock = require('./fixtures/atom_scan_mock_result.json');

}).call(this);

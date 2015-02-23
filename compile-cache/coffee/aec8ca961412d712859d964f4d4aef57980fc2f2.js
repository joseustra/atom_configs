(function() {
  var $, $$$, Point, Q, ScrollView, ShowTodoView, TextEditorView, allowUnsafeEval, allowUnsafeNewFunction, fs, ignore, path, slash, vm, _, _ref, _ref1,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  vm = require('vm');

  Q = require('q');

  path = require('path');

  Point = require('atom').Point;

  _ref = require('atom-space-pen-views'), $$$ = _ref.$$$, TextEditorView = _ref.TextEditorView, ScrollView = _ref.ScrollView;

  $ = require('jquery');

  _ref1 = require('loophole'), allowUnsafeEval = _ref1.allowUnsafeEval, allowUnsafeNewFunction = _ref1.allowUnsafeNewFunction;

  fs = require('fs-plus');

  _ = require('underscore');

  slash = require('slash');

  ignore = require('ignore');

  module.exports = ShowTodoView = (function(_super) {
    __extends(ShowTodoView, _super);

    atom.deserializers.add(ShowTodoView);

    ShowTodoView.deserialize = function(_arg) {
      var filePath;
      filePath = _arg.filePath;
      return new ShowTodoView(filePath);
    };

    function ShowTodoView(filePath) {
      this.resolveJSPaths = __bind(this.resolveJSPaths, this);
      this.resolveImagePaths = __bind(this.resolveImagePaths, this);
      ShowTodoView.__super__.constructor.apply(this, arguments);
      this.handleEvents();
    }

    ShowTodoView.content = function() {
      return this.div({
        "class": 'show-todo-preview native-key-bindings',
        tabindex: -1
      });
    };

    ShowTodoView.prototype.initialize = function(serializeState) {
      return this.on('click', '.file_url a', (function(_this) {
        return function(e) {
          var link;
          link = e.target;
          return _this.openPath(link.dataset.uri, link.dataset.coords.split(','));
        };
      })(this));
    };

    ShowTodoView.prototype.serialize = function() {};

    ShowTodoView.prototype.destroy = function() {
      return this.detach();
    };

    ShowTodoView.prototype.getTitle = function() {
      return "Todo-show Results";
    };

    ShowTodoView.prototype.getURI = function() {
      return "todolist-preview://" + (this.getPath());
    };

    ShowTodoView.prototype.getPath = function() {};

    ShowTodoView.prototype.resolveImagePaths = function(html) {
      var img, imgElement, imgList, src, _i, _len;
      html = $(html);
      imgList = html.find("img");
      for (_i = 0, _len = imgList.length; _i < _len; _i++) {
        imgElement = imgList[_i];
        img = $(imgElement);
        src = img.attr('src');
        if (src.match(/^(https?:\/\/)/)) {
          continue;
        }
        img.attr('src', path.resolve(path.dirname(this.getPath()), src));
      }
      return html;
    };

    ShowTodoView.prototype.resolveJSPaths = function(html) {
      var js, scrElement, scrList, src, _i, _len;
      html = $(html);
      scrList = [html[5]];
      for (_i = 0, _len = scrList.length; _i < _len; _i++) {
        scrElement = scrList[_i];
        js = $(scrElement);
        src = js.attr('src');
        js.attr('src', path.resolve(path.dirname(this.getPath()), src));
      }
      return html;
    };

    ShowTodoView.prototype.showLoading = function() {
      return this.html($$$(function() {
        return this.div({
          "class": 'markdown-spinner'
        }, 'Loading Todos...');
      }));
    };

    ShowTodoView.prototype.buildRegexLookups = function(settingsRegexes) {
      var i, match, regex, regexes, _i, _len;
      regexes = [];
      for (i = _i = 0, _len = settingsRegexes.length; _i < _len; i = ++_i) {
        regex = settingsRegexes[i];
        match = {
          'title': regex,
          'regex': settingsRegexes[i + 1],
          'results': []
        };
        _i = _i + 1;
        regexes.push(match);
      }
      return regexes;
    };

    ShowTodoView.prototype.makeRegexObj = function(regexStr) {
      var flags, pattern, _ref2, _ref3;
      pattern = (_ref2 = regexStr.match(/\/(.+)\//)) != null ? _ref2[1] : void 0;
      flags = (_ref3 = regexStr.match(/\/(\w+$)/)) != null ? _ref3[1] : void 0;
      if (!pattern) {
        return false;
      }
      return new RegExp(pattern, flags);
    };

    ShowTodoView.prototype.fetchRegexItem = function(lookupObj) {
      var hasIgnores, ignoreRules, ignoresFromSettings, regexObj;
      regexObj = this.makeRegexObj(lookupObj.regex);
      if (!regexObj) {
        return false;
      }
      ignoresFromSettings = atom.config.get('todo-show.ignoreThesePaths');
      hasIgnores = ignoresFromSettings.length > 0;
      ignoreRules = ignore({
        ignore: ignoresFromSettings
      });
      return atom.workspace.scan(regexObj, function(e) {
        var include, match, pathToTest, regExMatch, _i, _len, _ref2;
        include = true;
        pathToTest = slash(e.filePath.substring(atom.project.getPath().length));
        if (hasIgnores && ignoreRules.filter([pathToTest]).length === 0) {
          include = false;
        }
        if (include) {
          _ref2 = e.matches;
          for (_i = 0, _len = _ref2.length; _i < _len; _i++) {
            regExMatch = _ref2[_i];
            while ((match = regexObj.exec(regExMatch.matchText))) {
              regExMatch.matchText = match[1];
            }
          }
          return lookupObj.results.push(e);
        }
      });
    };

    ShowTodoView.prototype.renderTodos = function() {
      var promise, promises, regexObj, regexes, _i, _len;
      this.showLoading();
      regexes = this.buildRegexLookups(atom.config.get('todo-show.findTheseRegexes'));
      promises = [];
      for (_i = 0, _len = regexes.length; _i < _len; _i++) {
        regexObj = regexes[_i];
        promise = this.fetchRegexItem(regexObj);
        promises.push(promise);
      }
      return Q.all(promises).then((function(_this) {
        return function() {
          var compiled, context, dust, templ_path, template;
          dust = require('dust.js');
          templ_path = path.resolve(__dirname, '../template/show-todo-template.html');
          if (fs.isFileSync(templ_path)) {
            template = fs.readFileSync(templ_path, {
              encoding: "utf8"
            });
          }
          compiled = dust.compile(template, "todo-template");
          dust.loadSource(compiled);
          context = {
            "filterPath": function(chunk, context, bodies) {
              return chunk.tap(function(data) {
                return atom.project.relativize(data);
              }).render(bodies.block, context).untap();
            },
            "results": regexes
          };
          return dust.render("todo-template", context, function(err, out) {
            return _this.html(out);
          });
        };
      })(this));
    };

    ShowTodoView.prototype.handleEvents = function() {};

    ShowTodoView.prototype.openPath = function(filePath, cursorCoords) {
      if (!filePath) {
        return;
      }
      return atom.workspaceView.open(filePath, {
        split: 'left'
      }, {
        allowActiveEditorChange: this.allowActiveEditorChange
      }).done((function(_this) {
        return function() {
          return _this.moveCursorTo(cursorCoords);
        };
      })(this));
    };

    ShowTodoView.prototype.moveCursorTo = function(cursorCoords) {
      var charNumber, editorView, lineNumber, position;
      lineNumber = parseInt(cursorCoords[0]);
      charNumber = parseInt(cursorCoords[1]);
      if (editorView = atom.workspaceView.getActiveView()) {
        position = [lineNumber, charNumber];
        editorView.scrollToBufferPosition(position, {
          center: true
        });
        return editorView.editor.setCursorBufferPosition(position);
      }
    };

    return ShowTodoView;

  })(ScrollView);

}).call(this);

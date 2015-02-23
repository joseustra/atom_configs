(function() {
  var $, ScrollView, TodoListView, _ref,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  _ref = require('atom'), $ = _ref.$, ScrollView = _ref.ScrollView;

  module.exports = TodoListView = (function(_super) {
    __extends(TodoListView, _super);

    function TodoListView() {
      this.resizeTodoList = __bind(this.resizeTodoList, this);
      this.resizeStopped = __bind(this.resizeStopped, this);
      this.resizeStarted = __bind(this.resizeStarted, this);
      return TodoListView.__super__.constructor.apply(this, arguments);
    }

    TodoListView.content = function() {
      return this.div({
        id: 'todo-list-panel',
        "class": 'tool-panel',
        'data-show-on-right-side': atom.config.get('todo-list.showOnRightSide')
      }, (function(_this) {
        return function() {
          _this.div({
            "class": 'todo-list-scroller',
            outlet: 'scroller'
          }, function() {
            return _this.ol({
              "class": 'todo-list full-menu list-tree focusable-panel',
              tabindex: -1,
              outlet: 'list'
            });
          });
          return _this.div({
            "class": 'todo-list-resize-handle',
            outlet: 'resizeHandle'
          });
        };
      })(this));
    };

    TodoListView.prototype.initialize = function(serializeState) {
      atom.workspaceView.command('todo-list:toggle', (function(_this) {
        return function() {
          return _this.toggle();
        };
      })(this));
      atom.workspaceView.command('todo-list:toggle-side', (function(_this) {
        return function() {
          return _this.toggleSide();
        };
      })(this));
      this.on('mousedown', '.todo-list-resize-handle', (function(_this) {
        return function(e) {
          return _this.resizeStarted(e);
        };
      })(this));
      this.on('core:close core:cancel', (function(_this) {
        return function() {
          return _this.detach();
        };
      })(this));
      this.subscribe(atom.config.observe('todo-list.showOnRightSide', {
        callNow: false
      }, (function(_this) {
        return function(newValue) {
          _this.detach();
          _this.attach();
          return _this.element.dataset.showOnRightSide = newValue;
        };
      })(this)));
      this.computedWidth = 200;
      this.changeDisposable = null;
      atom.workspace.onDidChangeActivePaneItem((function(_this) {
        return function(element) {
          if (_this.changeDisposable !== null) {
            _this.changeDisposable.dispose();
            _this.changeDisposable = null;
          }
          _this.handleEditorEvents();
          return _this.createReminderList();
        };
      })(this));
      return this.handleEditorEvents();
    };

    TodoListView.prototype.createReminderList = function() {
      var fixme, fixmeElement, fixmeHead, fixmeList, numFixme, numTodo, todo, todoElement, todoHead, todoList, _fn, _fn1, _i, _j, _len, _len1, _results;
      numTodo = 0;
      numFixme = 0;
      todoList = [];
      fixmeList = [];
      this.list[0].innerHTML = '';
      if (this.editor !== void 0) {
        this.editor.scan(/todo:\s*(.*)/gi, (function(_this) {
          return function(match) {
            if (match.match[1] === '') {
              return;
            }
            numTodo++;
            return todoList.push({
              text: match.match[1],
              line: match.range.start.row + 1,
              point: [match.range.start.row, match.range.start.column]
            });
          };
        })(this));
      }
      todoHead = document.createElement('li');
      todoHead.className = numTodo > 0 ? 'head incomplete' : 'head complete';
      todoHead.innerHTML = "TODO (" + numTodo + ")";
      this.list.append(todoHead);
      if (numTodo > 0) {
        _fn = function(editor, todo) {
          this.editor = editor;
          return todoElement.addEventListener('dblclick', (function(_this) {
            return function() {
              return _this.editor.setCursorBufferPosition(todo.point);
            };
          })(this));
        };
        for (_i = 0, _len = todoList.length; _i < _len; _i++) {
          todo = todoList[_i];
          todoElement = document.createElement('li');
          todoElement.innerHTML = this.createReminderElement(todo.text, todo.line);
          _fn(this.editor, todo);
          this.list.append(todoElement);
        }
      }
      if (this.editor !== void 0) {
        this.editor.scan(/fixme:\s*(.*)/gi, (function(_this) {
          return function(match) {
            if (match.match[1] === '') {
              return;
            }
            numFixme++;
            return fixmeList.push({
              text: match.match[1],
              line: match.range.start.row + 1,
              point: [match.range.start.row, match.range.start.column]
            });
          };
        })(this));
      }
      fixmeHead = document.createElement('li');
      fixmeHead.className = numFixme > 0 ? 'head incomplete' : 'head complete';
      fixmeHead.innerHTML = "FIXME (" + numFixme + ")";
      this.list.append(fixmeHead);
      if (numFixme > 0) {
        _fn1 = function(editor, fixme) {
          this.editor = editor;
          return fixmeElement.addEventListener('dblclick', (function(_this) {
            return function() {
              return _this.editor.setCursorBufferPosition(fixme.point);
            };
          })(this));
        };
        _results = [];
        for (_j = 0, _len1 = fixmeList.length; _j < _len1; _j++) {
          fixme = fixmeList[_j];
          fixmeElement = document.createElement('li');
          fixmeElement.innerHTML = this.createReminderElement(fixme.text, fixme.line);
          _fn1(this.editor, fixme);
          _results.push(this.list.append(fixmeElement));
        }
        return _results;
      }
    };

    TodoListView.prototype.createReminderElement = function(text, line) {
      text = this.shortenReminderMsg(text);
      return "<span class=\"msg\">" + text + "</span><hr /><span>on line " + line + "</span>";
    };

    TodoListView.prototype.shortenReminderMsg = function(text, maxLength) {
      if (maxLength == null) {
        maxLength = 30;
      }
      maxLength = Math.floor((this.computedWidth / 10) + 5 * ((this.computedWidth - 100) / 100) + 2);
      if (text.length >= maxLength) {
        return text.substring(0, maxLength - 2) + '...';
      } else {
        return text;
      }
    };

    TodoListView.prototype.handleEditorEvents = function() {
      this.editor = atom.workspace.getActiveTextEditor();
      if (this.editor !== void 0) {
        return this.changeDisposable = this.editor.onDidStopChanging((function(_this) {
          return function() {
            return _this.createReminderList();
          };
        })(this));
      }
    };

    TodoListView.prototype.resizeStarted = function() {
      $(document).on('mousemove', this.resizeTodoList);
      return $(document).on('mouseup', this.resizeStopped);
    };

    TodoListView.prototype.resizeStopped = function() {
      $(document).off('mousemove', this.resizeTodoList);
      return $(document).off('mouseup', this.resizeStopped);
    };

    TodoListView.prototype.resizeTodoList = function(_arg) {
      var pageX, which, width;
      pageX = _arg.pageX, which = _arg.which;
      if (which !== 1) {
        return this.resizeStopped();
      }
      if (atom.config.get('todo-list.showOnRightSide')) {
        width = $(document.body).width() - pageX;
      } else {
        width = pageX;
      }
      if (width < 100) {
        width = 100;
      }
      this.computedWidth = width;
      this.width(width);
      return this.createReminderList();
    };

    TodoListView.prototype.toggleSide = function() {
      return atom.config.toggle('todo-list.showOnRightSide');
    };

    TodoListView.prototype.detach = function() {
      this.list[0].innerHTML = '';
      return TodoListView.__super__.detach.apply(this, arguments);
    };

    TodoListView.prototype.serialize = function() {};

    TodoListView.prototype.destroy = function() {
      return this.detach();
    };

    TodoListView.prototype.attach = function() {
      this.createReminderList();
      if (atom.config.get('todo-list.showOnRightSide')) {
        this.element.classList.remove('panel-left');
        this.element.classList.add('panel-right');
        return atom.workspaceView.appendToRight(this);
      } else {
        this.element.classList.remove('panel-right');
        this.element.classList.add('panel-left');
        return atom.workspaceView.appendToLeft(this);
      }
    };

    TodoListView.prototype.toggle = function() {
      if (this.hasParent()) {
        return this.detach();
      } else {
        return this.attach();
      }
    };

    return TodoListView;

  })(ScrollView);

}).call(this);

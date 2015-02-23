(function() {
  var TodoList, WorkspaceView;

  WorkspaceView = require('atom').WorkspaceView;

  TodoList = require('../lib/todo-list');

  describe("TodoList", function() {
    var activationPromise;
    activationPromise = null;
    beforeEach(function() {
      atom.workspaceView = new WorkspaceView;
      return activationPromise = atom.packages.activatePackage('todo-list');
    });
    return describe("when the todo-list:toggle event is triggered", function() {
      return it("attaches and then detaches the view", function() {
        expect(atom.workspaceView.find('.todo-list')).not.toExist();
        atom.workspaceView.trigger('todo-list:toggle');
        waitsForPromise(function() {
          return activationPromise;
        });
        return runs(function() {
          expect(atom.workspaceView.find('.todo-list')).toExist();
          atom.workspaceView.trigger('todo-list:toggle');
          return expect(atom.workspaceView.find('.todo-list')).not.toExist();
        });
      });
    });
  });

}).call(this);

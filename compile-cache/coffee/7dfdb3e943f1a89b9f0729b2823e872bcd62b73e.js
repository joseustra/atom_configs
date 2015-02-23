(function() {
  var TodoListView;

  TodoListView = require('./todo-list-view');

  module.exports = {
    todoListView: null,
    activate: function(state) {
      return this.todoListView = new TodoListView(state.todoListViewState);
    },
    deactivate: function() {
      return this.todoListView.destroy();
    },
    serialize: function() {
      return {
        todoListViewState: this.todoListView.serialize()
      };
    }
  };

}).call(this);

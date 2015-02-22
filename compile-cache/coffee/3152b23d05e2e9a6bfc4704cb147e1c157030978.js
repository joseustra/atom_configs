(function() {
  var SplicerSplitter, _,
    __slice = [].slice;

  _ = require('underscore-plus');

  module.exports = SplicerSplitter = (function() {
    function SplicerSplitter() {}

    SplicerSplitter.prototype.splitAndSquashToArray = function(delimeter, arg) {
      var result;
      if (!((arg != null) && arg.length > 0)) {
        return [];
      }
      if (!((delimeter != null) && delimeter.length > 0)) {
        return [];
      }
      result = (function() {
        switch (delimeter) {
          case ' ':
            return arg.split(/[\s]+/);
          case ':':
            return arg.split(/[:]+/);
          case ';':
            return arg.split(/[;]+/);
          default:
            return [];
        }
      })();
      result = _.map(result, function(item) {
        if (item == null) {
          return '';
        }
        return item.trim();
      });
      return result = _.filter(result, function(item) {
        return (item != null) && item.length > 0 && item !== '';
      });
    };

    SplicerSplitter.prototype.spliceAndSquash = function() {
      var args, result;
      args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
      if (!((args != null) && args.length > 0)) {
        return '';
      }
      args = _.map.apply(_, __slice.call(args).concat([function(item) {
        if (item == null) {
          return '';
        }
        return item.trim();
      }]));
      args = _.filter(args, function(item) {
        return (item != null) && item.length > 0 && item.trim() !== '';
      });
      return result = args.join(' ');
    };

    return SplicerSplitter;

  })();

}).call(this);

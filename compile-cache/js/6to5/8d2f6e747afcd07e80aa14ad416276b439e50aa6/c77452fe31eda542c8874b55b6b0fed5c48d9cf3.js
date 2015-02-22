var quicksort = function () {
  var sort = function (items) {
    if (items.length <= 1) return items;
    var pivot = items.shift(),
        current,
        left = [],
        right = [];
    while (items.length > 0) {
      current = items.shift();
      current < pivot ? left.push(current) : right.push(current);
    }
    return sort(left).concat(pivot).concat(sort(right));
  };

  return sort(Array.apply(this, arguments));
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy91c3RyYWp1bmlvci8uYXRvbS9wYWNrYWdlcy9hdXRvY29tcGxldGUtcGx1cy9zcGVjL2ZpeHR1cmVzL3NhbXBsZS5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxJQUFJLFNBQVMsR0FBRyxZQUFZO0FBQzFCLE1BQUksSUFBSSxHQUFHLFVBQVMsS0FBSyxFQUFFO0FBQ3pCLFFBQUksS0FBSyxDQUFDLE1BQU0sSUFBSSxDQUFDLEVBQUUsT0FBTyxLQUFLLENBQUM7QUFDcEMsUUFBSSxLQUFLLEdBQUcsS0FBSyxDQUFDLEtBQUssRUFBRTtRQUFFLE9BQU87UUFBRSxJQUFJLEdBQUcsRUFBRTtRQUFFLEtBQUssR0FBRyxFQUFFLENBQUM7QUFDMUQsV0FBTSxLQUFLLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRTtBQUN0QixhQUFPLEdBQUcsS0FBSyxDQUFDLEtBQUssRUFBRSxDQUFDO0FBQ3hCLGFBQU8sR0FBRyxLQUFLLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO0tBQzVEO0FBQ0QsV0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztHQUNyRCxDQUFDOztBQUVGLFNBQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLFNBQVMsQ0FBQyxDQUFDLENBQUM7Q0FDM0MsQ0FBQyIsImZpbGUiOiIvVXNlcnMvdXN0cmFqdW5pb3IvLmF0b20vcGFja2FnZXMvYXV0b2NvbXBsZXRlLXBsdXMvc3BlYy9maXh0dXJlcy9zYW1wbGUuanMiLCJzb3VyY2VzQ29udGVudCI6WyJ2YXIgcXVpY2tzb3J0ID0gZnVuY3Rpb24gKCkge1xuICB2YXIgc29ydCA9IGZ1bmN0aW9uKGl0ZW1zKSB7XG4gICAgaWYgKGl0ZW1zLmxlbmd0aCA8PSAxKSByZXR1cm4gaXRlbXM7XG4gICAgdmFyIHBpdm90ID0gaXRlbXMuc2hpZnQoKSwgY3VycmVudCwgbGVmdCA9IFtdLCByaWdodCA9IFtdO1xuICAgIHdoaWxlKGl0ZW1zLmxlbmd0aCA+IDApIHtcbiAgICAgIGN1cnJlbnQgPSBpdGVtcy5zaGlmdCgpO1xuICAgICAgY3VycmVudCA8IHBpdm90ID8gbGVmdC5wdXNoKGN1cnJlbnQpIDogcmlnaHQucHVzaChjdXJyZW50KTtcbiAgICB9XG4gICAgcmV0dXJuIHNvcnQobGVmdCkuY29uY2F0KHBpdm90KS5jb25jYXQoc29ydChyaWdodCkpO1xuICB9O1xuXG4gIHJldHVybiBzb3J0KEFycmF5LmFwcGx5KHRoaXMsIGFyZ3VtZW50cykpO1xufTtcbiJdfQ==
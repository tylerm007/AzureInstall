angular.module('admin')  // TODO this should not be here
.directive('ngmultiselect', function () {
    return {
        link: function (scope, element, attrs) {
            element.multiselect({
                buttonClass: 'btn',
                buttonWidth: 'auto',
                buttonContainer: '<div class="btn-group" />',
                maxHeight: false,
                buttonTextOrig: function(options) {
                    if (options.length == 0) {
                      return 'Select Columns(s) <b class="caret"></b>';
                    }
                    else if (options.length > 4) {
                      return options.length + ' selected  <b class="caret"></b>';
                    }
                    else {
                      var selected = '';
                      options.each(function() {
                        selected += $(this).text() + ', ';
                      });
                      return selected.substr(0, selected.length -2) + ' <b class="caret"></b>';
                    }
                },
                
                buttonText: function(options) {
                	if (options.length == 0) {
                		return 'Select Column(s) <b class="caret"></b>';
                	}
                	else if (options.length > 4) {
                		return options.length + ' selected ';
                	}
                	else {
                		var selected = [];
                		options.each(function() {
                			selected.push([$(this).text(), $(this).data('order')]);
                		});
                		selected.sort(function(a, b) {
                			return a[1] - b[1];
                		});

                		var text = '';
                		for (var i = 0; i < selected.length; i++) {
                			text += selected[i][0] + ', ';
                		}

                		return text.substr(0, text.length -2) + ' ';
                	}
                },
                onChange: function(option, checked) {
                	if (checked) {
                		var parent = option.parent()[0];
                		var orderCount = jQuery.data(parent, "orderCount" );
                		if( typeof orderCount == 'undefined') {
                			orderCount = 0;
                		}
                		orderCount++;
                		jQuery.data(parent, "orderCount", orderCount );
                		$(option).data('order', orderCount);
                	}
                	else {
                		$(option).data('order', '');
                	}
                }                
            });

            // Watch for any changes to the length of our select element
            scope.$watch(function () {
                return element[0].length;
            }, function () {
                element.multiselect('rebuild');
            });

            // Watch for any changes from outside the directive and refresh
            scope.$watch(attrs.ngModel, function () {
                element.multiselect('rebuild');
            });

        }

    };
});
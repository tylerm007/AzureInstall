espresso.app.directive('parentDraggable', function() {
	return {
		// A = attribute, E = Element, C = Class and M = HTML Comment
		restrict:'A',
		link: function(scope, element, attrs) {
			var $element = angular.element(element);
			var $parent = $element.parent();
			if (!$parent.find('.dragHandle').length) {
				$element.addClass('dragHandle');
			}
			$parent.draggable({handle:'.dragHandle', cancel: '.modal-column-container div'});
		}
	};
});

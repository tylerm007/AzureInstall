espresso.app.service('Evaluator', [
	'$rootScope',
	function ($rootScope) {
		function evaluateExpression(scope, data) {
			console.log(data);
			if (!data || !data.expression) {return '';} //if the expression is an empty string, return empty string;
			var evaluatesTo = scope.$eval(data.expression);
			if (evaluatesTo) {
				return data.onTrue;
			}
			return data.onFalse;
		}
		var Evaluator = function (scope, col, tableName) {
			console.log(col);
			var evaluator = {};
			var cssBaseClass = 'custom-' + tableName;
			var containerClass = 'column-container-' + col.name;
			var evals = col.eval;
			evaluator.teardown = function () {
				angular.element('style[class^=' + cssBaseClass + '-' + col.name + ']').remove();
			};
			evaluator.evaluate = function (expression, index) {
				var customClass = cssBaseClass + '-' + col.name + '-' + index;
				var selector = '.' + containerClass + ' ' + expression.selector;
				
				//remove classes
				angular.element('.' + customClass).removeClass(customClass);
				
				//add classes and style element
				if (expression.selector.charAt(0) == '+') {
					selector = expression.selector.replace('+', '');
				}
				var $selected = angular.element(selector);
				$selected.addClass(customClass);
				angular.element('<style>#app .' + customClass + '{' + evaluateExpression(scope, expression) + '}</style>')
					.addClass(customClass)
					.appendTo('body');
			};
			evaluator.build = function () {
				evaluator.teardown();
				angular.forEach(evals, evaluator.evaluate);
			};
			return evaluator;
		};
		return Evaluator;
	}
]);
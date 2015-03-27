describe('espressoDetail', function () {
	var el, $scope, controller;
	
	beforeEach(function () {
		return;
		module('espresso.browser');
		inject(function ($injector, $rootScope, $controller) {
			rootScope = $rootScope.$new();
			rootScope.root = {};
			$scope = rootScope.$new();
			controller = $controller(controllerName, {
				$scope: $scope,
				$rootScope: rootScope
			});
		});
		return;
	});
	
	describe('$scope.Evaluator.eval X params', function () {
		it('should result in Y scenario', function () {
			//Evaluator has to be abstracted into a service
			return;
			$scope.col = {
				eval: [
					{
						expression: '"alpha" != "beta"',
						onFalse: 'falseStyle',
						onTrue: 'trueStyle',
						selector: 'input'
					}
				],
				name: 'columnName'
			};
			
			
			
			//expect($scope.Evaluator.styles).toEqual('<style>#app .' + customClass + '{' + evaluateExpression(expression) + '}</style>');
		});
	});
	
	//out of place because these are behaviors that belongs to this scope
		//or in an app initialization area
	describe('root.mainGridEvaluate give X', function () {
		it('should modify scope.styles (Y)', function () {
			
		});
	});
	describe('root.childGridEvaluate give X', function () {
		it('should modify scope.styles (Y)', function () {
			
		});
	});
});
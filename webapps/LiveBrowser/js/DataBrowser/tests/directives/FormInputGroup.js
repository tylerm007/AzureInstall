var objectName = 'formInputGroup'
describe(objectName, function () {
	var $scope, controller;
	
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
	
	describe('$scope.setColumnSettingsDataToOrder() ', function () {
		it('should set $scope.columns', function () {
			
		});
	});
});
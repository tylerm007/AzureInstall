describe('espresso.HeaderCtrl', function () {
	var $scope, controller, rootScope;
	var controllerName = 'espresso.HeaderCtrl';
	
	beforeEach(function () {
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
	
	describe('$rootScope.$on("directLinkCloseSections")', function () {
		it('should detect params.closed:"child" and Event.broadcast("CloseWindow")', function () {
			rootScope.$broadcast('directLinkCloseSections', {closed: 'child'});
			
		});
	});
	

	describe('directLinkCloseSections scenario child', function () {
		it('should toggle panel states to child closed', function () {
			
		});
	});
});
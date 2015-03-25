describe('kahuna.home.HomeCtrl', function () {
	var controllerName = 'kahuna.home.HomeCtrl';
	var $scope, controller, $rootScope;
	
	beforeEach(function () {
		module('admin');
		inject(function ($injector, $rootScope, $controller) {
			rootScope = $rootScope.$new();
			$rootScope = rootScope;
			rootScope.root = {};
			$scope = rootScope.$new();
			kahuna.layout = {
				open: function () {}
			};
			kahuna.helpLayout = {
				open: function () {},
				readState: function () {return {north:{size:200}}}
			};

			controller = $controller(controllerName, {
				$scope: $scope,
				$rootScope: rootScope
			});
		});
		return;
	});

	describe('$rootScope.updateLiveBrowserUrl()', function () {
		it('should set $rootScope.liveBrowserUrl acording to $rootScope.currentProject', function () {
			expect(true).toBe(false);
			return;
			$rootScope.currentProject = {
				
			};
			//expect(true).toBe(false);
		});
	});
});
describe('espresso.ListCtrl', function () {
	var $scope, controller, rootScope;
	
	beforeEach(function () {
		module('espresso.browser');
		inject(function ($injector, $rootScope, $controller) {
			rootScope = $rootScope.$new();
			rootScope.root = {};
			$scope = rootScope.$new();
			controller = $controller('espresso.ListCtrl', {
				$scope: $scope,
				$rootScope: rootScope
			});
		});
		return;
	});
	
	//z#869
	describe('$scope.escapeStringValues()', function () {
		it('should escape "\'" characters in an input string', function () {
			var string = "Alpha's";
			string = $scope.escapeStringValues(string);
			expect(string).toEqual("Alpha\\'s");
		});
	});
	
	//
	describe('$scope.getDataToSave()', function () {
		it('should return an array with elements if there are records to save.', function () {
			$scope.gridData = [{
				'@metadata': {
					action: true
				}
			}];
			
			var data = rootScope.getMainSaveData();

			expect(data.length).toBeGreaterThan(0);
		});
	});
	describe('$scope.getDataToSave()', function () {
		it('should return an empty array if there are no action rows', function () {
			$scope.gridData = [{
				'@metadata': {
				}
			}];
			
			var data = rootScope.getMainSaveData();
			
			expect(data.length).toBe(0);
		});
	});
	
	return;
	describe('$scope.', function () {
		it('should ', function () {
			
		});
	});
});
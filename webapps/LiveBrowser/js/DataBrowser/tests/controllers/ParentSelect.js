describe('espresso.ParentSelectCtrl', function () {
	var $scope, controller, rootScope;
	var controllerName = 'espresso.ParentSelectCtrl';
	
	beforeEach(function () {
		module('espresso.browser');
		inject(function ($injector, $rootScope, $controller) {
			rootScope = $rootScope.$new();
			rootScope.root = {};
			$scope = rootScope.$new();
			rootScope.allTables = {
				tableA: {
					columns: []
				}
			};
			var modalInstanceMock = {};
			var childTableInfoMock = {
				parentsByName: {
					roleNameA: {
						parent_table: 'tableA'
					}
				}
			};
			var childRowMock = {};
			var roleNamesMock = ['roleNameA'];
			var callbackMock = function () {};
			var EspressoDataMock = {
				query: function () {}
			};
			controller = $controller(controllerName, {
				$scope: $scope,
				$rootScope: rootScope,
				$modalInstance: modalInstanceMock,
				childTableInfo: childTableInfoMock,
				childRow: childRowMock,
				roleNames: roleNamesMock,
				callback: callbackMock,
				EspressoData: EspressoDataMock
			});
		});
		return;
	});
	
	//z#980
	//mock of a binary column with a raw column.value
	var raw = {
		value: 'raw'
	}
	//mock of a binary column with a reference column.url
	var reference = {
		url: 'url'
	}
	describe('$scope.isBinaryRaw(column)', function () {
		it('should return a boolean based on column', function () {
			expect($scope.isBinaryRaw(raw)).toBe(true);
			expect($scope.isBinaryRaw(reference)).toBe(false);
		});
	});
	describe('$scope.isBinaryReference(column)', function () {
		it('should return a boolean based on column', function () {
			expect($scope.isBinaryReference(raw)).toBe(false);
			expect($scope.isBinaryReference(reference)).toBe(true);
		});
	});
});
describe('espresso.ChildrenCtrl', function () {
	var $scope, controller;
	
	beforeEach(function () {
		module('espresso.browser');
		inject(function ($injector, $rootScope, $controller) {
			$scope = $rootScope.$new();
			controller = $controller('espresso.ChildrenCtrl', {
				$scope: $scope
			});
		});
		return;
	});
	
	describe('$scope.refreshLocally()', function () {
		it('should set $scope.childrenArea.gridData to $scope.currentGridData', function () {
			var result = [];
			$scope.scalarRow = {
				'@metadata': {
					links: [{role: 'alpha'}]
				}
			};
			$scope.getCurrentTab = function () {return 'alpha';};
			$scope.currentGridData = {alpha: [{}, {}, {}]};
			$scope.childrenArea = {gridData: {'alpha': [{}]}};
			
			result = $scope.refreshLocally();
			
			expect(result.length).toBe(3);
			expect($scope.childrenArea.gridData['alpha']).toEqual(result);
		});
	});
	
	describe('$scope.isRefreshRequired()', function () {
		it('should return false if live browser is aware of no changes', function () {
			var result = null;
			$scope.scalarRow = {'@metadata': {checksum: 'alpha'}};
			$scope.currentScalarRow = {'@metadata': {checksum: 'alpha'}};
			
			result = $scope.isRefreshRequired(false);
			
			expect(result).toEqual(false);
		});
	});
	
	//z#891
	describe('$scope.isRefreshRequired() [z#891]', function () {
		it('should return true when scalarRow checksums do not match', function () {
			$scope.scalarRow = {
				'@metadata': {checksum: 'a'}
			};
			$scope.currentScalarRow = {
				'@metadata': {checksum: 'b'}
			};
			var ret = $scope.isRefreshRequired(false);
			
			expect(ret).toBe(true);
		});
	});
	describe('$scope.refreshLocally() [z#891]', function () {
		it('should restore $scope.childrenArea.gridData to a previous value', function () {
			$scope.currentGridData = {
				roleName: ['grid', 'data']
			};
			$scope.scalarRow = {'@metadata': {
				links: [
					{role: 'roleName'}
				]
			}};
			$scope.childrenArea = {
				gridData: {
					roleName: ['gridData']
				}
			};
			$scope.getCurrentTab = function () {
				return 'roleName';
			};
			$scope.refreshLocally();
			
			expect($scope.childrenArea.gridData).toEqual($scope.currentGridData);
			expect($scope.childrenArea.gridData[$scope.getCurrentTab()].length).toBe(2);
		});
	});

	
	return;
	describe('$scope.', function () {
		it('should ', function () {
			
		});
	});
});
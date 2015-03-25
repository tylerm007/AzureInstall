var controllerName = 'espresso.GridOptionsCtrl';
describe(controllerName, function () {
	var $scope, controller, area, childName, callback, Tables;
	
	beforeEach(function () {
		module('espresso.browser');
		inject(function ($injector, $rootScope, $controller) {
			rootScope = $rootScope.$new();
			rootScope.root = {};
			$scope = rootScope.$new();
			area = 'scalar';
			childName = 'beta';
			callback = function () {};
			var tableObject = {
				name: 'name',
				scalarColumns: {},
				columnFormats: {},
				parentSettings: {
					parentRoleAlpha: {
						columnFormats: {}
					}
				}
			};
			Tables = {mainTable: 'main', formTable: 'form',getDetails: function () {return tableObject;}, getSettings: function () {return tableObject;}};
			controller = $controller(controllerName, {
				$scope: $scope,
				$rootScope: rootScope,
				childName: childName,
				callback: callback,
				area: area,
				'$modalInstance': {},
				Tables: Tables
			});
		});
		return;
	});
	

	describe('$scope.getColumnGroup(columName)', function () {
		it('should return the coordinates columnName in $scope.params.groups.columns', function () {
			$scope.params = {
				groups: [{
					columns: [
						'columnNameAlpha',
						'columnNameBeta'
					]
				}]
			};
			
			var coords = $scope.getColumnGroup('columnNameAlpha');
			
			expect(coords).toEqual({group:0, column: 0});
		});
	});

	describe('$scope.removeColumnFromGroups()', function () {
		it('should remove columns from $scope.params.groups[index].columns', function () {
			$scope.params = {
				groups: [{
					columns: [
						'columnNameAlpha',
						'columnNameBeta'
					]
				}]
			};
			$scope.getColumnGroup = function () {return {group:0, column:0}};
			
			$scope.removeColumnFromGroups('columnNameBeta');
			
			expect($scope.params.groups[0].columns.length).toBe(1);
		});
	});

	describe('$scope.addColumnToGroups()', function () {
		it('should add a column to $scope.params.groups[0].columns', function () {
			$scope.params = {
				groups: [{
					columns: [
						'columnNameAlpha',
						'columnNameBeta'
					]
				}]
			};

			$scope.addColumnToGroups('columnNameGamma');
			
			expect($scope.params.groups[0].columns.length).toBe(3);
		});
	});

	describe('$scope.removeParentColumnFromGroups()', function () {
		it('should remove a parent column from $scope.params.groups[index]', function () {
			$scope.params = {
				groups: [{
					columns: [
						'columnNameAlpha',
						'columnNameBeta',
						'parentRoleAlpha/columnNameGamma'
					]
				}]
			};
			$scope.getColumnGroup = function () {return {group:0, column:0}};
			
			$scope.removeParentColumnFromGroups('columnNameGamma', {columns: {columnNameGamma: {parentRole: 'parentRoleAlpha'}}});
			
			expect($scope.params.groups[0].columns.length).toBe(2);
		});
	});
	
	describe('$scope.addParentColumnToGroups', function () {
		it('should ', function () {
			$scope.params = {
				groups: [{
					columns: [
						'columnNameAlpha',
						'columnNameBeta'
					]
				}]
			};
			
			$scope.addParentColumnToGroups('columnNameGamma', {columns: {columnNameGamma: {parentRole: 'parentRoleAlpha'}}});
			
			expect($scope.params.groups[0].columns.length).toBe(3);
		});
	});
	
});
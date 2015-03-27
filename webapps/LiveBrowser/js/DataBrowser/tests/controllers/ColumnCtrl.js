describe('espresso.ColumnCtrl', function () {
	var controllerName = 'espresso.ColumnCtrl';
	var $scope, controller, Settings, Tables, $rootScope, tableName, broadcaster, $rootScope;
	
	beforeEach(function () {
		module('espresso.browser');
		inject(function ($injector, $rootScope, $controller, _Settings_) {
			//var Tables = $injector.get('Tables');
			Tables = {};
			Tables.getTableSettings = function () {return {};};
			Settings = _Settings_;
			tableName = 'tableName';
			broadcaster = 'broadcaster';
			var area = 'area';
			var childName = 'childName';
			rootScope = $rootScope.$new();
			$rootScope = rootScope;
			rootScope.root = {};
			$scope = rootScope.$new();

			controller = $controller(controllerName, {
				$scope: $scope,
				$rootScope: rootScope,
				Tables: Tables,
				broadcaster: broadcaster,
				area: area,
				tableName: tableName,
				colInfo: 'gamma',
				colSettings: {eval: ['delta']},
				callback: 'epsilon',
				roleName: 'zeta',
				childName: childName,
				'$modalInstance': 'eta',
				Settings: Settings
			});
		});
		return;
	});
	
	describe('$scope.applySettings()', function () {
		it('should request a save', function () {
			return;
			spyOn(Settings, 'saveTableSettings');
			$scope.updateSettingsObject = function () {};
			
			$scope.applySettings();

			expect(Settings.saveTableSettings).toHaveBeenCalled();
		});
	});
	
	describe('$scope.isTextType(options)', function () {
		it('should return the correct boolean based on options.type', function () {
			var expectTrue = $scope.isTextType({type: 'text'});
			var expectFalse = $scope.isTextType({type: 'notText'});
			expect(expectTrue).toBe(true);
			expect(expectFalse).toBe(false);
		})
	});
	
	describe('$scope.hideField(fieldName)', function () {
		it('should set a value in $scope based on fieldName', function () {
			expect($scope.hide_fieldName).toBeUndefined();
			$scope.hideField('fieldName');
			expect($scope.hide_fieldName).toBe(true);
		});
	});
});
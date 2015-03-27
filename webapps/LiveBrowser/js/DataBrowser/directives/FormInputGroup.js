espresso.app.directive('formInputGroup', [
		
	function () {
		var FormInputGroup = {
			restrict: 'A',
			template: '<div ng-show="keys.length && visibleColumns.length" class="eslo-form-input-group form-input-group even-{{!$even}} odd-{{!$odd}}">' +
					'<div class="form-input-group-title"><strong>{{group.title}}</strong></div>' +
					'<div class="dynamic-column-row" ng-repeat="(attName, att) in columns | array | filter:attribFilter:attributeSearchString">' +
						'<div form-input-row label-placement="{{labelPlacement}}">{{att}}</div>' +
					'</div>' +
				'</div>',
			//link: function (scope, element, attrs, controller) {},
			controller: [
				'$scope', 'Tables', 'Events', '$filter',
				function ($scope, Tables, Events, $filter) {
					$scope.keys = [];
					$scope.visibleColumns = [];
					Events.on('FormColumnFilterChange', function (event, filter) {
						$scope.visibleColumns = $scope.$eval('columns | array | filter:attribFilter:attributeSearchString');
					});
					$scope.setColumnSettingsDataToOrder = function setColumnSettingsDataToOrder() {
						if (!$scope.group) { return; }
						var settings = Tables.getSettings(Tables.formTable);
						$scope.columns = {};
						angular.forEach($scope.group.columns, function getColumnSettings(column, index) {
							if (settings.scalarColumns[column]) {
								$scope.columns[column] = settings.scalarColumns[column];
							}
						});
						
						$scope.visibleColumns = _.values($scope.columns);
						$scope.keys = _.keys($scope.columns);
					};
					$scope.setColumnSettingsDataToOrder();
					Events.on('OptionsSettingUpdate', function (event, data) {
						$scope.group = data.settings.groups[$scope.$index];
						$scope.setColumnSettingsDataToOrder();
					});
				}
			]
		};
		return FormInputGroup;
	}
]);
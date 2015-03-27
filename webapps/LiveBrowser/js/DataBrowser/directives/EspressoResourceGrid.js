espresso.app.directive('espressoResourceGrid', [
	'$rootScope' ,
	function ($rootScope) {
		var EspressoResourceGrid = {
			restrict: 'A',
			scope: {
				columns: '=',
				gridData: '=',
				gridName: '@'
			},
			template: '<div ng-grid="gridOptions"></div>',
			//link: function (scope, element, attributes, controller){},
			controller	: [
				'$scope', '$rootScope', 'ResourceHelper', 'CellTemplates', 'Events',
				function ($scope, $rootScope, ResourceHelper, CellTemplates, Events) {
					$scope.selectedRows = [];
					$scope.columnDefinitions = [];

					$scope.isDisplayable = function isDisplayable() {
						return !!$scope.columns;
					};
					
					$scope.$watch('gridData', function () {
						$scope.columnDefinitions = [];
						var $grid = angular.element('.eslo-search-grid .ngGrid');
						$grid.show();
						if ($scope.isDisplayable()) {
							_.each($scope.columns, function (element, index) {
								var definition = {
									cellTemplate: CellTemplates.getByGenericType('text').template,
									displayName: element,
									headerCellTemplate: CellTemplates.getTemplate('header').template,
									slug: element,
								};
								if (ResourceHelper.isUtilityColumn(element)) {
									definition.cellTemplate = CellTemplates.getTemplate(ResourceHelper.utilityColumnName).template;
									definition.displayName = '';
									definition.width = '25px';
								}
								
								$scope.addColumnDefinition(definition);
							});
							$scope.initOptions();
						}
						else {
							$grid.hide();
						}
					});
					
					$scope.$watch('selectedRows[0]', function (current, previous) {
						if (!current) {return;}
						var data = {
							row: current
						};
						Events.broadcast('WatchResourceRow', data);
					});
					
					$scope.initOptions = _.throttle(function (data) {
						if (data) {} //init from data code-space
						$scope.gridOptions = {
							data: 'gridData',
							enableCellSelection: true,
							enableCellEdit: false,
							enableRowSelection: true,
							enableColumnResize: true,
							useExternalSorting: true,
							enableColumnReordering: $rootScope.root.authorMode,
							//beforeSelectionChange : $scope.selectRow,
							multiSelect: false,
							rowHeight:35,
							maintainColumnRatios: true,
							showSelectionCheckbox: false,
							enablePaging: false,
							showFilter: false,
							showFooter: false,
							columnDefs: 'columnDefinitions',
							rowTemplate: '<div style="height: 100%" ng-class="getGridRowStyle(row)" class="eslo-search-table-row">' +
								'<div ng-repeat="col in renderedColumns" ng-class="col.colIndex()" class="ngCell ">' +
								'<div ng-cell></div>' +
								'</div>' +
								'</div>',
							selectedItems: $scope.selectedRows,
							keepLastSelected: true
						};
					}, 2000);

					$scope.addColumnDefinition = function addColumnDefinition(columnDefinition) {
						var columnDefault = {
							displayName: "",
							width: "25%",
							enableCellEdit: false,
							enableCellSelection: false,
							groupable: false,
						};
						
						var mergedDefinition = $.extend({}, columnDefault, columnDefinition);

						$scope.columnDefinitions.push(mergedDefinition);
					};
					
					//initializations
					$scope.initOptions();
				}
			]
		};
		return EspressoResourceGrid;
}]);
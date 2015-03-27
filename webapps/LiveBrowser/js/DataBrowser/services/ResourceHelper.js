espresso.app.service('ResourceHelper', [
	'$rootScope', '$http', 'Tables', 'Events',
	function ($rootScope, $http, Tables, Events) {
		var ResourceHelper = {
			sections: {},
			utilityColumnName: 'EspressoResourceUtilityColumn',
			formResource: {},
			resourceRow: undefined,
			lastResourceRow: undefined,
			isInitialized: function () {
                return !!ResourceHelper.resourceRow;
			},
			//runs first resource view
			initialize: function () {
            	ResourceHelper.resourceRow = {};
            	ResourceHelper.lastResourceRow = {};
			},
			isRestorable: function (currentMode) {
				if (currentMode == 'resources') {
					return true;
				}
				return false;
			},
			restoreLastRow: function () {
				var broadcast = {
					row : ResourceHelper.lastResourceRow
				};
				setTimeout(function () {
					Events.broadcast('WatchResourceRow', broadcast);
					$rootScope.$apply();
				}, 50);
			},
			saveCurrentRow: function () {
				ResourceHelper.lastResourceRow = ResourceHelper.resourceRow;
			},
			//request from /@resources
			getAllResources: function requestResources() {
				ResourceHelper.schema = $http.get(espresso.projectUrl + '@resources/*', Tables.buildRequestConfig()).success(function (resources) {
					var resourceObject = {};
					_.each(resources, function (resource) {
						resourceObject[resource.name] = resource;
					});
					$rootScope.root.allResources = resourceObject;
				});
				return ResourceHelper.schema;
			},
			updateFormResource: function updateFormResource(row) {
				ResourceHelper.formResource = row;
			},
			getFormResource: function getFormResource() {
				return ResourceHelper.formResource;
			},
			isPaginatedData: function isPaginatedData(data) {
				if (data && data.length ) {
					if (data[data.length-1]['@metadata'] && _.pick(data[data.length-1]['@metadata'], 'next_batch')) {
						return true;
					}
				}
				return false;
			},
			getPaginationObject: function getPaginationObject(data) {
				return _.pick(data[data.length-1]['@metadata'], 'next_batch');
			},
			getGridColumns: function getGridColumns(data) {
				//look for shared columns with text or numeric values
				var niceColumns = ResourceHelper.getNiceColumns(data);
				if (niceColumns.length) {
					niceColumns.unshift(ResourceHelper.utilityColumnName);
					return niceColumns;
				}
				return false;
			},
			getSimpleAttributes: function (data) {
				var columns = {};
				_.each(data, function (element, index) {
					if (angular.isString(element) || angular.isNumber(element)) {
						columns[index] = element;
					}
				});
				
				return columns;
			},
			getNiceColumns: function getNiceColumns(data) {
				if (angular.isArray(data[0])) {
					//this is an array of arrays, there will be no human readable columns 
					return false;
				}
				else {
					var columns = ResourceHelper.getAllColumns(data);
					var sharedColumns = ResourceHelper.getSharedColumns(data, columns);
					var displayableColumns = ResourceHelper.getDisplayableColumns(data, sharedColumns);
					
					return displayableColumns;
				}
			},
			getAllColumns: function getAllColumns(data) {
				var columns = [];
				_.each(data, function (element, index) {
					columns.push(_.keys(element));
				});
				
				return columns;
			},
			getSharedColumns: function getSharedColumns(data, columns) {
				var shared = columns[0];
				_.each(columns, function (element, index) {
					shared = _.intersection(shared, element);
				});
				
				return shared;
			},
			getDisplayableColumns: function getDisplayableColumns(data, columns) {
				var displayable = [];
				_.each(columns, function (column, index) {
					if (angular.isString(data[0][column]) || angular.isNumber(data[0][column])) {
						displayable.push(column);
					}
				});
				
				return displayable;
			},
			isUtilityColumn: function isUtilityColumn(name) {
				if (name == ResourceHelper.utilityColumnName) {
					return true;
				}
				return false;
			}
		};
		return ResourceHelper;
	}
]);
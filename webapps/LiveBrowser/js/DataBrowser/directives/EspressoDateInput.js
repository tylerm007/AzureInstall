'use strict';
espresso.app.directive('espressoDateInput', [
	'$rootScope',
	function ($rootScope) {
		var EspressoDateInput = {
			restrict: 'A',
			scope: {
				ngModel: '=',
				col: '=',
				settingsReference: '@'
			},
			template: '<div class="well display-inline border-none padding-0 box-shadow-none">' +
    			'<div id="input-{{$id}}" class="input-append date display-inline">' +
            		'<input ng-input="COL_FIELD" class="form-control visibility-none display-inline datepicker form-inline" data-date-format="{{params.formats.picker}}" ng-model="data.localTime" type="text"/>'+ //date formatted to standard javascript
            		' <span class="add-on"><button ng-blur="controls.blurPicker();" ng-click="forceTriggerUpdate()" class="fa fa-calendar" title="Edit this date"></button></span>' +
            		//' <span><button ng-click="nullDate();" class="fa fa-trash-o"></button></span>' +
        		'</div>' +
    		'</div>' +
    		' <span><button ng-click="controls.setDate(null);" class="fa fa-trash-o" title="Set this value to null"></button></span> ' +
    		'<span ng-show="params.displayInput"> {{data.isoFormat|InputMask:params.col.maskType:params.col.mask:params.col.type:params.col.generic_type:col.generic_type}}</span>'
			,
    		//'{{row[col.dataSource]|InputMask:col.maskType:col.mask:col.type:col.generic_type}} ' +
			//link: function (scope, element, attributes, controller){},
			controller: ['$scope', 'Events', 'Tables', function ($scope, Events, Tables) {
				//values, watchable & exposed to helpers
				$scope.params = {};
				//methods, exposable to external helpers, used by controls
				$scope.helpers = {};
				//wrapping functions for user interfaces
				$scope.controls = {};
				//internal, intended exclusively for the template
				$scope.data = {};
				
				//console.log($scope);
				$scope.params.formats = {
					iso: 'YYYY-MM-DDTHH:mm:ss.SSSZZ',
					picker: 'YYYY-MM-DD HH:mm:ss',
				};
				
				$scope.params.col = {};
				$scope.helpers.refreshColParams = function getColParams() {
					if ($scope.settingsReference) {
						if ($scope.settingsReference == 'mainTable') {
							var settings = Tables.getSettings(Tables[$scope.settingsReference]);
							$scope.params.col = settings.gridColumns[$scope.col.dataSource];
						}
						
						if ($scope.settingsReference == 'formTable') {
							var settings = Tables.getSettings(Tables[$scope.settingsReference]);
							$scope.params.col = settings.scalarColumns[$scope.col.dataSource];
						}
						
						if ($scope.settingsReference == 'childTable') {
							var settings = Tables.getSettings(Tables.formTable);
							$scope.params.col = settings.childrenSettings[$scope.col.tableName].gridColumns[$scope.col.dataSource];
						}
					}
				};
				
				$scope.forceTriggerUpdate = function forceTriggerUpdate() {
					$('#input-' + $scope.$id).find('input').trigger('change');
				};
				
				$scope.$watch('ngModel', function (current) {
					var isEmptyStr = angular.equals('', current);
					if (isEmptyStr) { current = null; }
					$('#input-' + $scope.$id).datetimepicker('remove');
					
					var isNull = angular.equals(null, current);
					if (current || isNull) {
						$scope.$evalAsync(function () {
							//setup directive vars
    						var date = new Date();
    						var offset = date.getTimezoneOffset();
							$scope.data.localTime = moment(angular.copy(current)).local().format($scope.params.formats.picker); //date formatted to moment.js
    						$scope.data.isoFormat = moment(angular.copy(current)).local().format($scope.params.formats.iso); //date formatted to moment.js
    						
							var $input = $('#input-' + $scope.$id);
    						var settings = {
								language:'en',
								defaultDate: $scope.data.localTime,
								useMinutes: true,
								useSeconds: true
							};
    						if ($scope.data.localTime == 'Invalid date') {
    							$scope.data.localTime = moment(new Date()).local().format($scope.params.formats.picker); //date formatted to moment.js
        						$scope.data.isoFormat = moment(new Date()).local().format($scope.params.formats.iso); //date formatted to moment.js
    							delete settings.defaultDate;
    							settings.useCurrent = true;
    						}
    						//init picker
							$input.datetimepicker(settings);
							
							$input.on('dp.hide', function (event) {
								$scope.$apply();
								$scope.controls.blurPicker();
							});
							
							$scope.helpers.refreshColParams(); //filter/mask settings update
							
    						if (isNull) {
    							$scope.$broadcast('params.displayInput', false);
    						}
    						else {
    							$scope.$broadcast('params.displayInput', true);
    						}
						});
					}
				});
				
				$scope.$on('params.displayInput', function (event, value) {
					$scope.params.displayInput = value;
				});

				$scope.controls.blurPicker = function blurInput() {
					var $input = $('#input-' + $scope.$id + ' input');
					var val = $input.val();
					var timeObject = moment(val);
					var iso = timeObject.utc().format($scope.params.formats.iso);
					if (timeObject.isValid()) {
						//$scope.ngModel = iso;
						$scope.ngModel = iso.replace('+0000', 'Z');
					}
					else {
						$scope.ngModel = null;
					}
					Events.broadcast('RefreshRowIsUpdated');
					//timeout justifcation: digest hasn't finished when blurPicker() fires
					setTimeout(function () {
						$('input.datepicker').blur();
					});
				};
				
				// @param date either null or API/iso format
				$scope.controls.setDate = function (date) {
					$scope.ngModel = date;
					$scope.$broadcast('params.displayInput', false);
				};

			}]
		};
		return EspressoDateInput;
}]);
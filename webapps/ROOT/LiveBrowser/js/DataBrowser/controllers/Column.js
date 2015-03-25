/**
 * @ngdoc controller
 * @name Column
 */
espresso.app.controller('espresso.ColumnCtrl', [
	'$scope', 'tableName', 'colInfo', 'colSettings', 'callback', 'broadcaster', 'roleName', 'Tables', '$rootScope', 'Masks', '$modalInstance', 'Settings', 'Events', '$modal',
	function ($scope, tableName, colInfo, colSettings, callback, broadcaster, roleName, Tables, $rootScope, Masks, $modalInstance, Settings, Events, $modal) {
		//$scope.originalSettings = _.clone(colSettings);
		$scope.columnInfo = colInfo;
		
		//[@IMPORTANT: if broadcaster === 'ChildrenCtrl', we are actually saving children settings
		var saveTableSettings = Tables.getTableSettings(tableName); //saved on $scope.close()
		var currentTableInfo = Tables.getDetails(tableName);
		var tableSettings = saveTableSettings; //used when assigning updates [everything outside of $scope.close()]
		if (broadcaster === 'ChildrenCtrl') {
			var formTableName = angular.element('.details-content').scope().formTableName;
			saveTableSettings = Tables.getTableSettings(formTableName);
			tableSettings = saveTableSettings.childrenSettings[roleName];
		}
		//@IMPORTANT]
		
		$scope.eval = angular.copy(colSettings.eval);
		
		$scope.clearDefaultFilters = function clearDefaultFilters() {
			$scope.form.filterParentColumn = null;
			$scope.form.filterRowColumn = null;
		};
		
		//is a foreign key that is not being represented by a parent lookup
		if (colInfo.isFk && !colSettings.dataSource.match(/\_\_internal/)) {
			
			var foreignKeyToTableMap = {};
			angular.forEach(currentTableInfo.parents, function (relationship, index) {
				angular.forEach(relationship.child_columns, function (c, i) {
					foreignKeyToTableMap[c] = relationship.parent_table;
				});
			});
			angular.forEach(currentTableInfo.children, function (relationship, index) {
				angular.forEach(relationship.parent_columns, function (c, i) {
					foreignKeyToTableMap[c] = relationship.child_table;
				});
			});
			var columns = _.values(tableSettings.scalarColumns);
			var parentColumns = Tables.getDetails(foreignKeyToTableMap[colInfo.name]).columns;
			$scope.columns = [];
			$scope.parentColumns = [];
			angular.forEach(columns, function (col, index) {
				if (col.generic_type != 'binary') {
					$scope.columns.push(col);
				}
			});
			angular.forEach(parentColumns, function (col, index) {
				if (col.generic_type != 'binary') {
					$scope.parentColumns.push(col);
				}
			});
		}

		if (broadcaster == 'DetailsCtrl') {
			//this was broadcast from the form view
			$scope.$watch('eval', function () {
				Events.broadcast('ColumnExpressionUpdate', {
					column: colInfo,
					eval: $scope.eval
				});
			}, true);
		}
		
		$scope.addExp = function addExp() {
			$scope.eval.push({
				expression: '',
				selector: '.column-container',
				onTrue: '',
				onFalse: ''
			});
			$scope.activateExpression($scope.eval.length-1);
		};
		$scope.activeExp = null;
		$scope.activeIndex = null;
		$scope.activateExpression = function activateExpression(index) {
			$scope.activeExp = $scope.eval[index];
			$scope.activeIndex = index;

			setTimeout(function () {
				angular.element('.expression-tab').removeClass('active');
				angular.element('.expression-tab.index-' + index).addClass('active');
			}, 50);
		};
		$scope.activateExpression(0);
		$scope.deleteExpression = function deleteExpression() {
			var continueDelete = confirm('Are you sure you want to remove this expression?');
			if (continueDelete) {
				$scope.eval.splice($scope.activeIndex,1);
				try{
					$scope.activateExpression(0);
				} catch(e) {}
			}
			Events.broadcast('ColumnExpressionUpdate', {
				column: colInfo,
				eval: $scope.eval
			});
		};
		
		$scope.expressionInfo = function expressionInfo() {
			$modal.open({
				backdrop	: true,
				keyboard	: true,
				templateUrl	: 'templates/modals/expressionsInfo.html'
			});
		};
		
		if (!colSettings) {
			colSettings = tableSettings.columnFormats[colInfo.name];
		}
		
		function detectEnterKey(event) {
			if (event.which === 13) {
				var $modalsOpen = angular.element('.modal-content');
				if ($modalsOpen.length) {
					$scope.close();
					angular.element('body').unbind('keyup', detectEnterKey);
				}
			}
		}
		angular.element('body').keyup(detectEnterKey);
		
		$scope.close = function(){
			$scope.applySettings();
			$modalInstance.close();
			if (callback)
				callback();
		};
		$scope.checkAliasValue = function checkAliasValue() {
			if (!$scope.form.alias) {
				$scope.form.alias = $scope.columnInfo.name;
			}
		};
		
		$scope.updateSettingsObject = function updateSettingsObject() {
			if (tableSettings.columnFormats[colSettings.name]) {
				tableSettings.columnFormats[colSettings.name].eval = angular.copy($scope.eval);
			}
			else {
				angular.forEach(tableSettings.gridColumns, function (column, index) {
					if (angular.equals(column.dataSource, colSettings.dataSource)) {
						column = angular.copy(colSettings);
					}
				});
			}
		};
		
		$scope.applySettings = function applyColumnSettings() {
			$scope.updateSettingsObject();
			$rootScope.$emit('tableDisplayUpdated', tableName, 'ColumnCtrl');
			Events.broadcast('ColumnSettingsUpdate');
			Settings.saveTableSettings(saveTableSettings);
		};

		$scope.isTextType = function isTextType(options) {
			if (options.type === 'text') {
				return true;
			}
			return false;
		};
		$scope.hideField = function hideField(fieldName) {
			$scope['hide_' + fieldName] = true;
		};
		
		$scope.form = colSettings;
		// Set up masking options
		
		Masks.get(colSettings.generic_type)
			.then(function (options) {
				$scope.defaults = options.defaults;
				$scope.maskType = options.type;
				if ($scope.isTextType(options)) {
					$scope.hideField('cellFormat');
				}
				if ( ! tableSettings.columnFormats[colSettings.name]) {
					console.log('Unable to get column format for ' + colSettings.name);
				}
				colSettings.maskType = options.type;
			})
			['catch'](function () {
				$scope.unmaskable = true;
			});

		$scope.showBinaryOptions = 'binary' === colSettings.generic_type;
		$scope.showExtensionOptions = false;
		$scope.binaryTypes = ['Audio', 'Image'];
		$scope.applicableExtensions = [];
		var extensions = {
			'Audio': [
				{name: 'MP3', type: 'audio/mpeg'},
				{name: 'OGG', type: 'audio/ogg'},
				{name: 'WAV', type: 'audio/wav'}
			]
		};
		if ($scope.showBinaryOptions) {
			$scope.binaryType = colSettings.binaryType;
		}
		$scope.updateApplicableExtensions = function () {
			colSettings.binaryType = $scope.binaryType;
			if (angular.isDefined(extensions[$scope.binaryType])) {
				$scope.applicableExtensions = extensions[$scope.binaryType];
				$scope.showExtensionOptions = true;
			} else {
				$scope.showExtensionOptions = false;
			}
		};
		$scope.$evalAsync(function () {
			$scope.updateApplicableExtensions();
		});
}]);

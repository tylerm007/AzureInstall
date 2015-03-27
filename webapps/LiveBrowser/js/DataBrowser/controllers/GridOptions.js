/**
 * @ngdoc controller
 * @name GridOptions
 */
espresso.app.controller( 'espresso.GridOptionsCtrl', [
	'$scope' , 'Tables' , 'area', 'childName', 'callback', '$rootScope' , '$modalInstance' , 'Events', '$timeout', 'Notifications', '$modal',
	function($scope, Tables, area, childName, callback, $rootScope, $modalInstance, Events, $timeout, Notifications, $modal){
		var table = null;
		var settingsName = null;
		var tableSettings = null;
		if (area == 'grid') {
			table = Tables.getDetails(Tables.mainTable);
			tableSettings = Tables.getSettings(table.name);
			settingsName = table.name;
		}
		else if (area == 'scalar') {
			table = Tables.getDetails(Tables.formTable);
			tableSettings = Tables.getSettings(Tables.formTable);
			settingsName = table.name;
		}
		else if (area == 'children') {
			tableSettings = Tables.getSettings(Tables.formTable).childrenSettings[childName];
			table = Tables.getDetails(tableSettings.tableName);
			settingsName = table.name;
		}
		

		$scope.tableName = table.name;
		if (childName)
			$scope.tableName = table.name + " via " + tableSettings.name;
		$scope.form = {};
		$scope.form.table = {};
		$scope.form.table.expressedTitle = tableSettings.expressedTitle;
		
		// Set up the data so, when the user closes the dialog, we can determine what columns were selected
		$scope.form.columns = {};
		_.each(tableSettings.columnFormats, function(info, colName) {
			$scope.form.columns[colName] = {type: info.type, alias: info.alias, displayed: false};
		});

		$scope.form.parents = {};
		_.each(table.parents, function (p) {
			var parentSettings = Tables.getTableSettings(p.parent_table);
			$scope.form.parents[p.name] = {table: p.parent_table, columns: {}};
			var parentTableInfo = $rootScope.allTables[p.parent_table];
			_.each(parentTableInfo.columns, function(c) {
				//console.log('GridOptionsCtrl: column ' + c.name);
				$scope.form.parents[p.name].columns[c.name] = {
					name: c.name,
					type: c.type,
					maskType: null,
					mask: null,
					generic_type: c.generic_type,
					alias: parentSettings.columnFormats[c.name].alias,
					displayed: false,
					parentRole: p.name,
					// Note: it would obviously be preferable to use parentRows['foo'] rather
					// than parentRows.foo so that any unusual characters in the column name
					// does not fail. Sadly, ng-grid seems to have problems with that.
					dataSource: '__internal.parentRows.' + p.name + '.' + c.name
				};
			});
		});

		// Mark the displayed columns as such
		var colList = null;
		if (area == 'grid')
			colList = tableSettings.gridColumns;
		else if (area == 'scalar')
			colList = tableSettings.scalarColumns;
		else if (area == 'children')
			colList = tableSettings.gridColumns;
		else
			throw "Not yet supported: col selection for this area";
		_.each(colList, function(col, colName) {
			if (col.parentRole) {
				$scope.form.parents[col.parentRole].columns[col.name].displayed = true;
			}
			else {
				$scope.form.columns[col.name].displayed = true;
			}
		});
		
		
		//////////////////////////////////////////////////////////////////////////////////
		$scope.close = function(){
			$modalInstance.close();
			$scope.applySettings();
			if (callback)
				callback();
		};

		$scope.validateSettings = function validateSettings() {
			$scope.removeDuplicatesInGroups();
		};
		$scope.removeDuplicatesInGroups = function removeDuplicatesInGroups() {
			angular.forEach(tableSettings.groups, function searchGroups(group, index) {
				group.columns = _.uniq(group.columns);
			});
		};
		
		$scope.applySettings = function applyGridSettings() {
			Notifications.suspend('promptUnsaved', 1000);
			$scope.validateSettings();
			$scope.saveChanges();
			var data = {
				tableName: table.name,
				area: area,
				settings: tableSettings
			};

			Events.broadcast('UpdatedGridColumns', data);
			Events.broadcast('OptionsSettingUpdate', data);
			$rootScope.$emit('columnSelectionUpdated', data);
		};
		
		$scope.updateScalarOrder = function updateScalarOrder() {
			var checkedColumns = {};
			var uncheckedColumns = {};
			var orderedColumns = {};
			_.each($scope.form.columns, function(col, colName) {
				if ( ! col.displayed) {
					uncheckedColumns[colName] = tableSettings.columnFormats[colName];
					return;
				}
				checkedColumns[colName] = tableSettings.columnFormats[colName];
			});
			angular.forEach($scope.form.parents, function(roleData, roleName) {
				angular.forEach(roleData.columns, function (col, colName) {
					if (!col.displayed) {
						uncheckedColumns[roleName + '/' + colName] = tableSettings.parentSettings[roleName].columnFormats[colName];
						return;
					}
					checkedColumns[roleName + '/' + colName] = tableSettings.parentSettings[roleName].columnFormats[colName];
				});
			});

			angular.forEach(tableSettings.scalarColumns, function (details, name) {
				if (angular.isDefined(checkedColumns[name])) {
					orderedColumns[name] = checkedColumns[name];
				}
			});
			var reorder = {};
			if (angular.isDefined($scope.scalarOrder)) {
				angular.forEach($scope.scalarOrder, function (columnName, index) {
					reorder[columnName] = orderedColumns[columnName];
				});
			}
			else {
				reorder = orderedColumns;
			}
			angular.forEach(checkedColumns, function (details, name) {
				if (angular.isUndefined(reorder[name])) {
					reorder[name] = checkedColumns[name];
				}
			});
			
			angular.forEach(reorder, function (details, name) {
				if (uncheckedColumns[name]) {
					delete reorder[name];
				}
			});
			tableSettings.scalarColumns = reorder;
			tableSettings.labelPlacement = $scope.params.labelPlacement;
		};
		
		//UI event handler - routes to helpers
		$scope.columnsChanged = function columnsChanged(displayed, column, parent) {
			if (area != 'scalar') {return;}
			if (displayed) {
				if (parent) {
					$scope.addParentColumnToGroups(column, parent);
				}
				else {
					$scope.addColumnToGroups(column);
				}
			}
			else {
				if (parent) {
					$scope.removeParentColumnFromGroups(column, parent);
				}
				else {
					$scope.removeColumnFromGroups(column);
				}
				
			}
		};
		$scope.getColumnGroup = function getColumnGroup(columnName) {
			var groupIndex = false;
			var columnIndex = false;
			var isInParams = false;
			angular.forEach($scope.params.groups, function searchGroups(group, index) {
				angular.forEach(group.columns, function searchColumns(col, colIndex) {
					if (col == columnName) {
						isInParams = true;
						groupIndex = index;
						columnIndex = colIndex;
					}
				});
			});
			if (isInParams) {
				return {
					group: groupIndex,
					column: columnIndex
				};
			}
			else {
				return false;
			}
		};
		
		$scope.removeColumnFromGroups = function removeColumnFromGroups(column) {
			var coordinates = $scope.getColumnGroup(column);
			if (coordinates) {
				var columns = $scope.params.groups[coordinates.group].columns;
				delete tableSettings.scalarColumns[column]; 
				$scope.params.groups[coordinates.group].columns = _.without(columns, column);
			}
		};
		$scope.addColumnToGroups = function addColumnToGroups(column) {
			var coordinates = $scope.getColumnGroup(column);
			if (!coordinates) {
				tableSettings.scalarColumns[column] = tableSettings.columnFormats[column];
				$scope.params.groups[0].columns.push(column);
			}
		};
		$scope.removeParentColumnFromGroups = function removeParentColumnFromGroups(column, parent) {
			var fullColumnName = parent.columns[column].parentRole + '/' + column;
			var coordinates = $scope.getColumnGroup(fullColumnName);
			if (coordinates) {
				var columns = $scope.params.groups[coordinates.group].columns;
				delete tableSettings.scalarColumns[fullColumnName]; 
				$scope.params.groups[coordinates.group].columns = _.without(columns, fullColumnName);
			}
		};
		$scope.addParentColumnToGroups = function addParentColumnToGroups(column, parent) {
			var fullColumnName = parent.columns[column].parentRole + '/' + column;
			var coordinates = $scope.getColumnGroup(fullColumnName);
			if (!coordinates) {
				var roleName = parent.columns[column].parentRole;
				tableSettings.scalarColumns[fullColumnName] = tableSettings.parentSettings[roleName].columnFormats[column];
				$scope.params.groups[0].columns.push(fullColumnName);
			}
		};
		
		
		//////////////////////////////////////////////////////////////////////////////////
		// Apply any changes to the relevant area
		$scope.saveChanges = function() {
			var checkedColumns = {};
			var uncheckedColumns = {};
			var orderedColumns = {};
			_.each($scope.form.columns, function(col, colName) {
				if ( ! col.displayed) {
					uncheckedColumns[colName] = tableSettings.columnFormats[colName];
					return;
				}
				checkedColumns[colName] = tableSettings.columnFormats[colName];
			});
			angular.forEach($scope.form.parents, function(roleData, roleName) {
				angular.forEach(roleData.columns, function (col, colName) {
					if (!col.displayed) {
						uncheckedColumns[roleName + '/' + colName] = tableSettings.parentSettings[roleName].columnFormats[colName];
						return;
					}
					checkedColumns[roleName + '/' + colName] = tableSettings.parentSettings[roleName].columnFormats[colName];
				});
			});
			
			var saveToTable = settingsName;
			
			///GRID
			if (area == 'grid') {
				angular.forEach(tableSettings.gridColumns, function (details, name) {
					if (angular.isDefined(checkedColumns[name])) {
						orderedColumns[name] = checkedColumns[name];
					}
				});
				angular.forEach(checkedColumns, function (details, name) {
					if (angular.isUndefined(orderedColumns[name])) {
						orderedColumns[name] = checkedColumns[name];
					}
				});
				tableSettings.gridColumns = orderedColumns;
			}
			
			///SCALAR
			else if (area == 'scalar') {
				angular.forEach(checkedColumns, function (details, name) {
					if (angular.isDefined(checkedColumns[name])) {
						orderedColumns[name] = checkedColumns[name];
					}
				});
				
				var reorder = {};
				if (angular.isDefined($scope.scalarOrder)) {
					angular.forEach($scope.scalarOrder, function (columnName, index) {
						reorder[columnName] = orderedColumns[columnName];
					});
					
				}
				else {
					reorder = orderedColumns;
				}
				angular.forEach(checkedColumns, function (details, name) {
					if (angular.isUndefined(reorder[name])) {
						$scope.params.groups[0].columns.push(name);
						reorder[name] = checkedColumns[name];
					}
				});
				
				angular.forEach(reorder, function (details, name) {
					if (uncheckedColumns[name]) {
						delete reorder[name];
					}
				});
				
				tableSettings.scalarColumns = reorder;
				tableSettings.labelPlacement = $scope.params.labelPlacement;
			}
			
			//CHILDREN
			else if (area == 'children') {
				var scalarTableSettings = Tables.getSettings(Tables.formTable);
				saveToTable = scalarTableSettings.name;
				angular.forEach(scalarTableSettings.childrenSettings[childName].gridColumns, function (details, name) {
					if (angular.isDefined(checkedColumns[name])) {
						orderedColumns[name] = checkedColumns[name];
					}
				});
				angular.forEach(checkedColumns, function (details, name) {
					if (angular.isUndefined(orderedColumns[name])) {
						orderedColumns[name] = checkedColumns[name];
					}
				});
				scalarTableSettings.childrenSettings[childName].gridColumns = orderedColumns;
				$rootScope.$emit('childSettingsChanged');
			}

			_.each($scope.form.parents, function(parent, parentName) {
				_.each(parent.columns, function(col, colName) {
					if (col.displayed) {
						var parentColName = parentName + "/" + colName;
						orderedColumns[parentColName] = col;
					}
				});
			});
			
			//update any general table settings here:
			angular.forEach($scope.form.table, function (value, key) {
				tableSettings[key] = value;
				console.log(key);
			});
			console.log(tableSettings);
			$scope.validateSettings();
			Tables.saveTableSettings(saveToTable);
		};

		$scope.expressionInfo = function expressionInfo() {
			$modal.open({
				backdrop	: true,
				keyboard	: true,
				templateUrl	: 'templates/modals/formTitleExpressionInfo.html'
			});
		};
		
		////////////
		//TABBING
		$scope.tabTo = function tabTo(section) {
			var $element = angular.element('.tab-section[data-section="' + section + '"]');
			
			//remove actives
			angular.element('.tab-section').removeClass('active');
			angular.element('.tab-list li').removeClass('active');
			
			//activate new tab
			angular.element('.tab-list li[data-section="' + section + '"]').addClass('active');
			$element.addClass('active');
		};
		
		$scope.scalarSettings = false;
		if (area === 'scalar') {
			$scope.scalarSettings = true;
			$scope.scalarOrder = _.keys(tableSettings.scalarColumns);
			$scope.scalarColumns = tableSettings.scalarColumns;
			$scope.$watch('scalarOrder', function (current) {
				if (current) {
					OptionsRefreshSortable();
				}
			});
		}
		$scope.inputBehaviors = [
 			{placement: 'Left'},
 			{placement: 'Top'}
 		];
 		$scope.params = {
 			groups: tableSettings.groups,
 			labelPlacement: tableSettings.labelPlacement
 		};
 		
 		function forceGrouping() {
 			if ($scope.params.groups.length == 1) {
 				$scope.params.groups[0].columns = _.keys(tableSettings.scalarColumns);
 			}
 		};
 		$scope.$watch('params.groups', function (current) {
 			if (area !== 'scalar') { return; }
 			if (current.length < 1) {
 				$scope.addGroup();
 				$scope.$evalAsync(forceGrouping);
 			}
 		});
 		
 		function reMapGroupings() {
 			var $groups = angular.element('.grouping-area');
 			angular.forEach($groups, function(group, index) {
 				var $group = angular.element(group);
 				var $items = $group.find('.column-item');
 				$scope.params.groups[index].columns = [];
 				angular.forEach($items, function (item, i) {
 					var $item = angular.element(item);
 					var key = $item.data('column-key');
 					$scope.params.groups[index].columns[i] = key;
 				});
 			});
 		};
		
 		$scope.addGroup = function addGroup() {
 			//test case: params.groups object added
 			var group = {
 				title: '',
 				columns: {}
 			};
 			$scope.params.groups.push(group);
 		};
 		
 		$scope.removeGroup = function removeGroup(index) {
 			OptionsRefreshSortable();
 			var columnsCount = _.keys($scope.params.groups[index].columns).length;
 			if (columnsCount>0) {
 				Notifications.error('Groups with active columns cannot be deleted. Please remove them before deleting.');
 			}
 			else {
 				$scope.params.groups.splice(index, 1);
 			}
 		};
 		
 		var OptionsRefreshSortable = _.throttle(function OptionsRefreshSortable() {
			var $sortable = $('.sortable');
			$sortable.sortable({
				revert: true,
				connectWith: '.sortable',
				stop: function stopSortColumnOrder(event, ui) {
					var reorder = [];
					$('.column-item').each(function (index, element) {
						reorder.push($(element).data('column-key'));
					});
					$scope.scalarOrder = reorder;
					$scope.updateScalarOrder();
					reMapGroupings();
					Events.broadcast('OptionsSettingUpdate', {
						settings: tableSettings
					});
				}
			});
 		}, 300);
 		
 		Events.on('OptionsRefreshSortable', OptionsRefreshSortable);
 		
}]);
espresso.app.controller('espresso.ChildrenCtrl', [
	'$compile', 'Device', 'EspressoData', 'EspressoUtil', 'Events', '$http', '$location', 'Masks', '$modal', 'Notifications',
		'Query', '$resource', '$rootScope', '$routeParams', '$sce', '$scope', 'Settings', 'Tables', '$timeout', '$interval',
	function ($compile, Device, EspressoData, EspressoUtil, Events, $http, $location, Masks, $modal, Notifications,
		Query, $resource, $rootScope, $routeParams, $sce, $scope, Settings, Tables, $timeout, $interval) {
	var throttleDefault = 1000;
	$scope.childrenArea = {};
	$scope.childrenArea.selectedChildrenRows = {};
	$scope.childrenArea.activeChildTabs = {};
	$scope.childrenArea.nextChildBatch = {};
	$scope.empty = [];
	$scope.outputGrid = [];
	$scope.isFetchable = false;//childrenArea.nextChildBatch[getCurrentTab()]
	$scope.selected = {};
	var activeChildSettings = {};
	
	$scope.focusTable = function focusTable() {
		var data = {};
		var settings = scalarTableSettings.childrenSettings[$scope.getCurrentTab()];
		if (settings && settings.tableName) {
			data.broadcaster = 'main'; //ListCtrl expects this set
			data.details = Tables.getDetails(settings.tableName);
			data.settings = Tables.getSettings(settings.tableName);
			
			Events.broadcast('FocusMainTable', data);
		}
	};
	
	Events.on('WatchFormRow', function (event, data) {
		$scope.scalarRow = data.row;

		$scope.hasChildrenRelationships = $scope.hasChildren(data);
		
		$scope.$evalAsync($scope.refreshChildGrid);
	});
	
	var scalarTableInfo = {}; //used throughout
	var scalarTableSettings = {}; //used throughout
	var currentFormData = {}; //used only to rebroadcast WatchFormTable after settings update, justifiable only in my haste (mdh)
	$scope.formChildrenTables = {}; //a list of the first x number of children tables
	$scope.selectableChildrenTables = {}; //a list of all the other children tables not output by default
	$scope.activeSelectableTable = false; //the currently output child grid table from $scope.selectableChildrenTable
	
	$scope.$watch('selectableChildrenTables', function () {
		var keys = _.keys($scope.selectableChildrenTables);

		if (keys) {
			$scope.selectableChildrenTablesLength = keys.length;
		}
	});

	$scope.addToDisplayedTabs = function addToDisplayedTabs(childName, definition) {
		$scope.formChildrenTables[childName] = definition;
	};
	$scope.addToSelectableTabs = function addToSelectableTabs(childName, definition) {
		$scope.selectableChildrenTables[childName] = definition;
	};
	
	Events.on('WatchFormTable', function (event, data) {
		currentFormData = data;
		scalarTableInfo = data.details;
		scalarTableSettings = data.settings;
		//scalarTableSettings.childrenSettings
		var i = 0;
		var form;
		$scope.formChildrenTables = {};
		$scope.selectableChildrenTables = {};
		$scope.activeSelectableTable = false;
		angular.forEach(scalarTableSettings.childrenSettings, function (child, childName) {
			var formChildrenTablesLength = _.keys($scope.formChildrenTables);
			if (formChildrenTablesLength.length < 4 && child.displayed) {
				$scope.addToDisplayedTabs(child.name, {
					'alias' : child.alias,
					'selected' : child.selected,
					'displayed' : child.displayed,
					'name' : child.name
				});
			}
			else {
				if (child.displayed) {
					$scope.addToSelectableTabs(child.name, {
						'alias' : child.alias,
						'selected' : child.selected,
						'displayed' : child.displayed,
						'name' : child.name
					});
				}
			}
			i++;
		});
		if (_.keys($scope.selectableChildrenTables).length) {
			$scope.activeSelectableTable = $scope.selectableChildrenTables[_.keys($scope.selectableChildrenTables)[0]];
		}
		else {
			$scope.activeSelectableTable = false;
		}
		
		if ($scope.hasDisplayedChildren() && !$scope.hasActiveTab()) {
			//no active tab, update to z#1010
			$scope.updateGridTo($scope.formChildrenTables[_.keys($scope.formChildrenTables)[0]]);
		}
		$scope.formChildrenTablesKeys = _.keys($scope.formChildrenTables);
		
		Events.broadcast('RefreshChildGrid');
	});
	
	$scope.isTouchDevice = function isTouchDevice() {
		return (('ontouchstart' in window)
				|| (navigator.MaxTouchPoints > 0)
				|| (navigator.msMaxTouchPoints > 0));
	};
	
	$scope.hasActiveTab = function hasActiveTab() {
		var hasActive = false;
		_.each($scope.formChildrenTables, function (element, index) {
			if (element.selected) {
				hasActive = true;
			}
		});
		
		if (!hasActive && $scope.getCurrentTab()) {
			hasActive = true;
		}
		
		return hasActive;
	};
	
	Events.on('SettingsUpdate', function () {
		scalarTableSettings = Tables.getSettings(Tables.formTable);
		$timeout(function () {
			Events.broadcast('WatchFormTable', currentFormData);
			$timeout(function () {
				Events.broadcast('HardRebootChildGrid');
			});
		});
	});
	
	$scope.buildChildGrid = function () {
		if (angular.isDefined($scope.selected.name)) {
			$scope.updateGridTo($scope.selected);
		} else {
			$scope.selected = espresso.util.getFirstProperty($scope.formChildrenTables);
			if ($scope.selected) {
				$scope.updateGridTo($scope.selected);
			}
		}
	};
	
	$scope.$watch('childrenArea.gridOptions', function (current, previous) {
		$scope.outputGrid = [espresso.util.getFirstProperty(current)];
	});
	$scope.updateGridTo = function updateGridTo (childSettings, forced) {
		if (EspressoData.isSaveable() && !forced) {
			Notifications.promptUnsaved({note: 'child.updateGridTo()'});
			return;
		}
		
		if (!childSettings || angular.isUndefined(childSettings.name)) {
			return;
		}
		angular.forEach($scope.formChildrenTables, function (table, index) {
			table.selected = false;
		});
		angular.forEach($scope.selectableChildrenTables, function (table, index) {
			table.selected = false;
		});
		childSettings.selected = true;
		Tables.childTable = childSettings.name;
		$scope.selected = childSettings;
		$scope.setupChildrenGrids(childSettings.name);
		return true;
	};

	Events.on('UpdateActiveSelectableChild', function (event, table) {
		$scope.activeSelectableTable = table;
		$scope.updateGridTo($scope.activeSelectableTable);
	});
	
	$scope.$watch('activeSelectableTable', function (current, previous) {
		$scope.forceGridSelection(current);
	});
	
	//returns if it finds a child name, else recursive attempts again in 500ms
	$scope.forceGridSelection = function forceGridSelection(current) {
		if (!current && $scope.formChildrenTablesKeys && $scope.formChildrenTablesKeys.length) {
			var childName = $scope.getCurrentTab();
			if (childName) {
				if ($scope.updateGridTo($scope.formChildrenTables[childName], true)) {
					return;
				}
			}
			else { 
				childName = $scope.formChildrenTablesKeys[0];
				if (childName) {
					if ($scope.updateGridTo($scope.formChildrenTables[childName])) {
						return;
					}
				}
			}
		}
		setTimeout(function () {
			$scope.forceGridSelection(current);
			$scope.$apply();
		}, 500);
	};
	
	$scope.promptActiveSelectableTable = function () {
		$modal.open({
			backdrop	: true,
			keyboard	: true,
			templateUrl	: 'templates/modals/selectableChildrenTables.html',
			controller	: 'espresso.SelectableChildrenCtrl',
			resolve		: {
				selectableChildrenTables : function(){ return $scope.selectableChildrenTables; }
			}
		});
	};
	
	$scope.previousActiveList = null;
	$scope.$watch('currentActiveList', function (current, previous) {
		if (current && previous) {
			$scope.previousActiveList = previous;
		}
	});
	
	//////////////////////////////////////////////////////////////////////////////////////////
	// Get the name of the currently selected tab, if any
	$scope.getCurrentTab = function() {
		if ( ! scalarTableSettings || !scalarTableSettings.childrenSettings)
			return null;
		var active = null;
		var fallback = null;
		var theChild = _.find($scope.formChildrenTables, function(c) {
			if (!fallback) {
				fallback = c.name;
			}
			return c.selected;
		});
		if (!theChild) {
			theChild = _.find($scope.selectableChildrenTables, function(c) {
				return c.selected;
			});
		}
		
			
		
		if (theChild && theChild.name) {
			active = theChild.name;
		}
		
		if (!active) {
			var keys = _.keys($scope.childrenArea.gridData);
			if (keys.length) {
				active = keys[0];
			}
		}
		
		if (angular.equals(null, active)) {
			active = fallback;
		}
		else {
			$scope.currentActiveList = active;
		}
		return active;
	};

	//////////////////////////////////////////////////////////////////////////////////////////
	$rootScope.$on('childrenTabsChanged', function() {
		$scope.setupChildrenGrids();
	});
	

	//////////////////////////////////////////////////////////////////////////////////////////
	$rootScope.$on('childSettingsChanged', function(childName) {
		$scope.setupChildrenGrids();
	});

	/////////////////////////////////////////////////////////////////////////////
	// This gets called whenever something is "edited", even if no change is actually made
	// We compare the current value with the original value and set the action to update if
	// any attribute is different.
	$scope.$on('ngGridEventEndCellEdit', function(evt){
		if (angular.isUndefined(evt.targetScope.row)) {return;}
		var currentRow = evt.targetScope.row.entity;
		var oldRow = evt.targetScope.row.entity["__original"];
		if ( !oldRow ) // In the case of inserted rows
			return;

		var selectedChildTab = $scope.getCurrentTab();
		var tblName = scalarTableInfo.childrenByName[selectedChildTab].child_table;
		var childTableInfo = $rootScope.allTables[tblName];

		_.each(childTableInfo.columnsByName, function(column, columnName) {
			var oldValue = oldRow[column.name];
			var newValue = currentRow[column.name];
			if (oldValue != newValue) {
				evt.targetScope.row.entity["@metadata"].action = "UPDATE";
				return;
			}
		});
	});

	/////////////////////////////////////////////////////////////////////////////
	// Style the rows
	$scope.getGridRowStyle = function(row) {
		if ( ! row.entity || !row.entity["@metadata"]) {
			return;
		}
		var action = row.entity["@metadata"].action;
		if (!action) return "";
		if (action == 'DELETE') return "gridDeletedRow";
		if (action == 'INSERT') return "gridInsertedRow";
		if (action == 'UPDATE') return "gridUpdatedRow";
	};

	/////////////////////////////////////////////////////////////////////////////
	$scope.getGridActionIcon = function(row) {
		var action = row.entity["@metadata"].action;
		if (!action) return "fa fa-times";
		if (action == 'DELETE') return "fa fa-undo";
		if (action == 'INSERT') return "fa fa-times";
		if (action == 'UPDATE') return "fa fa-undo";
	};
	
	$scope.hasChildrenRelationships = false;
	///////////////////////////////////////////////////////////////////////////////
	$scope.hasChildren = function hasChildren(data) {
		if (data && data.settings && _.keys(data.settings.childrenSettings).length) {
			return true;
		}
		if (angular.isDefined(scalarTableSettings) && angular.isDefined(scalarTableSettings.childrenSettings)) {
			var values = _.values(scalarTableSettings.childrenSettings);
			if (angular.isDefined(values[0])) {
				return true;
			}
		}
		return false;
	};
	
	$scope.hasDisplayedChildren = function hasDisplayedChildren() {
		//fix for z#827
		return ($scope.formChildrenTables && _.keys($scope.formChildrenTables).length);
	};
	
	/////////////////////////////////////////////////////////////////////////////
	$scope.setupChildrenGrids = _.throttle(function (listToRefresh) {
//		var action = false;
//		angular.forEach($scope.childrenArea.gridData[$scope.getCurrentTab()], function (element, index) {
//			if (element['@metadata'] && angular.isDefined(element['@metadata'].action)) {
//				console.log(element);
//				action = true;
//			}
//		});
//		if (action) { return; }
		//Events.broadcast('ForceLockMainGrid', true);
		//console.log('Setting up children grids, scope is: ' + $scope.$id);
		var refreshGridData = false;

		if (angular.isUndefined($scope.childrenArea.gridData)) {
			$scope.childrenArea.gridData = {};
			refreshGridData = true;
		}
		$scope.childrenArea.gridOptions = {};
		$scope.childrenArea.colDefs = {};

		if ( ! scalarTableSettings)
			return;

		var t = scalarTableSettings;

		// Set up the child grids
		if ( ! t.childrenSettings || t.childrenSettings.length == 0) {
			//console.log('No children - not much to display here');
			return;
		}

		$scope.childrenArea.activeChildTabs = {};
		
		if (!$scope.hasDisplayedChildren()) {
			return;
		}
		
		var currentList = $scope.getCurrentTab();
		if (listToRefresh && angular.isUndefined(listToRefresh.$id)) {
			currentList = listToRefresh;
		}
		
		//////////
		(function (theChild, childName) {
			//sometimes we get no theChild, 
			if (angular.isUndefined(theChild)) { return; }
			
			//initializing
			if (angular.isUndefined($scope.childrenArea.gridData[theChild.name])) {
				$scope.childrenArea.gridData[theChild.name] = [];
				refreshGridData = true;
			}
			$scope.childrenArea.gridOptions[theChild.name] = {};
			$scope.childrenArea.activeChildTabs[childName] = false;
			if (!$scope.childrenArea.selectedChildrenRows[childName]) {
				$scope.childrenArea.selectedChildrenRows[childName] = [];
			}
			
			var tblDef = {
					data: 'childrenArea.gridData["' + childName + '"]',
					enableCellSelection: true,
					enableCellEdit: false,
					enableRowSelection: true,
					enableColumnResize: true,
					enableColumnReordering: $rootScope.root.authorMode,
					//enableColumnReordering: true,
					multiSelect: false,
					showSelectionCheckbox: false,
					enablePaging: false,
					showFilter: false,
					showFooter: false,
					columnDefs: 'childrenArea.colDefs["' + childName + '"]',
					rowTemplate: '<div style="height: 100%" ng-class="getGridRowStyle(row)">' +
						'<div ng-repeat="col in columns" ng-class="col.colIndex()" class="ngCell ">' +
						'<div ng-cell></div>' +
						'</div>' +
						'</div>',
					selectedItems: $scope.childrenArea.selectedChildrenRows[childName],
					keepLastSelected: true,
					beforeSelectionChange: function (state) {
						if (state.rowIndex == 0 && state.selected) {
							//is this the first row && if we're deselecting the first row :: stop us navigating away
							//console.log('disallowed', state);
							return false;
						}
						//console.log('allowed', state);
						return true;
					}
			};
			
			$scope.childrenArea.gridOptions[theChild.name] = tblDef;
			$scope.setupGrid(theChild.name);
		})(scalarTableSettings.childrenSettings[currentList], currentList);
		//////////

		$scope.refreshChildrenData(refreshGridData);
	}, throttleDefault);
	

	Events.on('WatchAuthorMode', function () {
		$scope.$evalAsync(function () {
			//$scope.refreshChildGrid($scope.previousActiveList);
			$scope.updateGridTo($scope.formChildrenTables[$scope.currentActiveList]);
		});
	});
	Events.on('RefreshChildGrid', function () {
		if ($scope.isDataLossPossible()) { return; }
		$scope.forceGridSelection(false);
		$scope.$evalAsync(function () {
			$scope.refreshChildGrid($scope.previousActiveList);
		});
	});
	Events.on('AuthorModeDialogClosed', function () {
		//somewhere between the adminLogin.login() and 1000 milliseconds the child grid blanks out
			//possibly the resize event,
			//cause unknown, kludge as follows:
		Notifications.suspend('promptUnsaved', 1000);
		$scope.updateGridTo($scope.formChildrenTables[$scope.currentActiveList]);
		$timeout(function () {
			Notifications.suspend('promptUnsaved', 3000);
			$scope.updateGridTo($scope.formChildrenTables[$scope.currentActiveList]);
		}, 1000);
	});
	

	$scope.refreshChildGrid = function (listToRefresh) {
		$scope.setupChildrenGrids(listToRefresh);
	};
	
	var childCurrentlySorting = false;
	$scope.sortInfo = false;
	$scope.$on('ngGridEventSorted', _.throttle(function (event, sort) {
		$scope.sortInfo = sort;
	}, 1000));
	$scope.$watch('sortInfo', function (current, previous) {
		if (current) {
			var sort = current;
			var activeRoleName = $scope.getCurrentTab();
			var tableName = scalarTableInfo.childrenByName[activeRoleName].child_table;
			Query.table(tableName).sort(sort);
			$scope.childrenArea.fetchMoreChildren($rootScope.currentServer + tableName);
		}
	}, true);
	
	//////////////////////////////////////////////////////////////////////////////
	//$scope.$watch("scalarTableSettings", function () {
	//	$scope.$evalAsync(function () { console.log('eta'); $scope.setupChildrenGrids(); });
	//});
	$scope.getColumnWidth = function(col) {
		var width = 200;
		switch(col.type) {
			case "BIGINT": width = 100; break;
			case "BIT": width = 100; break;
			case "BOOLEAN": width = 100; break;
			case "CLOB": width = 350; break;
			case "DATE": width = 200; break;
			case "DECIMAL": width = 100; break;
			case "DOUBLE": width = 100; break;
			case "FLOAT": width = 100; break;
			case "INTEGER": width = 100; break;
			case "NUMERIC": width = 100; break;
			case "REAL": width = 100; break;
			case "SMALLINT": width = 100; break;
			case "TIME": width = 100; break;
			case "TIMESTAMP": width = 200; break;
			case "TINYINT": width = 100; break;
			case "CHAR":
			case "LONGNVARCHAR":
			case "LONGVARCHAR":
			case "NCHAR":
			case "NVARCHAR":
			case "VARCHAR": {
					if (col.size <= 5) width = 100;
					else if (col.size <= 10) width = 200;
					else if (col.size <= 20) width = 300;
					else width = 400;
				} break;
			default: width = 100;
		}
		return width;
	};

	//called when parent columns are sorted, currently only warns that this is not supported
	$scope.sortByParentColumn = function sortParent () {
		Notifications.info('Sort by parent columns is not yet supported.');
	};
	$scope.sortByBinaryColumn = function sortParent () {
		Notifications.info('Sorting by a binary column is not supported.'); //... and couldn't serve a purpose.
	};
	
	$scope.mobileForceClick = function (event) {
		if (!Device.isMobile()) {return;}
		if ($rootScope.root.editMode) {
			var $cell = angular.element(event.target);
			var $selected = $cell.closest('.selected');
			if ($selected.length > 0) {
				var $binding = $cell.find('.ng-binding');
				$scope.$evalAsync(function () {
					$cell.blur();
					$binding.dblclick();
				});
			}
		}
	};
	Events.on('UpdatedGridColumns', function (event, data) {
		if (data.area === 'children') {
			Events.broadcast('RefreshChildGrid');
		}
	});
	/////////////////////////////////////////////////////////////////////////////
	// Set up the table for a specific child table
	$scope.setupGrid = _.throttle(function (childName, computing) {
		var leftHeaderTemplate =
			"<div class='columns-dropdown' title='Select which columns should be shown in this table'>" +
				"<i class='fa fa-columns eslo-header-button' style='padding-left: 4px; padding-top: 8px;' " +
				"ng-click='editColumnSelection(\"children\", \"" + childName + "\")' ng-show='root.authorMode'></i>" +
			"</div>" +
			"<div ng-mouseover='ieHeaderGripFix();' ng-show='col.allowResize' class='ngHeaderGrip' ng-click='col.gripClick($event)' " +
			"ng-mousedown='col.gripOnMouseDown($event)'></div>";

		var childInfo = $rootScope.allTables[scalarTableInfo.childrenByName[childName].child_table];
		var colDefs = [
			{
				displayName: "",
				width: "45px",
				enableCellEdit: false,
				enableCellSelection: false,
				table: childInfo.name,
				role: childName,
				groupable: false,
				headerCellTemplate: leftHeaderTemplate,
				cellTemplate: "<div class='ngCellText' ng-class='col.colIndex()'>" +
					"<child-actions ng-click=\"root.isEditable( '" + childInfo.name + "' , col );\" " +
					"ng-dblclick=\"root.isEditable( '" + childInfo.name + "' , col );root.alertIfUneditable( '" + childInfo.name + "' , col.colDef.field );\" row='row' role-name='" +
					childName +
					"' child-zoom='childZoom(row, \"" + childName + "\")' " +
					"child-grid-data='childrenArea.gridData[childName]'/></div>",
			}
		];
		var childSettings = scalarTableSettings.childrenSettings[childName];
		var keys = _.keys(childSettings.gridColumns);
		for (var i = 0; i < keys.length; i++) {
			var c = childSettings.gridColumns[keys[i]];

			var cDef = childInfo.columnsByName[c.name] || childSettings.gridColumns[c.parentRole + '/' + c.name];
			if (angular.isUndefined(cDef)) {
				console.log(c, 'Name not found, fix me');
				console.log('info', childInfo);
				console.log('settings', childSettings);
				console.log('definition', cDef, c.parentRole + '/' + c.name);
				continue;
			}
			var inputType = "text";
			var style = "margin-top: 5px; margin-left: 10px;";
			var headerClass = "";
			var sortFunction = 'col.sort($event)'; //expected to be passed to ng-click
			if (c.parentRole) {
				headerClass = "parentHeader";
				sortFunction = 'sortByParentColumn()';
			}
			if (c.generic_type == "binary") {
				sortFunction = 'sortByBinaryColumn()';
			}
			var headerCellTemplate =
				"<div ng-mouseover='ieHeaderGripFix();'class=\"ngHeaderSortColumn " + headerClass + " {{col.headerClass}}\" " +
						"ng-style=\"{'cursor': col.cursor}\" ng-class=\"{ 'ngSorted': !noSortVisible }\">" +
					"<div ng-class=\"'colt' + col.index\" class=\"ngHeaderText\">" +
						"<span ng-click=\"" + sortFunction + "\">{{col.displayName}}</span>" +
						"<i class='fa fa-cog gridHeaderButton eslo-header-button' ng-click=\"editColumnHeader(col.colDef.tableName, col)\" " +
								"ng-show='root.authorMode' title='Change how this column is displayed'>&nbsp;</i>" +
					"</div>" +
					"<div class=\"ngSortButtonDown\" ng-show=\"col.showSortButtonDown()\"></div>" +
					"<div class=\"ngSortButtonUp\" ng-show=\"col.showSortButtonUp()\"></div>" +
					"<div class=\"ngSortPriority\">{{col.sortPriority}}</div>" +
					"<div ng-class=\"{ ngPinnedIcon: col.pinned, ngUnPinnedIcon: !col.pinned }\" " +
						"ng-click=\"togglePin(col)\" ng-show=\"col.pinnable\"></div>" +
				"</div>" +
				"<div ng-show=\"col.resizable\" class=\"ngHeaderGrip\" ng-click=\"col.gripClick($event)\" " +
					"ng-mousedown=\"col.gripOnMouseDown($event)\"></div>";
			var editableTemplate = '';
			var editButton = "";
			if (c.parentRole) {
				editButton = "<i class='fa fa-sort-up' style='margin-left: 7px; float: right;' " +
					"ng-click='selectParent(col, row)' ng-show='root.editMode'></i>";
			}
			else if (cDef.isFk) {
				editButton = "<i class='fa fa-sort-up' style='margin-left: 7px; float: right;' " +
					"ng-click='selectFK(col, row)' ng-show='root.editMode'></i>";
			}
			
			var dblClickAction = "root.alertIfUneditable( '" + childSettings.tableName + "' , col.colDef.field );";
			if (c.parentRole) {
				dblClickAction = "   root.log(col);selectParent(col)";
				var dataSource = c.dataSource.replace('__internal.parentRows.', '');
				var settings = $scope.getParentColumnSettings(c.dataSource, childName);
				if (settings) {
					c = settings;
				}
			}
			var cellClass = "";
			if (c.parentRole) {
				cellClass = " parentColumnCell";
			}
			var cellTemplate = "<div ng-init='root.childGridEvaluate(this, col.colDef);' style='{{this.styles}}' class=\"ngCellText eslo-grid-text-template" + cellClass + "\" ng-class=\"col.colIndex()\">" +
				editButton +
				"<span  style='{{this.styles}}' class='fill-container' ng-click=\"root.isEditable( '" + childSettings.tableName + "' , col );mobileForceClick($event);\" ng-dblclick=\"isEditable( '" + childSettings.tableName + "' , col );" + dblClickAction +
				"\" ng-cell-text ng-dblclick=\"gridCellDoubleClicked(col);\" hm-touch=\"root.forceCellDblClick($event,col);\">" +
				"{{COL_FIELD|InputMask:'" + c.maskType + "':'" + c.mask + "':'" + c.type + "':'childGrid':'" + c.generic_type + "'}}</span></div>";
			var colType, colGenericType;
			if (c.parentRole) {
				colType = childSettings.parentSettings[c.parentRole].columnFormats[c.name].type;
				colGenericType = childSettings.parentSettings[c.parentRole].columnFormats[c.name].generic_type;
			}
			else{
				colType = childInfo.columnsByName[c.name].type;
				colGenericType = childInfo.columnsByName[c.name].generic_type;
			}
			switch (colGenericType) {
			case 'boolean':
				// dealt with later
				break;
			case 'number':
				inputType = 'number';
				if (Device.isFirefox()) {
					inputType = 'text';
				}
				style += 'text-align: right;';
				cellTemplate = "<div ng-init='root.childGridEvaluate(this, col.colDef);' style='{{this.styles}}' ng-click='mobileForceClick($event);' hm-touch=\"root.forceCellDblClick($event,col);\" class=\"ngCellText" + cellClass + " numeric-cell\" ng-class=\"col.colIndex()\" style=\"text-align: right;\" espresso-track-model ng-model='COL_FIELD'>" +
					editButton +
					"<span  style='{{this.styles}}' ng-click=\"root.isEditable( '" + childSettings.tableName + "' , col );\" ng-dblclick=\"isEditable( '" + childSettings.tableName + "' , col );" + dblClickAction +
					"\" ng-cell-text>{{ COL_FIELD | InputMask:'" +
					c.maskType+"':'"+c.mask+"':\""+c.prefix+"\":'"+c.suffix+"' }}</span></div>";
				break;
			case 'date':
				switch (colType) {
				case 'DATE':
					inputType = 'text';
					editableTemplate = '<div espresso-date-input ng-model="COL_FIELD" settings-reference="childTable" col="col.colDef"></div>';
					break;
				case 'TIME':
					inputType = 'time';
					break;
				case 'DATETIME':
				case 'TIMESTAMP':
				default:
					inputType = 'text';
					editableTemplate = '<div espresso-date-input ng-model="COL_FIELD" settings-reference="childTable" col="col.colDef"></div>';
					break;
				}
				break;
			case 'binary':
				cellTemplate = 'templates/cells/childBinary.html';
				break;
			}

			var newColDef = {
				field: c.dataSource,
				dataSource: c.dataSource,
				displayName: c.alias,
				enableCellEdit: $rootScope.root.editMode,
				width: $scope.getColumnWidth(c),
				parent: scalarTableInfo.name,
				initialized: false,
				isParentColumn : c.parentRole,
				tableName: childSettings.name,
				eval: c.eval,
				grid : 'child',
				headerCellTemplate: headerCellTemplate,
				cellFilter: 'number',
				editableCellTemplate: "<input ng-trim='false' type='" + inputType + "' style='" + style + // onfocus='moveCursorToEnd(this)' //removed onfocus event for performance & UI reasons z#1405
					"' ng-class=\"'colt' + col.index\" ng-input=\"COL_FIELD\" ng-model=\"COL_FIELD\" />",
//				columnSettings: c
			};

			if (cellTemplate)
				newColDef.cellTemplate = cellTemplate;
			if (editableTemplate != '')
				newColDef.editableCellTemplate = editableTemplate;
			if (c.parentRole) {
				newColDef.enableCellEdit = false;
			}

			if ('boolean' === colGenericType) {
				newColDef.cellTemplate = "<div ng-init='root.childGridEvaluate(this, col.colDef);' style='{{this.styles}}' class=\"ngCellText\" ng-class=\"col.colIndex()\" style=\"text-align: center;\">" +
					"<input ng-trim='false' ng-click=\"root.isEditable( '" + childSettings.tableName + "' , col );\" " +
						"ng-dblclick=\"isEditable( '" + childSettings.tableName + "' , col );root.alertIfUneditable( '" + childSettings.tableName + "' , col.colDef.field );\" type='checkbox' " +
					"ng-change='gridBooleanChanged(row, \"" + c.name + "\")' " +
					"ng-disabled='!root.editMode'" +
					"ng-class=\"'colt' + col.index\" ng-input=\"COL_FIELD\" ng-model=\"COL_FIELD\" /></div>";
				newColDef.enableCellEdit = false;
			}

			colDefs.push(newColDef);
		}

		$scope.childrenArea.colDefs[childName] = colDefs;
		if (!computing) { $scope.computeColumnWidths(childName, childSettings); }
		attachColumnResizeHandlers();
	}, throttleDefault);

	$rootScope.$watch('root.editMode', function () {
		attachColumnResizeHandlers();
	});
	function attachColumnResizeHandlers() {
		setTimeout(function () {
			//column re-sizing saved locally:
			$('#childCollections .ngHeaderGrip').mouseup(function (event) {
				var ngColumns = angular.element('#childCollections .ngGrid').scope().columns;
				angular.forEach(ngColumns, function (ngColumn, index) {
					var newWidth = Device.columnWidth(ngColumn, ngColumn.width);
				});
			});
			
			//column re-ordering
			$('#childCollections .ngHeaderSortColumn').each(function (index, element) {
				var ngColumns = angular.element('#childCollections .ngGrid').scope().columns;
				//firefox does not have a dragend event handler:
				element.addEventListener('dragend', function () {
					Settings.isReady().then(function () {
						//initialize variables
						var settings, columns, sourcesMap, activeTable, updatedGrid = {};
						
						settings = Tables.getCurrentScalar();
						
						//before proceeding, I need to be sure what table object is in action
						activeTable = $scope.getCurrentTab();
						if (angular.isDefined(ngColumns[1].colDef.tableName)) {
							activeTable = ngColumns[1].colDef.tableName;
						}
						
						//now that I am relatively more certain, which table is being updated:
							//proceed to bug out for other reasons?
						childColumnSettings = settings.childrenSettings[activeTable].gridColumns;
						columns = Tables.getSourcesToColumns(childColumnSettings);
						sourcesMap = _.object(_.pluck(columns, 'dataSource'), _.keys(childColumnSettings));
						angular.forEach(ngColumns, function (ngColumn, index) {
							var col, displayName;
							if (angular.isDefined(ngColumn.field)) {
								col = columns[ngColumn.field];
								displayName = sourcesMap[ngColumn.field];
								updatedGrid[displayName] = childColumnSettings[displayName];
							}
						});
						if (Tables.hasModifiedColumns(childColumnSettings, updatedGrid)) {
							settings.childrenSettings[$scope.getCurrentTab()].gridColumns = updatedGrid;
							Settings.saveTableOptions(settings);
						}
					});
				});
				//alert('dragend');
			});
		}, 1000);
	}

	$scope.$on('ngGridEventData', _.debounce(function (event, gridId) {
		var ngColumns = angular.element('#childCollections .ngGrid').scope().columns;
		var sized = false;
		angular.forEach(ngColumns, function (ngColumn, index) {
			if (angular.isDefined(ngColumn.colDef.initialized) && !ngColumn.colDef.initialized) {
				var savedWidth = Device.columnWidth(ngColumn);
				if (savedWidth) {
					var deviceColumnWidth = Device.columnWidth(ngColumn);
					var fieldName = ngColumn.field;
					if (angular.isUndefined(deviceColumnWidth[fieldName])) {
						//for reasons that still mystifiy,
							//sometimes parent columns are either not initialized or not remembered
							//manually setting:
						deviceColumnWidth[fieldName] = {
							width : ngColumn.width
						};
					}
					ngColumn.colDef.width = deviceColumnWidth[fieldName].width + 'px';
				}
				sized = true;
			}
		});
	}, 1000));

	////////////////////////////////////////////////////////////////////////////////
	// Set the width of the columns to be proportionately correct, based on
	// the previous values, or if none, the default width for the data type.
	$scope.computeColumnWidths = function(childName) {
		var childSettings = scalarTableSettings.childrenSettings[childName];
		var preset = Device.isWidthPreset('child', childSettings);
		
		$scope.childrenArea.computingColumnWidths = true;
		var activeTableSettings = $scope.getCurrentlyActiveTableSettings();
		var totalWidth = 0;
		
		_.each(childSettings.gridColumns, function(c) {
			if ( ! c.width)
				c.width = c.width || $scope.getColumnWidth(c);

			if (espresso.util.isNumber(c.width))
				totalWidth += Number(c.width);
			else if (/\*+/.test(c.width)) {
				totalWidth += 100 * c.width.length;
				c.width = 100 * c.width.length;
			}
			else {
				console.log('Invalid value for child column width : ' + c.width + ' for ' + c.name);
			}
		});

		if (totalWidth == 0) {
			console.log('No columns defined for child computeColumnWidths ???');
			return;
		}

		var divWidth = $('#childTabs').width() - 60; // Account for leftmost column
		_.each(childSettings.gridColumns, function(c) {
			c.width = divWidth * c.width / totalWidth;
			_.find($scope.childrenArea.colDefs[childName], function(colDef) {
				if (c.dataSource == colDef.field) {
					//console.log('Resizing child column ' + c.name + ' to ' + c.width);
					//console.log(preset);
					if (angular.isObject(preset)) {
						var width;
						if (!preset[c.dataSource]) {
							width =c.width;
						}
						else {
							width = preset[c.dataSource].width;
						}
						colDef.width = "" + width + "px";
					}
					else {
						colDef.width = "" + c.width + "px";
					}
					return true;
				}
			});
		});
		attachColumnResizeHandlers();
	};

	////////////////////////////////////////////////////////////////////////////////////////////
	// Look at the current column sizes and copy them in the tableSettings.
	$scope.saveColWidth = function(activeTableSettings) {
		if (!activeTableSettings)
			return;
		var activeColumnDefinitions = $scope.getCurrentlyActiveColumnDefinitions();
		_.each(activeColumnDefinitions, function(colDef) {
			_.find(activeTableSettings.gridColumns, function(c) {
				if (c.dataSource == colDef.field) {
					c.width = angular.element('#childCollections .active .col' + colDef.index).width();
					return true;
					/*
					if (/.+px/.test(c.width))
						c.width = Number(c.width.substring(0, c.width.length - 2));
					//console.log('After resize - column ' + colDef.field + " : " + c.width);
					console.log(angular.element('#childCollections .active .col' + colDef.index).width());
					return true;
					*/
				}
			});
		});
	};

	////////////////////////////////////////////////////////////////////////////////////////////
	// When the right side is resized, we recompute the column sizes to fit the new width.

	$('body').on('childTabsCreated', function() { // We cannot register the listener until childTabs is created

		$('#childTabs').resize(function() {

			$scope.$evalAsync(function() {
				_.each(scalarTableSettings.childrenSettings, function(theChild, childName) {
					//$scope.saveColWidth(childName);
					$scope.computeColumnWidths(childName);
				});
			});
		});
	});

	////////////////////////////////////////////////////////////////////////////
	// Called when the user clicks on the cogwheel in the children tabs area
	$scope.childrenArea.editChildrenOptions = function () {
		$modal.open({
			backdrop	: true,
			keyboard	: true,
			templateUrl	: 'templates/modals/childrenOptions.html',
			controller	: 'espresso.ChildrenOptionsCtrl',
			resolve		: {
				callback : function(){ return function() {
					console.log('Children options dialog returning now.');
				}; }
			}
		});
	};

	$scope.getCurrentlyActiveTableSettings = function () {
		var active = '';
		angular.forEach($scope.childrenArea.activeChildTabs, function (element, index) {
			if (element === true) {
				active = index;
			}
		});
		return scalarTableSettings.childrenSettings[active];
	};
	$scope.getCurrentlyActiveColumnDefinitions = function () {
		var active = '';
		angular.forEach($scope.childrenArea.activeChildTabs, function (element, index) {
			if (element === true) {
				active = index;
			}
		});
		return $scope.childrenArea.colDefs[active];
	};
	
	//////////////////////////////////////////////////////////////////////////
	// When the options for a column have been changed, we may need to refresh
	$rootScope.$on('tableDisplayUpdated', function(evt, tblName) {
		_.each(scalarTableInfo.childrenByName, function(child, childName) {
			if (tblName == child.child_table) {
				$scope.setupGrid(childName);
				Settings.saveTableOptions(scalarTableSettings);
			}
		});
		attachColumnResizeHandlers();
	});

	////////////////////////////////////////////////////////////////////////////////////////////
	$scope.getColumnSettingsForField = function(childName, fieldName) {
		var childSettings = scalarTableSettings.childrenSettings[childName];
		var settings = _.find(childSettings.gridColumns, function(c, cName) {
			if (fieldName == c.dataSource)
				return true;
		});
		return settings;
	};

	$scope.isParent = function isParent(field) {
		if (S(field).contains('__internal')) {
			return true;
		}
		return false;
	};
	$scope.getParentColumnSettings = function getParentColumnSettings(field, table) {
		var columnSplit = S(field).replaceAll('__internal.parentRows.', '').split('.');
		var role = columnSplit[0];
		var columnName = columnSplit[1];
		var settingsObj = scalarTableSettings.childrenSettings[$scope.getCurrentTab()];
		if (settingsObj) {
			return settingsObj.parentSettings[role].columnFormats[columnName];
		}
	};

	////////////////////////////////////////////////////////////////////////////////////////////
	// Called when user clicks on cogwheel for a child column
	$scope.editColumnHeader = function(roleName, col) {
		var colTable = col.colDef.table;
		var colField = col.colDef.field;
		var colSettings;
		if ($scope.isParent(colField)) {
			colSettings = $scope.getParentColumnSettings(colField, colTable);
		}
		else {
			colSettings = $scope.getColumnSettingsForField(col.colDef.field);
		}
		var colInfo = null;
		var childTableName = scalarTableInfo.childrenByName[roleName].child_table;
		var childInfo = $rootScope.allTables[childTableName];

		if (colSettings.parentRole) {
			var parentName = childInfo.parentsByName[colSettings.parentRole].parent_table;
			colInfo = $rootScope.allTables[parentName].columnsByName[colSettings.name];
		}
		else
			colInfo = childInfo.columnsByName[colSettings.name];

		$scope.root.editColumn(childTableName, colInfo, colSettings, function() {
			_.find($scope.childrenArea.colDefs[roleName], function(c) {
				if (c.field == colSettings.dataSource) {
					c.displayName = colSettings.alias;
					//Settings.saveTableOptions($scope.scalarTableSettings);
					return true;
				}
			});
		}, 'ChildrenCtrl', roleName);
	};
	
	////////////////////////////////////////////////////////////////////////////
	$scope.childrenArea.childrenInsertRow = function() {

		var roleName = $scope.getCurrentTab();
		var tblName = scalarTableInfo.childrenByName[roleName].child_table;
		var childTableInfo = $rootScope.allTables[tblName];

		var newRow = {};
		_.each(childTableInfo.columns, function(col) {
			newRow[col.name] = "";
			if (col.generic_type === 'number' || col.nullable || col.isFk || col.generic_type === 'binary') {
				newRow[col.name] = null;
			}
			if (col.generic_type === 'boolean' || col.type == 'BIT') {
				if (col.nullable) {
					newRow[col.name] = null;
				}
				else {
					newRow[col.name] = false;
				}
			}
		});
		newRow["@metadata"] = {action: "INSERT", entity: tblName, links: []};
		newRow.__internal = {parentRows: {}};

		// Fill in the FK
		var role = scalarTableInfo.childrenByName[roleName];
		for (var i = 0; i < role.parent_columns.length; i++) {
			newRow[role.child_columns[i]] = $scope.scalarRow[role.parent_columns[i]];
		}

		// If a row is currently selected, we insert before it, otherwise, we insert
		// as the first row.
		var selectedRows = $scope.childrenArea.selectedChildrenRows[roleName];
		if (!selectedRows || selectedRows.length == 0) {
			$scope.childrenArea.gridData[roleName].splice(0, 0, newRow);
		}
		else {
			var idx = 0;
			for (var i = 0; i < $scope.childrenArea.gridData[roleName].length; i++) {
				if ($scope.childrenArea.gridData[roleName] == selectedRows[0]) {
					idx = i;
					break;
				}
			}
			$scope.childrenArea.gridData[roleName].splice(idx, 0, newRow);
		}

		if (selectedRows)
			selectedRows[0] = newRow;
		else
			$scope.childrenArea.selectedChildrenRows[roleName] = [newRow];
	};

	$scope.refreshLocally = function refreshLocally() {
		var metadata = $scope.scalarRow['@metadata'];
		var roles = _.indexBy(metadata.links, 'role');
		var theLink = roles[$scope.getCurrentTab()];
		if (theLink) {
			var roleName = theLink.role;
			$scope.childrenArea.gridData[roleName] = $scope.currentGridData[roleName];
			//console.log(roleName, $scope.childrenArea.gridData, $scope.currentGridData);
			return $scope.currentGridData[roleName];
		}
	};
	$scope.isRefreshRequired = function isRefreshRequired(forceQuery) {
		if ($scope.isDataLossPossible()) { return; }
		if (!forceQuery) {
			if ($scope.scalarRow['@metadata'].checksum == $scope.currentScalarRow['@metadata'].checksum) {
				return false;
			}
		}
		return true;
	};
	
	////////////////////////////////////////////////////////////////////////////
	// Re-fetch and re-populate the data for the childen grids
	$scope.currentGridData = {};
	$scope.refreshChildrenData = function (forceQuery) {
		if (!$scope.isRefreshRequired(forceQuery)) {
			$scope.$evalAsync($scope.refreshLocally);
			return true;
		}
		//console.log('refreshChildrenData now running');
		if ( !scalarTableSettings ){
			//console.log('No scalarTableSettings');
			return;
		}

		$scope.childrenArea.gridData = {};

		if ( ! $scope.scalarRow) {
			return;
		}

		if ( ! $scope.scalarRow['@metadata'].links) {
			console.log('Row has no links???');
			return;
		}
		
		var roles, currentChild, metadata = $scope.scalarRow['@metadata'];
		roles = _.indexBy(metadata.links, 'role');
		//do we have an active child role?
		if (angular.isDefined(roles) && angular.isDefined(roles[$scope.getCurrentTab()])) {
			var theLink, url, roleName, childTableName;
			theLink = roles[$scope.getCurrentTab()];
			url = theLink.href;
			roleName = theLink.role;
			childTableName = scalarTableInfo.childrenByName[roleName].child_table;
			(function(childUrl, childRoleName, childTblName){
				EspressoData.query(childUrl, childTblName, null, function(data) {
					espresso.util.setInScopeFun($scope, function() {
						
						for (var i = 0; i < data.length; i++) {
							data[i]["__original"] = espresso.util.cloneObject(data[i]); // Make a copy so we can compare
						}

						// Is there more data after this batch?
						if (data.length && data[data.length - 1]['@metadata'].next_batch) {
							$scope.childrenArea.nextChildBatch[childRoleName] = data[data.length - 1]['@metadata'].next_batch;
							$scope.isFetchable = true;
							data.pop(); // Get rid of next_batch item
						}
						else {
							$scope.isFetchable = false;
							delete $scope.childrenArea.nextChildBatch[childRoleName];
						}
						$scope.childrenArea.gridData[childRoleName] = data;
						$scope.currentGridData[childRoleName] = data;
						if ($scope.childrenArea.selectedChildrenRows[childRoleName]) {
							$scope.childrenArea.selectedChildrenRows[childRoleName][0] = data[0];
						}
						else {
							$scope.childrenArea.selectedChildrenRows[childRoleName] = [];
							$scope.childrenArea.selectedChildrenRows[childRoleName][0] = data[0];
						}
						//console.log($scope.childrenArea.selectedChildrenRows, $scope.childrenArea.selectedChildrenRows[childRoleName], data[0])
					});
					
					
					setTimeout(function () {
						angular.element('#childCollections').resize();
					}, 150);
				});
			})(url, roleName, childTableName);
		}
	};

	////////////////////////////////////////////////////////////////////////////
	$scope.childrenArea.zoom = function childrenAreaZoom() {
		var scope = angular.element('.selected .childZoomButton').scope();
		if (angular.isDefined(scope)) {
			scope.$$childTail.zoom();
		}
	};
	$scope.childrenArea.deleteAction = function childrenAreaDeleteAction() {
		var scope = angular.element('.selected .childZoomButton').scope();
		if (angular.isDefined(scope)) {
			scope.$$childTail.actionClick();
		}
	};

	$scope.childrenArea.fetchMoreChildren = function(url) {
		var roleName = $scope.getCurrentTab();
		if ( ! $scope.childrenArea.nextChildBatch[roleName] && angular.isUndefined(url))
			return;
		var childTableName = scalarTableInfo.childrenByName[roleName].child_table;
		var batchUrl = $scope.childrenArea.nextChildBatch[roleName];
		var filter = null;
		if (angular.isDefined(url)) {
			try{
				batchUrl = url;
				$scope.childrenArea.gridData[roleName] = [];
				var primaryKeyColumn = scalarTableInfo.primaryKeyColumns[0];
				//var primaryKeyColumn = scalarTableInfo.primaryKey.columns[0].name;
				var parentTableName = scalarTableInfo.name;
				var parentTableLayout = $rootScope.allTables[parentTableName];
				var parentRoleToChild = parentTableLayout.childrenByName[roleName];
				var childColumn = parentRoleToChild.child_columns[0];
				var primaryKeyValue = $scope.scalarRow[primaryKeyColumn];
				filter = '(' + childColumn + ' = \'' + primaryKeyValue + '\')';
			} catch(e) { console.log(e); }
		}
		EspressoData.query(batchUrl, childTableName, filter, function(data) {
			espresso.util.setInScopeFun($scope, function() {
				for (var i = 0; i < data.length; i++) {
					data[i]["__original"] = espresso.util.cloneObject(data[i]); // Make a copy so we can compare
				}

				// Is there more data after this batch?
				if (data.length && data[data.length - 1]['@metadata'].next_batch) {
					$scope.childrenArea.nextChildBatch[roleName] = data[data.length - 1]['@metadata'].next_batch;
					data.pop(); // Get rid of next_batch item
				}
				else {
					delete $scope.childrenArea.nextChildBatch[roleName];
				}

				if ( ! $scope.childrenArea.gridData[roleName])
					$scope.childrenArea.gridData[roleName] = data;
				else
					$scope.childrenArea.gridData[roleName] = $scope.childrenArea.gridData[roleName].concat(data);
				angular.element('#childCollections').resize();
			});
			//testing no-resize
			//espresso.layout.resizeTable();
		});
	};

	////////////////////////////////////////////////////////////////////////////
	//var currentScalarRow = false;
	$scope.$watch("scalarRow", function(current) {
		/*
		if (current && currentScalarRow) {
			console.log('true enough');
			if (current['@metadata'].checksum == currentScalarRow['@metadata'].checksum) {
				console.log('no refresh needed');
				return;
			}
		}
		console.log('refresh');
		currentScalarRow = current;
		console.log(current);
		*/
		$scope.currentScalarRow = current;
		$scope.childrenArea.gridData = {};
		$scope.refreshChildrenData(true);
	});

	///////////////////////////////////////////////////////////////////////////////
	$scope.isEditable = function (table, col) {
		if (table == null) {
			table = scalarTableInfo.name;
		}

		if (angular.isString(col)) {
			return !Tables.isEditable(table, col);
		}
		
		//called from within a grid template
		column = col.colDef.field;
		//maybe it's already false, and returning whether or not it's computed overwrites the edit mode
		if (col.colDef.enableCellEdit) {
			col.colDef.enableCellEdit = Tables.isEditable(table, column);
		}
		return !Tables.isEditable(table, column);
	};
	if (angular.isUndefined($scope.root)) {
		$scope.root = {};
	}
	$scope.root.alertIfUneditable = function (table, col) {
		if (angular.isUndefined(col)) {return;}
		if (!$rootScope.root.editMode) {
			Notifications.error( 'You cannot edit this unless you are in Edit mode' );
			return;
		}
		if(table == null) {
			table = scalarTableInfo.name;
		}
		if (!Tables.isEditable(table, col)) {
			Notifications.error( 'Unable to edit a computed field.' );
		}
	};
	////////////////////////////////////////////////////////////////////////////
	$scope.childColumnsChanged = function(tblIndex, colName) {
		console.log('Changed display for column: ' + colName + " of table index " + tblIndex);
		$scope.setupGrid(tblIndex);
		var childName = scalarTableInfo.children[tblIndex].name;
		Settings.saveTableOptions($scope['childOptions' + childName]);
	};

	////////////////////////////////////////////////////////////////////////////////////////////
	// When switching between read-only mode and edit mode, we need to enable/disable editing in the child grids
	Events.on("WatchEditMode", function() {
		if ( !scalarTableSettings || !scalarTableSettings.childrenSettings)
			return;

		_.each(scalarTableSettings.childrenSettings, function(child, childName) {
			_.each($scope.childrenArea.colDefs[childName], function(col) {
				col.enableCellEdit = $rootScope.root.editMode;
			});
		});
	});

	////////////////////////////////////////////////////////////////////////////////////////////
	$scope.gridBooleanChanged = function(row, colName) {
		console.log('Child grid boolean changed');
		if ( ! row.entity['@metadata']) // Ignore inserted rows
			return;
		if (espresso.util.rowsAreEqual(row.entity, row.entity['__original']))
			row.entity['@metadata'].action = null;
		else
			row.entity['@metadata'].action = 'UPDATE';
	};

	////////////////////////////////////////////////////////////////////////////////////////////
	$scope.getColumnSettingsForField = function(fieldName) {

		var roleName = $scope.getCurrentTab();
		var tblName = scalarTableInfo.childrenByName[roleName].child_table;
		var childTableSettings = scalarTableSettings.childrenSettings[roleName];


		var settings = _.find(childTableSettings.gridColumns, function(c, cName) {
			return fieldName == c.dataSource;
		});
		if ( ! settings)
			console.log("ERROR - could not find column settings for field " + fieldName);
		settings.maskType = Masks.get(settings.type).type;
		return settings;
	};

	/////////////////////////////////////////////////////////////////////////////////
	// Called when user wants to edit a parent column
	$scope.selectParent = function(col, row) {
		if ( ! $scope.root.editMode) {
			Notifications.error( 'You cannot edit this unless you are in Edit mode' );
			return;
		}

		var colSettings = $scope.getColumnSettingsForField(col.colDef.field);
		//var roleName = col.colDef.columnSettings.parentRole;
		var roleName = colSettings.parentRole;
		if ( ! roleName)
			throw "No role for parent column " + colSettings.name;
		var tabName = $scope.getCurrentTab();
		if ($scope.childrenArea.gridOptions[tabName].selectRow) {
			$scope.childrenArea.gridOptions[tabName].selectRow(row.rowIndex); // Select the clicked row
		}
		var tblName = scalarTableInfo.childrenByName[tabName].child_table;
		var childTableInfo = $rootScope.allTables[tblName];
		var childRow = row.entity;
		$modal.open({
			backdrop	: true,
			keyboard	: true,
			templateUrl	: 'templates/modals/parentSelect.html',
			controller	: 'espresso.ParentSelectCtrl',
			resolve		: {
				childTableInfo: function(){ return childTableInfo; },
				childRow: function(){ return childRow; },
//				parentTableInfos: function(){ return [parentTableInfo]; },
				roleNames: function(){ return [roleName]; },
				callback : function(){ return $scope.parentSelected; }
			}
		});
	};

	/////////////////////////////////////////////////////////////////////////////////
	// Called when a user wants to edit a FK column
	$scope.selectFK = function(col, row) {
		if ( ! $scope.root.editMode) {
			Notifications.error( 'You cannot edit this unless you are in Edit mode' );
			return;
		}
		var colSettings = $scope.getColumnSettingsForField(col.colDef.field);
		if (colSettings.parentRole)
			throw "Column should not have a parent role: " + colSettings.name;

		var tabName = $scope.getCurrentTab();
		var tblName = scalarTableInfo.childrenByName[tabName].child_table;
		var childTableInfo = $rootScope.allTables[tblName];

		$scope.childrenArea.selectedChildrenRows[tabName][0] = row.entity;
		var possibleRoles = [];
		_.each(childTableInfo.parents, function(parent) {
			var col = _.find(parent.child_columns, function(c) {
				return c === colSettings.dataSource;
			});
			if (col) {
				possibleRoles.push(parent.name);
			}
		});
		if (possibleRoles.length == 0)
			throw "Role not found for FK column " + colSettings.name;
		var childRow = $scope.childrenArea.selectedChildrenRows[tabName][0];

		$modal.open({
			backdrop	: true,
			keyboard	: true,
			templateUrl	: 'templates/modals/parentSelect.html',
			controller	: 'espresso.ParentSelectCtrl',
			resolve		: {
				childTableInfo: function(){ return childTableInfo; },
				childRow: function(){ return childRow; },
//				parentTableInfos: function(){ return [parentTableInfo]; },
				roleNames: function(){ return possibleRoles; },
				callback : function(){ return $scope.parentSelected; }
			}
		});
	};

	$scope.isValidRow = function isValidRow(row) {
		return row && row['@metadata']
	};
	
	/////////////////////////////////////////////////////////////////////////////////
	// Called when the user selects a parent row from the search dialog
	$scope.parentSelected = function(parentRow, roleName) {
		if ($scope.isValidRow($scope.scalarRow) && $scope.isValidRow(parentRow)) {
			if ($scope.scalarRow['@metadata'].href === parentRow['@metadata'].href) {
				//we selected the same row, return
					//the parent selected may be more up to date, and may change values in scope which will not be saveable and only relate to the parent
				return;
			}
		}

		if (parentRow) {
			//console.log("Selected parent row was: " + JSON.stringify(parentRow));
		}

		var tabName = $scope.getCurrentTab();
		var tblName = scalarTableInfo.childrenByName[tabName].child_table;
		var childTableInfo = $rootScope.allTables[tblName];
		var childRow = $scope.childrenArea.selectedChildrenRows[tabName][0];
		
		if (angular.isUndefined(childRow)) {
			childRow = $scope.childrenArea.gridData[tabName][0];
		}

		var parentRole = childTableInfo.parentsByName[roleName];
		for (var i = 0; i < parentRole.parent_columns.length; i++) {
			var parentColName = parentRole.parent_columns[i];
			var childColName = parentRole.child_columns[i];
			
			childRow[childColName] = parentRow[parentColName];
			var tableInfo = Tables.getDetails(tblName);
			angular.forEach(tableInfo.columnsByName, function (columnInfo, name) {
				if (columnInfo.generic_type == 'number' && columnInfo.isFk) {
					childRow[name] = parseInt(childRow[name]);
				}
			});
		}
		childRow.__internal.parentRows[roleName] = parentRow;
		if ("INSERT" != childRow['@metadata'].action)
			childRow['@metadata'].action = 'UPDATE';
	};

	////////////////////////////////////////////////////////////////////////////////////////////
	$scope.childZoom = function (row, childName) {
		if ($scope.isDataLossPossible()) {
			console.log('stop here');
			Notifications.promptUnsaved({note: 'child.updateGridTo()'});
			return;
		}
		$rootScope.trackAction('livebrowser_childzoom');
		$scope.childrenArea.selectedChildrenRows = {};
		$scope.scalarRow = row.entity;
		var childTableName = scalarTableInfo.childrenByName[childName].child_table;
		scalarTableInfo = $rootScope.allTables[childTableName];
		scalarTableSettings = Tables.getTableSettings(childTableName);
		var data = {
			row : row.entity,
			details : scalarTableInfo,
			settings : scalarTableSettings,
			broadcaster : 'child'
		};
		Events.broadcast('WatchCurrentTable', data);
		Events.broadcast('WatchMainRow', data);
	};
	////////////////////////////////////////////////////////////////////////////////////////////
	$scope.parentZoom = function (row, parentName) {
		$scope.childrenArea.selectedChildrenRows = {};

		$scope.scalarRow = row.entity;
		scalarTableInfo = $rootScope.allTables[parentName];
		scalarTableSettings = Tables.getSettings(parentName);
		console.log(scalarTableInfo);
		var data = {
			row : row,
			details : scalarTableInfo,
			settings : scalarTableSettings,
			broadcaster : 'child'
		};
		Events.broadcast('WatchCurrentTable', data);
		Events.broadcast('WatchMainRow', data);
	};

	$rootScope.getChildSaveData = function getSaveData() {
		var rowsToSave = [];
		_.each($scope.childrenArea.gridData, function(childRows) {
			_.each(childRows, function(row) {
				if (row['__original']) {
					var currentValues = _.omit(row, ['@metadata', '__original', '__internal']);
					var originalValues = _.omit(row['__original'], ['@metadata', '__original', '__internal']);
					if (!angular.equals(currentValues, originalValues)) {
						row['@metadata'].action = 'UPDATE';
					}
				}
				if (row['@metadata'] && row['@metadata'].action) {
					rowsToSave.push(row);
				}
				
			});
		});
		return rowsToSave;
	};
	
	/////////////////////////////////////////////////////////////////////////////////////////////
	$rootScope.$on('saveAll', function() {
		Events.broadcast('SaveStart');

		$scope.rowsToSave = $rootScope.getChildSaveData();
		$rootScope.addRowsToSave('children', $scope.rowsToSave);
	});
	
	Events.on('SaveStart', function () {
		$scope.preSaveList = $scope.currentActiveList;
	});
	
	Events.on('SaveComplete', function () {
		$timeout(function () {

			if ($scope.isDataLossPossible()) { return; }
			$scope.childrenArea.gridData = {};
			$scope.refreshChildGrid($scope.preSaveList);
			$scope.setupChildrenGrids($scope.preSaveList);
			$scope.updateGridTo($scope.formChildrenTables[$scope.preSaveList]);
			if ($scope.rowsToSave) {
				$timeout(function () {
                    _.each($scope.rowsToSave, function (element, index) {
                    	//$scope.currentGridData[$scope.preSaveList].unshift(element);
                    });
				}, 100);
			}
		}, 1000);
	});
	
	$scope.isDataLossPossible = function () {
		var action = false;
		angular.forEach($scope.childrenArea.gridData[$scope.getCurrentTab()], function (element, index) {
			if (element['@metadata'] && angular.isDefined(element['@metadata'].action) && element['@metadata'].action) {
				console.log(element, index, $scope.childrenArea.gridData[$scope.getCurrentTab()]);
				action = true;
			}
		});
		return action;
	};
	
	Events.on('HardRebootChildGrid', function () {
		if ($scope.isDataLossPossible()) { return; }
		$scope.childrenArea.gridData = {};
		$timeout(function () {
			$scope.refreshChildGrid($scope.currentActiveList);
			$scope.setupChildrenGrids($scope.currentActiveList);
			$scope.updateGridTo($scope.formChildrenTables[$scope.currentActiveList]);
		}, 0);
	});

	$rootScope.$on('undoAll', function(evt) {
		Events.broadcast('SaveStart');
		espresso.util.setInScopeFun($scope, function() {
			_.each($scope.childrenArea.gridData, function(childRows) {
				for (var i = childRows.length - 1; i >= 0; i--) {
					var row = childRows[i];
					if (row['@metadata'].action == 'INSERT') {
						childRows.splice(i, 1);
					}
					else if (row['@metadata'].action == 'DELETE') {
						row['@metadata'].action = null;
					}
					else if (row['@metadata'].action == 'UPDATE') {
						espresso.util.restoreRow(row);
						row['@metadata'].action = null;
					}
					
					if (row && row['__original'] && row['__internal']) {
						row['__internal'] = row['__original']['__internal'];
					}
				}
			});
			Events.broadcast('SaveComplete');
		});
	});

	//////////////////////////////////////////////////////////////////////////
	// When rows have been saved, we get notified with the tx summary
	$rootScope.$on('updatedRows', function(evt, rows) {
		_.each(scalarTableSettings.childrenSettings, function(child, childName) {
			$scope.updateGrid(childName, rows);
		});
		$rootScope.$emit('tableDisplayUpdated');
	});

	//////////////////////////////////////////////////////////////////////////
	// Update a child grid from a tx summary
	$scope.updateGrid = function(childName, rows) {
		var gridData = $scope.childrenArea.gridData[childName];
		var tableName = scalarTableInfo.childrenByName[childName].child_table;
		rows = angular.copy(rows);
		
		if (angular.isUndefined(gridData)) {
			//The current scalar has nothing to do with this table in all likely hood.
			return;
		}
		// Remove inserted rows from the grid -- they will be added back from the transaction summary
		for (var i = 0; i < gridData.length; i++) {
			if (gridData[i]["@metadata"].action == "INSERT") {
				gridData.splice(i, 1);
				i--;
			}
		}

		LoopOverTxSummary:
		for (var i = 0; i < rows.length; i++) {
			var newObj = rows[i];
			if (newObj["@metadata"].resource != tableName)
				continue;
			var foundIdx = -1;
			for (var j = 0; j < gridData.length; j++) {
				if (gridData[j]["@metadata"].href == newObj["@metadata"].href) {
					foundIdx = j;
					if (newObj["@metadata"].verb == "DELETE") {
						gridData.splice(j, 1);
						// Should we do j -= 1 here?
						continue LoopOverTxSummary;
					}
					
					//if the update succeeded, repopulate the object internals
					if (newObj['@metadata'].verb && newObj['@metadata'].verb == 'UPDATE') {
						newObj['__internal'] = gridData[j]['__internal'];
					}
					gridData[j] = newObj;
					break;
				}
			}
			if (foundIdx == -1 && newObj['@metadata'].verb != 'UPDATE') { // Not found -- it's a new row
				gridData.push(newObj);
			}
			angular.forEach(gridData, function (record, index) {
				if (record['@metadata'].action || record['@metadata'].verb) {
					record['@metadata'].verb = null;
					record['@metadata'].action = null;
				}
			});
		}

		// GAAAAH!!! This caused me HOURS of agony over why stupid ng-grid
		// was not refreshing properly. Turns out, it doesn't watch the data,
		// just the *length* of the data. So we have to artificially affect
		// the length to get the grid to react properly. Oy.
		if (gridData.length > 0) {
			// Duplicate first row and remove it immediately
			gridData.push([]);
			$timeout(function () {
				gridData.pop();
				if (gridData.length === 1) {
					//child actions are intermittently hidden on saving a child row, root cause unknown, but kludge as follows:
					angular.element('.childActionButton').show();
					angular.element('.childZoomButton').show();
				}
				//angular.element('#childCollections').resize();
				$scope.refreshChildGrid();
			});
		}
	};
}]);
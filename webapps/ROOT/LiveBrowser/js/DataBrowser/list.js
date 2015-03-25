// Namespace
espresso.list = {};

espresso.app.controller( 'espresso.ListCtrl', [
		'$rootScope', '$scope', '$http', '$resource', '$routeParams', '$location', '$modal', '$sce', 'Events', '$timeout',
				'EspressoData', 'EspressoUtil', 'Settings', 'Notifications', 'Tables', 'DirectLink', 'Query', 'Device', 'Auth',
		function ($rootScope, $scope, $http, $resource, $routeParams, $location, $modal, $sce, Events, $timeout,
				EspressoData, EspressoUtil, Settings, Notifications, Tables, DirectLink, Query, Device, Auth) {
	var throttleDefault = 2000;
	$scope.grid = {};
	$scope.selectedRows = [];
	$scope.gridData = [];

	$scope.showAdditionalFilters = false;
	$scope.toggleShowAdditionalFilters = function toggleShowAdditionalFilters(value) {
		if (angular.isDefined(value)) {
			$scope.showAddtionalFilters = value;
		}
		else {
			$scope.showAddtionalFilters = !$scope.showAddtionalFilters;
		}
	};
	
	$scope.isSaving = false;
	Events.on('SaveStart', function () {
		$scope.isSaving = true;
		Notifications.suspend('promptUnsaved', true);
	});
	Events.on('SaveComplete', function () {
		$scope.isSaving = false;
		Notifications.suspend('promptUnsaved', 1000);
	});

	var loadAllSettings = function(callback) {
		$scope.pleaseWaitMessage = "Loading application settings";
		var modal = $modal.open({
			backdrop : true,
			keyboard : false,
			template : '<div class="NotificationContent" style="background-color: #D0FFD0;"><p>Please wait a moment...<br/></div>'
		});

		Settings.getAllAppsReadOnly(function success() {
			Settings.getAllTableSettingsReadOnly(function success2() {
//				setTimeout(function(){
					modal.dismiss();
//				}, 100);
				if (callback) callback();
			}, function failure2() {
				modal.dismiss();
			});
		}, function failure() {
			modal.dismiss();
		});
	};
	
	Events.on('WatchCurrentServer', function (event, server) {
		Tables.getAllTables(function () {
			if (!$rootScope.currentServer) {return;}
//			if (DirectLink.isLinkingUrl()) {return;} // This prevents the loading of tables if apiKey is provided in the URL

			loadAllSettings(function() {
				var firstTable = espresso.util.getFirstProperty($rootScope.allTables);
				if (firstTable) {
					var settings = Tables.getSettings(firstTable.name);
					if (settings.defaultTable) {
						firstTable = $rootScope.allTables[settings.defaultTable];
					}
					$scope.searchTable = firstTable.name;
					$scope.newTableSelected();
				}
				return;
				
				// Special handling for first-time users: select the Customers table
				if (window.parent && (window.parent != window) && $rootScope.allTables['Customers'] && !localStorage.introSeen) {
					$scope.searchTable = 'Customers';
					$scope.newTableSelected();
				}
				else {
					var firstTable = espresso.util.getFirstProperty($rootScope.allTables);
					if (firstTable) {
						$scope.searchTable = firstTable.name;
						$scope.newTableSelected();
					}
				}
			});
		});
	});
	
	var addedFilter = false;
	$scope.addSearchParam = function(idx) {
		addedFilter = true;
		setTimeout(function () {
			//angular runs ng-submit when a form input is added, interfering with the filter fly out being open
			addedFilter = false;
		}, 250);
		var table = currentTableSettings;
		var columns = table.columnFormats;
		var keys = _.keys(columns);
		var defaultColumn = columns[keys[0]];
		var filter = {
			column: defaultColumn,
			value: ''
		};
		$scope.searchFilter.splice(idx + 1, 0, filter);
	};

	$scope.removeSearchParam = function(idx) {
		if ($scope.searchFilter.length == 1) {
			$scope.searchFilter[0].value= "";
			return;
		}
		$scope.searchFilter.splice(idx, 1);
	};

	var mainCurrentlySorting = false;
	var lastTable = '';
	$scope.updateSortQuery = _.debounce(function (event, sort) {
		if (angular.isDefined(sort.fields)) {
			angular.forEach(sort.fields, function (field, index) {
				if (S(field).contains('__internal')) {
					//delete
				}
			});
		}
		if (!angular.equals($scope.sortEventData, sort)) {
			$scope.sortEventData = sort;
		}
	}, 500);
	
	$scope.$watch('sortEventData', function (current, previous) {
		if (angular.isDefined(current)) {
			if (previous && angular.equals(current.fields, previous.fields) && angular.equals(current.directions, previous.directions)) {
				return;
			}
			var tableColumnNames = _.keys(currentTableSettings.gridColumns);
			angular.forEach(current.fields, function (field, index) {
				if (!_.contains(tableColumnNames, field)) {
					current.fields.splice(index, 1);
				}
			});
			if (current.fields.length > 0) {
				Query.table($scope.searchTable).sort(current);
				$scope.runSearch(true, true);
			}
		}
	}, true);
	$scope.$on('ngGridEventSorted', $scope.updateSortQuery);
	
	$scope.grid.colDefs = {};

	///////////////////////////////
	$scope.selectRow = function selectRow(current, event, force) {
		if (!force &&
			(angular.isUndefined(current.entity) || !$scope.searchTable || !$scope.selectedRows[0])) { return; }
		if (EspressoData.isSaveable() && !angular.equals($scope.selectedRows[0], current.entity)) {
			var previous = $scope.selectedRows[0];
			var current = current.entity;
			//previous is insert
			var isPreviousInsert = previous && previous['@metadata'] && previous['@metadata'].action == 'INSERT';
			//current is not insert
			var isCurrentInsert = current && current['@metadata'] && current['@metadata'].action == 'INSERT';
			var isPreviousReady = $scope.selectedRow
			if (isPreviousInsert && isCurrentInsert) {
				Notifications.suspend('promptUnsaved', 50);
			}
			Notifications.promptUnsaved();
			console.log('unsaved');
			return false;
		}
			$scope.$evalAsync(function () {
				var data = {
					row : $scope.selectedRows[0],
					//event : event,
					details : currentTableDetails,
					activeSelection: true,
					settings : currentTableSettings
				};
				Events.broadcast('WatchMainRow', data);
			});
			return true;
	};
	$scope.resetGrid = _.throttle(function() {
		$scope.searchTable = Tables.mainTable;
		var selectScope = angular.element('#eslo-table-select').scope();
		if (selectScope) {
			selectScope.searchTable = Tables.mainTable;
		}
		$scope.grid.gridOptions = {
				data: 'gridData',
				enableCellSelection: true,
				enableCellEdit: false,
				enableRowSelection: true,
				enableColumnResize: true,
				useExternalSorting: true,
				enableColumnReordering: $rootScope.root.authorMode,
				//enableColumnReordering: true,
				beforeSelectionChange : $scope.selectRow,
				//afterSelectionChange: function (data) {console.log('changed', data);},
				multiSelect: false,
				rowHeight:35,
				maintainColumnRatios: true,
				showSelectionCheckbox: false,
				enablePaging: false,
				showFilter: false,
				//headerRowTemplate: 'nada2',
				showFooter: false,
				columnDefs: 'grid.colDefs',
//				headerRowTemplate: '<div ng-style="{ \'cursor\': row.cursor }" ng-repeat="col in renderedColumns" ng-class="col.colIndex()" class="ngCell {{col.cellClass}} eslo-grid-header">' +
//					'<div class="ngVerticalBar" ng-style="{height: rowHeight}" ng-class="{ ngVerticalBarVisible: !$last }">&nbsp;</div>' +
//					'<div ng-cell></div>' + 
//					'</div>',
				rowTemplate: '<div style="height: 100%" ng-class="getGridRowStyle(row)" class="eslo-search-table-row">' +
					'<div ng-repeat="col in renderedColumns" ng-class="col.colIndex()" class="ngCell ">' +
					'<div ng-cell></div>' +
					'</div>' +
					'</div>',
				selectedItems: $scope.selectedRows,
				keepLastSelected: true
		};
	}, throttleDefault);

	$scope.resetGrid();
	
	Events.on('ResetMainGrid', $scope.resetGrid);

	Events.on('WatchAuthorMode', function () {
		if ($rootScope.root.authorMode) {
			$timeout(function () {
				Events.broadcast('RefreshMainGrid');
			}, 0);
		}
	});

	Events.on('RefreshMainGrid', function () {
		$scope.refreshMainGrid();
	});

	Events.on('AlertUnsavedClosed', function () {
		$scope.$evalAsync(function () { $scope.refreshMainGrid(); });
	});
	
	$scope.refreshMainGrid = function () {
		if (angular.isDefined($scope.grid.gridOptions.ngGrid) && angular.isDefined($scope.grid.gridOptions.ngGrid.config)) {
			$scope.grid.gridOptions.ngGrid.config.enableColumnReordering = $rootScope.root.authorMode;
			$scope.grid.gridOptions.ngGrid.buildColumns();
		}
		else if (angular.isDefined($scope.grid.gridOptions.enableColumnReordering)) {
			$scope.grid.gridOptions.enableColumnReordering = $rootScope.root.authorMode;
		}
		Events.broadcast('WatchMainRow', {
			row: $scope.selectedRows[0],
			settings: Tables.getSettings(Tables.mainTable),
			mainRefresh: true,
			details: Tables.getDetails(Tables.mainTable)
		});

		$scope.resetGrid();
		$scope.setupGrid();
		attachColumnResizeHandlers();
	};
	

	/////////////////////////////////////////////////////////////////////////////
	// This gets called whenever something is "edited", even if no change is actually made
	// We compare the current value with the original value and set the action to update if
	// any attribute is different.
	$scope.$on('ngGridEventEndCellEdit', function(evt){
		Events.broadcast('EditToMainGrid');
		if (angular.isUndefined(evt.targetScope.row)) {return;}
		var currentRow = evt.targetScope.row.entity;
		var oldRow = evt.targetScope.row.entity["__original"];
		if ( !oldRow ) // In the case of inserted rows
			return;
		_.each(currentTableDetails.columnsByName, function(column, columnName) {
			var oldValue = oldRow[column.name];
			var newValue = currentRow[column.name];
			if (oldValue != newValue) {
				evt.targetScope.row.entity["@metadata"].action = "UPDATE";
				return;
			}
		});
	});

	/////////////////////////////////////////////////////////////////////////////
	// When switching between read-only mode and edit mode, we need to enable/disable editing in the grid
	Events.on('WatchEditMode', function (event, data) {
		var oldMainRow = angular.copy(data.mainRow);
		_.each($scope.grid.colDefs, function (e) {
			e.enableCellEdit = $rootScope.root.editMode;
		});
		if (oldMainRow.length) {
			$scope.setGridRowTo(oldMainRow);
		}
	});
	
	$scope.setGridRowTo = function setGridRowTo(row) {
		var recordIndex = false;
		angular.forEach($scope.gridData, function (record, index) {
			if (angular.equals(record, row[0])) {
				recordIndex = index;
			}
		});
		
		if (recordIndex) {
			$scope.$evalAsync(function () {
				$scope.grid.gridOptions.selectItem(recordIndex, true);
			})
		}
	};
	
	/////////////////////////////////////////////////////////////////////////////
	// Style the rows
	$scope.getGridRowStyle = function(row, test) {
		var action = row.entity["@metadata"].action;
		if (!action) return "";
		if (action == 'DELETE') return "gridDeletedRow";
		if (action == 'INSERT') return "gridInsertedRow";
		if (action == 'UPDATE') return "gridUpdatedRow";
		return "";
	};

	/////////////////////////////////////////////////////////////////////////////
	$scope.getGridActionIcon = function(row) {
		var action = row.entity["@metadata"].action;
		if (!action) return "fa fa-times";
		if (action == 'DELETE') return "fa fa-undo";
		if (action == 'INSERT') return "fa fa-times";
		if (action == 'UPDATE') return "fa fa-undo";
	};
	
	$scope.getGridActionTip = function(row) {
		var action = row.entity["@metadata"].action;
		if (!action) return "Mark this row for deletion";
		if (action == 'DELETE') return "Undelete this row";
		if (action == 'INSERT') return "Un-insert this row";
		if (action == 'UPDATE') return "Undo changes to this row";
	};

	/////////////////////////////////////////////////////////////////////////////
	$scope.actClicked = function(row) {
		if ( ! $rootScope.root.editMode) {
			Notifications.error( 'This can only be done in edit mode.');
			return;
		}
		console.log('Action clicked for row');

		var action = row.entity["@metadata"].action;

		if (row.entity["@metadata"].next_batch)
			return;

		if ( !action) {
			row.entity["@metadata"].action = 'DELETE';
		}
		else if (action == 'UPDATE') { // Rollback
			_.each(espresso.list.currentTableDetails.columns, function(col) {
				row.entity[col.name] = row.entity["__original"][col.name];
			});
			_.each(espresso.list.currentTableDetails.parents, function(parent) {
				row.entity["__internal"].parentRows[parent.name] = row.entity.__original.__internal.parentRows[parent.name];
			});
			row.entity["@metadata"].action = null;
		}
		else if (action == 'DELETE') { // Undelete
			row.entity["@metadata"].action = null;
		}
		else if (action == 'INSERT') { // De-insert, aka delete
			$scope.gridData.splice(row.rowIndex, 1);
		}
	};
	
	
	$scope.isUndoDigesting = function isUndoDigesting() {
		return !$scope.isUnsavedSuspended;
	};
	var rowInitialized = false;
	/////////////////////////////////////////////////////////////////////////////
	// Whenever the selection changes, set the currentRow to it.
	$scope.$watch("selectedRows[0]", function(current, previous) {
		//previous is insert
		var isPreviousReady = previous && previous['@metadata'] && previous['@metadata'].action == 'INSERT';
		//current is not insert
		var isCurrentReady = current && current['@metadata'] && current['@metadata'].action != 'INSERT';
		if (isPreviousReady && isCurrentReady) {
			if (!$scope.isUndoDigesting()) {
				$scope.selectedRows[0] = previous;
			}
		}
		
		
		//ACTION: Predictive Selection
		//a change in table to update the Form view
		if (angular.isUndefined(current)) {  return; }
		if (!$scope.searchTable) { $('#leftGridContainer').resize(); return; }
		var data = {
			row : $scope.selectedRows[0],
			details : currentTableDetails,
			settings : currentTableSettings
		};
		
		Events.broadcast('WatchMainRow', data);
	});
	$scope.$on('ngGridEventData', function (e,s) {
		if ($scope.grid.gridOptions.selectRow) {
			$scope.grid.gridOptions.selectRow(0, true);
		}
	});
	
	
	/////////////////////////////////////////////////////////////////////////////
	// When the user selects a table from the select
	$scope.newTableSelected = function(scope) {
		if (scope && scope.searchTable && scope.searchTable != $scope.searchTable) {
			$scope.searchTable = scope.searchTable;
		}
		if (EspressoData.isSaveable()) {
			var searchTable = Tables.mainTable;
			Notifications.promptUnsaved().result.then(function () {
				$scope.searchTable = searchTable;
			});
		}
		else {
			Query.clear();
			$scope.gridData = [];
			if ($scope.grid.gridOptions.ngGrid) {
				$scope.grid.gridOptions.ngGrid.config.sortInfo = { fields:[], directions: [], columns:[] };
				angular.forEach($scope.grid.gridOptions.ngGrid.lastSortedColumns, function (c) {
					c.sortPriority = null;
					c.sortDirection = "";
				});
				$scope.grid.gridOptions.ngGrid.lastSortedColumns = [];
			}
			var tableSettings = Tables.getTableSettings($scope.searchTable);
			var tableDetails = Tables.getDetails($scope.searchTable);
			var data = {
				details : tableDetails,
				settings : tableSettings,
				broadcaster : 'main'
			};
			Tables.mainTable = $scope.searchTable;
			Events.broadcast('WatchCurrentTable', data);
			setTimeout(function () {$scope.$digest();}, 500);
		}
	};
	
	Events.on('FocusMainTable', function (event, data) {
		angular.element('#eslo-table-select').scope().searchTable = data.settings.name;
		$scope.searchTable = data.settings.name;
		$scope.newTableSelected();
	});
	
	var currentTableDetails = {};
	var currentTableSettings = {};
	Events.on('DefaultColumn', function (event, column) {
		$scope.searchFilter[0].column = column;
		$scope.bestColumn = column;
		
	});
	
	$scope.$watch('searchFilter', function (current, previous) {
		return;
		if (!current || !current[0].column || angular.isUndefined(current[0].column)) {return;} //init still in progress
		$scope.hasDateFilter = [];
		angular.forEach(current, function (filter, index) {
			if (filter.column && filter.column.generic_type === 'date') {
				console.log(filter);
				$scope.hasDateFilter.push(index);
			}
		});
	});
	
	//looks for date columns in $scope.searchFilter
	$scope.isFilteredByDate = function () {
		var hasDateFilter = [];
		angular.forEach($scope.searchFilter, function (filter, index) {
			if (filter.column && filter.column.generic_type === 'date') {
				hasDateFilter.push(index);
			}
		});
		return hasDateFilter;
	};
	
	$scope.formatDateByColumnType = function (column) {
		var types = {
			'TIMESTAMP' : 'YYYY-MM-DD HH:mm:ss',
			'DATETIME' : 'YYYY-MM-DD HH:mm:ss',
			'YEAR' : 'YYYY',
			'DATE' : 'YYYY-MM-DD',
			'TIME' : 'HH:mm:ss'
		};
		return types[column.type] || 'YYYY-MM-DD';
	};

	//on blur, format date column filter parameters
	$scope.searchFilterBlur = function () {
		var dateFilters = $scope.isFilteredByDate();
		if (dateFilters.length) {
			angular.forEach(dateFilters, function (filterIndex) {
				var value = angular.copy($scope.searchFilter[filterIndex].value);
				var char1 = value.charAt(0);
				var operator = '=';
				if (value === '') {return;}
				if (_.contains(['<', '>', '='], char1)) {
					value.slice(1);
					operator = char1;
				}

				$scope.searchFilter[filterIndex].userInput = operator + value;
				var strippedValue = $scope.stripAllowedOperators(value);
				var valueAsMoment = moment(strippedValue); //a date object adjusted by moment.js to the local TZ
				var format = $scope.formatDateByColumnType($scope.searchFilter[filterIndex].column); //the format for the column type
				var zonedValue = angular.copy(valueAsMoment).zone(strippedValue); //a date object adjusted to GMT
				
				var isAlreadyFormatted = moment(strippedValue, format, true).isValid(); //
				var newValue = zonedValue.format(format); //the output of the string
				if (isAlreadyFormatted) {
					newValue = valueAsMoment.format(format); //if formatted, this does not need to be TZ adjusted
				}
				$scope.searchFilter[filterIndex].value = operator + newValue;
			});
		}
	};

	//on focus, remove date column filter formats
	$scope.searchFilterFocus = function () {
		return;
		var dateFilters = $scope.isFilteredByDate();
		if (dateFilters.length) {
			angular.forEach(dateFilters, function (filterIndex) {
				if ($scope.searchFilter[filterIndex].userInput) {
					$scope.searchFilter[filterIndex].value = $scope.searchFilter[filterIndex].userInput;
				}
			});
		}
	};
	
	//searchFilterFocus
	
	Events.on('WatchCurrentTable', function (event, table) {
		if (angular.isUndefined(table.broadcaster) || table.broadcaster != 'main' || !table.details) {return;}
		espresso.list.currentTableDetails = table.details;
		currentTableDetails = table.details;
		currentTableSettings = table.settings;
		$scope.mainColumnFormats = currentTableSettings.columnFormats;
		$scope.searchTable = table.settings.name;
		$scope.nextLink = null;
		Events.broadcast('WindowState', table.settings.windows);

		$scope.setupGrid();
		//console.log('curwatch');
		$scope.getGridData(function(data) {
			if (data.length > 0 && !$scope.scalarRowSelected) {
				$scope.selectedRows[0] = data[0];
			}
		});
		$scope.searchCriteria = [{col: _.values( table.settings.columnFormats )[0], colValue: ""}];

		// Clear out the search values
		_.each($scope.searchFilter, function searchFilterLoop(element, index) {
			element.value = "";
		});
		$scope.showAddtionalFilters = false;
	});

	/////////////////////////////////////////////////////////////////////////////
	// Take a guess at a reasonable width for a column given its data type
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

	// The left-most header, which contains a popup to select which columns to show
	var leftHeaderTemplate =
		"<div class='columns-dropdown'>" +
			"<i class='fa fa-columns' style='padding-left: 4px; padding-top: 8px;' title='Select which columns should be shown in this table' " +
				"ng-click='editColumnSelection(\"grid\")' ng-show='root.authorMode'></i>" +
		"</div>" +
		"<div ng-mouseover='ieHeaderGripFix();' ng-show='col.allowResize' class='ngHeaderGrip' ng-click='col.gripClick($event)' " +
		"ng-mousedown='col.gripOnMouseDown($event)'></div>";

	$scope.gripping = false;
	$scope.dragging = false;
	$scope.ieHeaderGripFix = function ieHeaderGripFix() {
		$('.ngHeaderSortColumn').parent().find('*').hover(function (event) {
			var $element = $(event.target);
			var $this = $(this);
			var $cell = $this.closest('.ngHeaderSortColumn').parent();
			var $grip = $cell.parent().find('.ngHeaderGrip');
			if (!$grip.length) {
				//understanding this is optional:
					//$ancestorElement.find(currentlyHoveredElement) finds nothing, which makes absolutely no sense
				if ($element.is(':hover')) {
					// No questions asked, we're hovering: declare as much and move on
					$scope.gripping = true;
					return;
				}
				// IE doesn't think we're hovered, and can't tell if we intend drag or grip:
					// because both start on a delay
				if ($scope.gripping) {
					//when last we checked, we were gripping
					setTimeout(function () {
						if ($element.is(':hover')) {
							//no questions asked, we're hovering: declare as much and move on
							$scope.gripping = true;
							return;
						}
						$scope.gripping = false;
					},300);
				}
			}
		}).on('dragstart', function (event) {
			if ($(event.target).hasClass('ngHeaderSortColumn')) {return;};
			if ($scope.gripping) {
				event.preventDefault();
				event.stopPropagation();
				setTimeout(function () {$scope.gripping = false;}, 300);
			}
		});
	};
	
	$scope.mobileForceClick = function (event) {
		if (!Device.isMobile()) {return;}
		if ($rootScope.root.editMode) {
			var $cell = angular.element(event.target);
			var $selected = $cell.closest('.selected');
			if ($selected.length > 0) {
				var $first = $cell.first();
				$scope.$evalAsync(function () {
					$first.dblclick();
				});
			}
		}
	};
	var forceLockBoolean = false;
	Events.on('ForceLockMainGrid', function (event, lockBoolean) {
		//forceLockBoolean = lockBoolean;
	});
	
	//called when parent columns are sorted, currently only warns that this is not supported
	$scope.sortByParentColumn = function sortParent () {
		Notifications.info('Sort by parent columns is not yet supported.');
	};
	$scope.sortByBinaryColumn = function sortParent () {
		Notifications.info('Sorting by a binary column is not supported.'); //... and couldn't serve a purpose.
	};
	
	
	///////////////////////////////////////////////////////////////////////////////////////////
	// Set up the grid's headers and cell templates. This gets called when a new table is selected,
	// and also when a column is selected/deselected.
	$scope.setupGrid = _.throttle(function() {
		if (forceLockBoolean) {return;}
		var tableSettings = Tables.getTableSettings($scope.searchTable);
		/**
		 * @ngdoc method
		 * @name CellTemplate.defined.302
		 */
		var colDefs = [
			{
			displayName: "",
			width: "25px",
			enableCellEdit: false,
			enableCellSelection: false,
			groupable: false,
			table: currentTableDetails.name,
			headerCellTemplate: leftHeaderTemplate,
			cellTemplate: "<div ng-init='root.mainGridEvaluate(this, col.colDef);' class='ngCellText' style='{{this.styles}}'>" +
				"<div style='{{this.styles}}'><button " +
				"class='btn btn-sm {{getGridActionIcon(row)}} gridActionButton searchGridActionButton' " +
				"ng-click='actClicked(row)' title={{getGridActionTip(row)}}></button></div>"
			}
		];
		if ( _.size(tableSettings.gridColumns) == 0) {
			console.log("***** BUG! No columns found for grid.");
		}
		_.each(tableSettings.gridColumns, function(c) {
			if( angular.isUndefined( c ) ){ return; }
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
				"<div ng-mouseover='ieHeaderGripFix();' class=\"ngHeaderSortColumn " + headerClass + " \" " +
						"ng-style=\"{'cursor': col.cursor}\" ng-class=\"{ 'ngSorted': !noSortVisible }\">" +
					"<div ng-class=\"'colt' + col.index\" class=\"ngHeaderText\">" +
						"<span ng-click=\"" + sortFunction + "\">{{col.displayName}}</span>" +
						"<i class='fa fa-cog gridHeaderButton eslo-header-button' ng-click=\"editColumnHeader(col)\" " +
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

			var editButton = "";
			if (c.parentRole)
				editButton = "<i class='fa fa-sort-up' style='margin-left: 7px; float: right;' " +
					"ng-click='selectParent(col, row, $event)' ng-show='root.editMode'></i>";
			else if (currentTableDetails.columnsByName[c.name].isFk)
				editButton = "<i class='fa fa-sort-up' style='margin-left: 7px; float: right;' " +
					"ng-click='selectFK(col, row, $event)' ng-show='root.editMode'></i>";
			var dblClickAction = "alertIfUneditable(null, col.colDef.field);";
			if (c.parentRole)
				dblClickAction = "selectParent(col, row, $event)";
			var cellClass = "";
			if (c.parentRole)
				cellClass = " parentColumnCell";
			var cellTemplate = "<div ng-init='root.mainGridEvaluate(this, col.colDef);' ng-click='mobileForceClick($event);'  ng-dblclick='alertIfUneditable(null, col.colDef.field);' style='{{this.styles}}' class=\"ngCellText" + cellClass + "\" ng-class=\"col.colIndex()\">" +
				editButton +
				"<span style='{{this.styles}}' ng-click=\"isEditable(null, col);\" ng-cell-text hm-touch=\"root.forceCellDblClick($event,col);\">" +
				"{{COL_FIELD|InputMask:'"+c.maskType+"':'"+c.mask+"':'"+c.type+"':'"+c.generic_type+"' }}</span></div>";
			var colType;
			var editableTemplate = null;
			if (c.parentRole) {
				colType = tableSettings.parentSettings[c.parentRole].columnFormats[c.name].type;
				colGenericType = tableSettings.parentSettings[c.parentRole].columnFormats[c.name].generic_type;
			}
			else {
				colType = currentTableDetails.columnsByName[c.name].type;
				colGenericType = currentTableDetails.columnsByName[c.name].generic_type;
			}
			switch (colGenericType) {
			case 'boolean':
				// dealt with further on
				break;
			case 'number':
					inputType = 'number';
					if (Device.isFirefox()) {
						inputType = 'text';
					}
					style += 'text-align: right;';
					cellTemplate = "<div ng-init='root.mainGridEvaluate(this, col.colDef);' style='text-align: right;{{this.styles}};' ng-click='mobileForceClick($event);' ng-dblclick='alertIfUneditable(null, col.colDef.field);' class=\"ngCellText" + cellClass +
						"\" ng-class=\"col.colIndex()\" style=\"text-align: right;\" espresso-track-model ng-model='COL_FIELD'>" +
						editButton +
						"<span style='{{this.styles}}' ng-click=\"isEditable(null, col);\" ng-dblclick=\"" + dblClickAction +
						"\" hm-touch=\"root.forceCellDblClick($event,col);\" ng-cell-text>{{ COL_FIELD | InputMask:'" +
						c.maskType+"':'"+c.mask+"':\""+c.prefix+"\":'"+c.suffix+"' }}</span></div>";

					break;
			case 'date':
				switch (colType) {
				case 'DATE':
					inputType = 'text';
					//editableTemplate = "<quick-datepicker disable-timepicker='true' label-format='MM-dd-yy' ng-input=\"COL_FIELD\" ng-class=\"'colt' + col.index\" ng-input=\"COL_FIELD\"  ng-show='editMode' class='gridQuickDate' icon-class='fa fa-calendar' ng-model='COL_FIELD'></quick-datepicker>" ;
					editableTemplate = '<div espresso-date-input ng-model="COL_FIELD" settings-reference="mainTable" col="col.colDef"></div>';
					break;
				case 'TIME':
					inputType = 'time';
					break;
				case 'DATETIME':
				case 'TIMESTAMP':
				default:
					inputType = 'text';
					//editableTemplate = "<quick-datepicker label-format='MM-dd-yy' ng-class=\"'colt' + col.index\" ng-input=\"COL_FIELD\"  ng-show='editMode' class='gridQuickDate' icon-class='fa fa-calendar' ng-model='COL_FIELD'></quick-datepicker>" ;
					//editableTemplate = 
					editableTemplate = '<div espresso-date-input ng-model="COL_FIELD" settings-reference="mainTable" col="col.colDef"></div>';
					break;
				}
				break;
			case 'binary':
				cellTemplate = 'templates/cells/binary.html';
				break;
			}
			var newColDef = {
				field: c.dataSource,
				initialized: false,
				displayName: c.alias,
				tableName: currentTableSettings.name,
				dataSource: c.dataSource,
				eval: c.eval,
				grid : 'main',
				enableCellEditOnFocus: true,
				enableCellEdit: $rootScope.root.editMode && !c.parentRole && c.is_editable,
				headerCellTemplate: headerCellTemplate,
				cellFilter: 'number',
				editableCellTemplate: "<input ng-trim='false' data-clicks='0' onfocus='moveCursorToEnd(this)' type='" + inputType + "' style='" + style +
					"' ng-class=\"'colt' + col.index\" ng-input=\"COL_FIELD\" ng-model=\"COL_FIELD\" />"
			};
			if (cellTemplate)
				newColDef.cellTemplate = cellTemplate;
			if (editableTemplate)
				newColDef.editableCellTemplate = editableTemplate;
			if (c.parentRole)
				newColDef.enableCellEdit = false;

			if ('boolean' === colGenericType) {
				newColDef.cellTemplate = "<div ng-dblclick='alertIfUneditable(null, col.colDef.field);' class=\"ngCellText\" ng-class=\"col.colIndex()\" style=\"text-align: center;{{this.styles}}\">" +
					"<input ng-trim='false' type='checkbox' " +
					"ng-change='gridBooleanChanged(row, \"" + c.name + "\")' " +
					"ng-disabled='!root.editMode'" +
					"ng-click=\"alertIfUneditable(null , col.colDef.field)\"" +
					"ng-class=\"'colt' + col.index\" ng-input=\"COL_FIELD\" ng-model=\"COL_FIELD\" /></div>";
				newColDef.enableCellEdit = false;
			}
			colDefs.push(newColDef);
		});
		$scope.grid.colDefs = colDefs;
		$scope.computeColumnWidths(tableSettings);
		attachColumnResizeHandlers();
	}, throttleDefault);


	function attachColumnResizeHandlers() {
		setTimeout(function () {
			//column re-sizing saved locally:
			$('#leftGridContainer .ngHeaderGrip').mouseup(function (event) {
				var ngColumns = angular.element('#leftGridContainer .ngGrid').scope().columns;
				angular.forEach(ngColumns, function (ngColumn, index) {
					var newWidth = Device.columnWidth(ngColumn, ngColumn.width);
				});
			});
			
			//column re-ordering
			$('#leftGridContainer .ngHeaderSortColumn').each(function (index, element) {
				var ngColumns = angular.element('#leftGridContainer .ngGrid').scope().columns;
				//firefox does not have a dragend event handler:
				element.addEventListener('dragend', function () {
					Settings.isReady().then(function () {
						var settings, columns, sourcesMap, updatedGrid = {};
						settings = Tables.getCurrent();
						columns = Tables.getSourcesToColumns(settings.gridColumns);
						sourcesMap = _.object(_.pluck(columns, 'dataSource'), _.keys(settings.gridColumns));
						angular.forEach(ngColumns, function (ngColumn, index) {
							var col, displayName;
							if (angular.isDefined(ngColumn.field)) {
								col = columns[ngColumn.field];
								displayName = sourcesMap[ngColumn.field];
								updatedGrid[displayName] = settings.gridColumns[displayName];
							}
						});
						if (Tables.hasModifiedColumns(settings.gridColumns, updatedGrid)) {
							settings.gridColumns = updatedGrid;
							Settings.saveTableOptions(settings);
						}
					});
				});
			});
		}, 1000);
	}
	
	$rootScope.$watch('root.editMode', function () {
		attachColumnResizeHandlers();
		$scope.$broadcast('ngGridEventData');
	});
	
	
	$scope.$on('ngGridEventData', _.debounce(function (event, gridId) {
		var sized = false;
		var $mainGridContainer = angular.element('#leftGridContainer .ngGrid');
		if ($mainGridContainer.length){
			var ngColumns = $mainGridContainer.scope().columns;
			angular.forEach(ngColumns, function (ngColumn, index) {
				if (true) {
					//this was supposed to check if it had been initialized, but that did not work consistently. Now it attempts to resize every time the event fires.
						//if (angular.isDefined(ngColumn.colDef.initialized) && !ngColumn.colDef.initialized) {
					ngColumn.colDef.initialized = true;
					var savedWidth = Device.columnWidth(ngColumn);
					if (savedWidth && savedWidth[ngColumn.field]) {
						ngColumn.colDef.width = Math.abs(savedWidth[ngColumn.field].width) + 'px';
					}
					sized = true;
				}
			});
		}
	}, 1000));
	
	////////////////////////////////////////////////////////////////////////////////
	// Set the width of the columns to be proportionately correct, based on
	// the previous values, or if none, the default width for the data type.
	$scope.computeColumnWidths = function() {
		var tableSettings = Tables.getTableSettings(currentTableDetails.name);
		var preset = Device.isWidthPreset('main', tableSettings);

		var totalWidth = 0;
		_.each(tableSettings.gridColumns, function(c) {
			if (!c.width) {
				c.width = $scope.getColumnWidth(c);
			}
			
			if (espresso.util.isNumber(c.width))
				totalWidth += Number(c.width);
			else if (/\*+/.test(c.width)) {
				totalWidth += 100 * c.width.length;
				c.width = 100 * c.width.length;
			}
			else {
				console.log('Invalid value for column width : ' + c.width + ' for ' + c.name);
			}
		});
		
		if (totalWidth == 0) {
			console.log('No columns defined for computeColumnWidths ???');
			return;
		}

		var divWidth = $('#leftSide').width() - 40; // Account for leftmost column
		_.each(tableSettings.gridColumns, function(c) {
			c.width = divWidth * c.width / totalWidth;
			_.find($scope.grid.colDefs, function(colDef) {
				if (c.dataSource == colDef.field) {
					//console.log(preset);
					if (angular.isObject(preset)) {
						var preWidth = preset[c.dataSource];
						var width = 0;
						if (preWidth) {
							width = preWidth.width;
						}
							
						if (!width) {width = c.width;}
						colDef.width = "" + Math.abs(width) + "px";
					}
					else {
						colDef.width = "" + Math.abs(c.width) + "px";
					}
					return true;
				}
			});
		});
	};

	////////////////////////////////////////////////////////////////////////////////////////////
	// Look at the current column sizes and copy them in the tableSettings.
	$scope.saveColWidth = function() {
		if ( ! currentTableDetails || !$scope.grid.gridOptions.$gridScope)
			return;
		var tableSettings = Tables.getTableSettings(currentTableDetails.name);
		_.each($scope.grid.gridOptions.$gridScope.columns, function(colDef) {
			_.find(tableSettings.scalarColumns, function(c) {
				if (c.dataSource == colDef.field) {
					c.width = colDef.width;
					if (/.+px/.test(c.width))
						c.width = Number(c.width.substring(0, c.width.length - 2));
					//console.log('After resize - column ' + colDef.field + " : " + c.width);
					return true;
				}
			});
		});
	};

	////////////////////////////////////////////////////////////////////////////////////////////
	// When the left side is resized, we recompute the column sizes to fit the new width.
	$('#leftSide').resize(function() {
		//console.log('leftTableDiv width changed to: ' + $('#leftSide').width());
		$scope.saveColWidth();
		$scope.computeColumnWidths();
	});
	
	////////////////////////////////////////////////////////////////////////////////////////////
	$scope.gridBooleanChanged = function(row, colName) {
		console.log('Grid boolean changed');
		if (!row.entity['@metadata'] || row.entity['@metadata'].action === 'INSERT') {
			// Ignore inserted rows
			return;
		}
		if (espresso.util.rowsAreEqual(row.entity, row.entity['__original'])) {
			row.entity['@metadata'].action = null;
		}
		else {
			row.entity['@metadata'].action = 'UPDATE';
		}
	};

	////////////////////////////////////////////////////////////////////////////////////////////
	$scope.gridCellDoubleClicked = function(col) {
		if (!$rootScope.root.editMode)
			$scope.alertIfUneditable(null, col.colDef.field);
	};

	////////////////////////////////////////////////////////////////////////////////////////////
	$scope.getColumnSettingsForField = function(fieldName) {
		var settings = _.find(currentTableSettings.gridColumns, function(c, cName) {
			if (fieldName == c.dataSource)
				return true;
		});
		return settings;
	};

	/////////////////////////////////////////////////////////////////////////////////
	// Open the dialog for the column's options.
	$scope.editColumnHeader = function(col) {
		//var colSettings = col.colDef.columnSettings;
		var colSettings = $scope.getColumnSettingsForField(col.colDef.field);
		var colInfo = null;
		if (colSettings.parentRole) {
			var parentName = currentTableDetails.parentsByName[colSettings.parentRole].parent_table;
			colInfo = $rootScope.allTables[parentName].columnsByName[colSettings.name];
		}
		else {
			colInfo = currentTableDetails.columnsByName[colSettings.name];
		}

		$scope.root.editColumn(currentTableDetails.name, colInfo, colSettings, function() {
			_.find($scope.grid.colDefs, function(c) {
				if (c.field == colSettings.dataSource) {
					c.displayName = colSettings.alias;
					return true;
				}
			});
		});
	};
	
	$scope.fetchingNext = false;
	//////////////////////////////////////////////////////////////////////////////////
	// Retrieve a page of data from the server.
	// If fromScratch, run the query regardless of whether there is a next batch
	$scope.getGridData = function(fromScratch, doNext) {
		var formTable = Tables.formTable;
		var mainTable = Tables.mainTable;
		var oldSelected = angular.copy($scope.selectedRows);
		$rootScope.trackAction('livebrowser_search');

		var url = $scope.searchTable;
		var filter = $scope.buildSearchFilter(fromScratch);
		if ($scope.nextLink && doNext) {
			url = $scope.nextLink;
			$scope.fetchingNext = true;
		}
		if (!fromScratch) {
			filter = null;
		}
		EspressoData.query(url, $scope.searchTable, filter , function(data){
			$scope.$evalAsync(function () {
				//console.log('attempt', _.indexBy(data, 'name'));
				for (var i = 0; i < data.length; i++) {
					data[i]["__original"] = espresso.util.cloneObject(data[i]); // Make a copy so we can compare
				}
				
				var previousSelected = angular.copy($scope.selectedRows[0]);

				var nextLink = false;
				if (data.length && data[data.length - 1]['@metadata'].next_batch) {
					nextLink = data[data.length - 1]['@metadata'].next_batch;
					data.pop(); // Get rid of next_batch item
				}

				var fullData = $scope.gridData.concat(data);
				if ( ! $scope.gridData || $scope.gridData.length == 0) {
					if (fullData.length > 0 && !$scope.scalarRowSelected) {
						//$scope.selectedRows[0] = fullData[0];
					}
				}
				$scope.gridData = fullData;
				$scope.nextLink = nextLink;

				//if ($scope.)
				if (mainTable == formTable) {
					$timeout(function () {
						angular.forEach($scope.gridData, function (row, i) {
							if (angular.equals(row, oldSelected[0])) {
								$scope.grid.gridOptions.selectRow(i, true);
							}
						});
						//console.log($scope.gridData.indexOf(oldSelected[0]), oldSelected, $scope.gridData);
						return;
						$scope.selectedRows = oldSelected;
						var d = {
							row : $scope.selectedRows[0],
							//event : event,
							details : currentTableDetails,
							settings : currentTableSettings
						};
						Events.broadcast('WatchMainRow', d);
					});
				}
				
				// We shouldn't have to do that, but without this, not all the rows show up
				// unless we resize the pane or the browser window. This is most likely caused
				// by something not quite right in the DOM, but I could not figure out what.
				// This is behavior is fairly new and was *probably* introduced by the look&feel
				// rework in late March 2014.
				$('#leftTableDiv').trigger('resize');
			});
		}, undefined, function (data) {
			//console.log(table, field, $rootScope.allTables[table].columnsByName[field], data);
			Notifications.error(data.errorMessage);

			Query.clear();
			$scope.gridData = $scope.previousState.data;
			$scope.nextLink = $scope.previousState.nextLink;
		})['finally'](function () {
			setTimeout(function () {
				$scope.fetchingNext = false;
				mainCurrentlySorting = false;
			}, 1000);
		});
	};
	
	$scope.isMainFetchDisabled = function isMainFetchDisabled() {
		if ($scope.fetchingNext) { return true; }
		return !$scope.nextLink;
	};

	$scope.searchFilter = [
		{
			column: '',
			value: ''
		}
	];

	Events.on('SettingsUpdate', function () {
		Events.broadcast('RefreshMainGrid');
	});
	
	$scope.setDefaultSearchColumn = function setDefaultSearchColumn() {
		if ($scope.searchFilter.length) {
			if (angular.isUndefined($scope.searchFilter[0].column) && !$scope.searchFilter[0].column) {
				var columns = _.keys(currentTableSettings.columnFormats);
				$scope.searchFilter[0].column = currentTableSettings.columnFormats[columns[0]];
			}
		}
	};

	
	// This gets called when the Search button is clicked
	$scope.runSearch = _.throttle(function(fromScratch, fromSort) {
		$scope.setDefaultSearchColumn();
		if (EspressoData.isSaveable()) {
			Notifications.promptUnsaved();
		}
		else {
			if (addedFilter) { return; }
			$scope.searchFilterBlur();
			$scope.toggleShowAdditionalFilters(false);
			$scope.previousState = {
				data : angular.copy($scope.gridData),
				nextLink : angular.copy($scope.nextLink)
			};
			$scope.gridData = [];
			$scope.nextLink = false;
			$scope.getGridData(true);
		}
	}, 1000);

	//used to evaluate the actual filter value
	$scope.stripAllowedOperators = function stripAllowedOperators(value) {
		return value.replace('>', '').replace('<', '').replace('=', '');
	};
	
	$scope.escapeStringValues = function escapeStringValues(value) {
		return value.replace("'", "\\'");
	};
	
	// Build the filter string based on the search inputs
	$scope.buildSearchFilter = function (isFromRunSearchBoolean) {
		if (isFromRunSearchBoolean !== true) {
			return;
		}
		var filter = "";
		angular.forEach($scope.searchFilter, function searchFilterLoop(element, index) {
			var fragment = '';
			var dateApiCode = '';
			if (element.value === '') {return;}
			switch (element.column.type) {
				case 'CHAR':
				case 'NCHAR':
				case 'VARCHAR':
				case 'NVARCHAR':
					fragment = element.column.name + " LIKE '%" + $scope.escapeStringValues(element.value) + "%'";
					break;
				//standard numeric for Oracle, MySQL, and MSSQL
				case 'TINYINT':
				case 'SMALLINT':
				case 'MEDIUMINT':
				case 'INT':
				case 'INTEGER':
				case 'BIGINT':
				case 'DECIMAL':
				case 'NUMERIC':
				case 'FLOAT':
				case 'DOUBLE':
				//MSSQL only
				case 'MONEY':
				case 'SMALLMONEY':
					if ($scope.stripAllowedOperators(element.value).match(/[a-z]/i)) {
						Notifications.info('Warning: searching ' + element.column.alias + ' with alpha charaters is not allowed and was ignored.');
						break;
					}
					var char1 = element.value.charAt(0);
					if (char1 == '>' || char1 == '<')
						fragment = element.column.name + element.value;
					else if (char1 == '=')
						fragment = element.column.name + element.value;
					else
						fragment = element.column.name + "=" + element.value;
					break;
				case 'BOOLEAN':
					fragment = element.column.name + "=" + element.value;
					break;
				case 'TIMESTAMP':
				case 'DATETIME':
				case 'TIME':
				case 'DATE':
				case 'YEAR':
					if (S(element.value).contains('Invalid date')) {
						//poor formatting prevents moment from converting the string to anything useful;
						break;
					}
					apiCodes = {
						'TIMESTAMP' : 'ts',
						'DATETIME' : 'ts',
						'DATE' : 'd',
						'TIME' : 't',
						'YEAR' : ''
					};
					dateApiCode = apiCodes[element.column.type];
					var char1 = element.value.charAt(0);
					var value = angular.copy(element.value);
					var operator = '=';
					if (_.contains(['<', '>', '='], char1)) {
						value.slice(1);
						operator = char1;
					}
					if (!angular.equals(dateApiCode, '')) {
						fragment = element.column.name + operator + '{' + dateApiCode + " '" +
							value.replace('>', '').replace('<', '').replace('=', '') +
							"'}";//datetime, timestamp, date
					}
					else {
						fragment = element.column.name + operator + value;//year
					}
					break;
			}
			if (filter.length > 0)
				filter += " AND ";
			filter += fragment;
		});
		//filter = "id in (1,2)";
		return filter;
	};

	$scope.gridDeleteAction = function gridDeleteAction() {
		var scope = angular.element('.selected .searchGridActionButton').scope();
		if (angular.isDefined(scope)) {
			$scope.actClicked(scope.$parent.row);
		}
	};

	/////////////////////////////////////////////////////////////////////////////////
	// Add a new row to the grid
	$scope.gridInsertRow = function() {
		var newRow = {};
		_.each(espresso.list.currentTableDetails.columns, function(col) {
			newRow[col.name] = ''; //catch all, set accordingly below:
			if (col.generic_type === 'number' || col.nullable || col.isFk || col.generic_type === 'binary' || col.generic_type === 'boolean') {
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
			if (currentTableSettings.columnFormats[col.name]['default']) {
				newRow[col.name] = currentTableSettings.columnFormats[col.name]['default'];
			}
		});
		newRow["@metadata"] = {action: "INSERT", entity: $scope.searchTable, links: []};

		// If a row is currently selected, we insert before it, otherwise, we insert
		// as the first row.
		if ($scope.selectedRows.length == 0) {
			$scope.gridData.splice(0, 0, newRow);
		}
		else {
			var idx = 0;
			for (var i = 0; i < $scope.gridData.length; i++) {
				if ($scope.gridData[i] == $scope.selectedRows[0]) {
					idx = i;
					break;
				}
			}
			$scope.gridData.splice(idx, 0, newRow);
		}
		$scope.$evalAsync(function () {
			$scope.selectedRows[0] = newRow;
		});
	};

	/////////////////////////////////////////////////////////////////////////////////
	// Called when the user selects a parent row from the search dialog
	// clickedRow is not always the active selected
	$scope.parentSelected = function(parentRow, roleName, clickedRow) {
		if (angular.isUndefined($scope.selectedRows[0])) {
			//this must be an insert with no elements or values defined yet
				//the first thing a user did with this row was a parent lookup
			$scope.selectedRows[0] = angular.element('#eslo-details-title').scope().scalarRow;
		}
		var modifiedRow = $scope.selectedRows[0]; //ACTUALLY, this row is ABOUT to be modified here
		
		angular.forEach($scope.gridData, function (e, i) {
			if (angular.equals(clickedRow, e)) {
				modifiedRow = e;
			}
		});

		var parentRole = espresso.list.currentTableDetails.parentsByName[roleName];
		for (var i = 0; i < parentRole.parent_columns.length; i++) {
			var parentColName = parentRole.parent_columns[i];
			var childColName = parentRole.child_columns[i];
			modifiedRow[childColName] = parentRow[parentColName];
		}
		if (angular.isUndefined(modifiedRow.__internal)) {
			modifiedRow.__internal = {};
		}
		if (angular.isUndefined(modifiedRow.__internal.parentRows)) {
			modifiedRow.__internal.parentRows = {};
		}
		if (angular.isUndefined(modifiedRow['@metadata'])) {
			modifiedRow['@metadata'] = {};
		}
		if (angular.isUndefined(modifiedRow['@metadata'].action) || modifiedRow['@metadata'].action === 'INSERT') {
			modifiedRow['@metadata'].action = 'INSERT';
		}
		else {
			modifiedRow['@metadata'].action = 'UPDATE';
		}
		modifiedRow.__internal.parentRows[roleName] = parentRow;
		Events.broadcast('RefreshMainGrid');
	};

	/////////////////////////////////////////////////////////////////////////////////
	// Called when user wants to edit a parent column
	$scope.selectParent = function(col, row, event) {
		//console.log('Select parent:' + col);
		if (event) {
			event.stopPropagation();
			event.stopImmediatePropagation();
			event.preventDefault();
		}
		else {
			$scope.selectedRows[0] = row.entity;
		}
		if ( ! $scope.root.editMode) {
			Notifications.error( 'You cannot edit this unless you are in Edit mode' );
			return;
		}
		$scope.$evalAsync(function () {
			var colSettings = $scope.getColumnSettingsForField(col.colDef.field);
			//var roleName = col.colDef.columnSettings.parentRole;
			var roleName = colSettings.parentRole;
			if ( ! roleName)
				throw "No role for parent column " + colSettings.name;
			var instance = $modal.open({
				backdrop	: true,
				keyboard	: true,
				templateUrl	: 'templates/modals/parentSelect.html',
				controller	: 'espresso.ParentSelectCtrl',
				resolve		: {
					childTableInfo: function(){ return currentTableDetails; },
					childRow: function(){ return row; },
					roleNames: function(){ return [roleName]; },
					callback : function(){ return $scope.parentSelected; }
				}
			});
		});
	};

	/////////////////////////////////////////////////////////////////////////////////
	// Called when a user wants to edit a FK column
	$scope.selectFK = function(col, row, event) {
		if (event) {
			//called by UI event, probably a click
				//this lookup DOES NOT change the selected row
			event.stopPropagation();
			event.stopImmediatePropagation();
			event.preventDefault();
		}
		else {
			//called programatically
				//this lookup DOES change the selected row
			$scope.selectedRows[0] = row.entity;
		}
		if ( ! $scope.root.editMode) {
			Notifications.error( 'You cannot edit this unless you are in Edit mode' );
			return;
		}
		var colSettings = $scope.getColumnSettingsForField(col.colDef.field);
		if (colSettings.parentRole)
			throw "Column should not have a parent role: " + colSettings.name;
		var possibleRoles = [];
		_.each(currentTableDetails.parents, function(parent) {
			var col = _.find(parent.child_columns, function(c) {
				return c === colSettings.dataSource;
			});
			if (col) {
				possibleRoles.push(parent.name);
			}
		});
		if (possibleRoles.length == 0)
			throw "Role not found for FK column " + colSettings.name;
		$modal.open({
			backdrop	: true,
			keyboard	: true,
			templateUrl	: 'templates/modals/parentSelect.html',
			controller	: 'espresso.ParentSelectCtrl',
			resolve		: {
				childTableInfo: function(){ return currentTableDetails; },
				childRow: function(){ return row; },
//				parentTableInfos: function(){ return [parentTableInfo]; },
				roleNames: function(){ return possibleRoles; },
				callback : function(){ return $scope.parentSelected; }
			}
		});
	};

	//////////////////////////////////////////////////////////////////////////
	// Respond to change in which columns should be shown
	$rootScope.$on('columnSelectionUpdated', function(evt, desc) {
		Device.resetColumnWidths('main', currentTableSettings);
		console.log('Column selection updated: ' + desc.tableName + " - " + desc.area);
		if ('grid' != desc.area)
			return;
		$scope.setupGrid();
	});

	
	//////////////////////////////////////////////////////////////////////////
	// When the options for a column have been changed, we may need to refresh
	$rootScope.$on('tableDisplayUpdated', function(evt, tblName, broadcaster) {
		if (tblName == currentTableDetails.name) {
			if (broadcaster != 'ColumnCtrl') {
				$scope.setupGrid();
			}
		}

		attachColumnResizeHandlers();
	});

	$rootScope.getMainSaveData = function getMainSaveData() {
		var dataToSave = [];

		for (var i = 0; i < $scope.gridData.length; i++) {
			var obj = $scope.gridData[i];
			if ( ! obj["@metadata"].action)
				continue;
			dataToSave.push(obj);
		}

		return dataToSave;
	};
	
	//////////////////////////////////////////////////////////////////////////
	// Time to save all modified rows
	$rootScope.$on('saveAll', function() {
		var dataToSave = $scope.getMainSaveData();

		$rootScope.addRowsToSave('grid', dataToSave);

		$scope.setupGrid();
	});
	
	//////////////////////////////////////////////////////////////////////////
	// When rows have been saved, we get notified with the tx summary
	// We pick the ones that are relevantr to us and refresh them
	$rootScope.$on('updatedRows', function(evt, rows) {
		var $DetailsCtrlScope = angular.element('#eslo-details-title').scope();
		var oldScalarRow = $DetailsCtrlScope.scalarRow;
		var oldScalarTableInfo = Tables.getDetails(Tables.formTable);
		var oldScalarSettings = Tables.getSettings(Tables.formTable);
		// Remove inserted rows from the grid -- they will be added back from the transaction summary
		for (var j = 0; j < $scope.gridData.length; j++) {
			if ($scope.gridData[j]["@metadata"].action == "INSERT") {
				$scope.gridData.splice(j, 1);
				j--;
			}
		}

		LoopOverTxSummary:
		for (var i = 0; i < rows.length; i++) {
			var newObj = rows[i];
			if (newObj["@metadata"].resource != $scope.searchTable)
				continue;
			var foundIdx = -1;
			for (var j = 0; j < $scope.gridData.length; j++) {
				if ($scope.gridData[j]["@metadata"].href == newObj["@metadata"].href ||
						$scope.gridData[j]["@metadata"].href == newObj["@metadata"].previous_href) {
					foundIdx = j;
					if (newObj["@metadata"].verb == "DELETE") {
						console.log('Removing deleted object from grid');
						$scope.gridData.splice(j, 1);
						if (j > 0)
							$scope.selectedRows[0] = $scope.gridData[j - 1];
						else
							$scope.selectedRows[0] = $scope.gridData[0];
						// Should we do j -= 1 here?
						continue LoopOverTxSummary;
					}
					espresso.util.setInRootScopeFun(function() {
						console.log('Replacing saved object in grid');
						if ($scope.selectedRows[0] == $scope.gridData[j]) {
							$scope.selectedRows[0] = newObj;
						}
						$scope.gridData[j] = newObj;
					});
					break;
				}
			}
			if (foundIdx == -1) { // Not found -- it's a new row
				espresso.util.setInRootScopeFun(function() {
					$scope.gridData.push(newObj);
				});
			}
		}

		// GAAAAH!!! This caused me HOURS of agony over why stupid ng-grid
		// was not refreshing properly. Turns out, it doesn't watch the data,
		// just the *length* of the data. So we have to artificially affect
		// the length to get the grid to react properly. Oy.
		if ($scope.gridData.length > 0) {
			// Duplicate first row and remove it immediately
			$scope.gridData.push($scope.gridData[0]);
			var oldLength = $scope.gridData.length;
			$timeout(function() {
				//console.log('timeout');
				if ($DetailsCtrlScope.scalarRow['@metadata'].href != oldScalarRow['@metadata'].href) {
					//console.log('href equals');
					if (angular.isDefined(oldScalarRow['@metadata']) && angular.isDefined(oldScalarRow['@metadata'].href)) {
						//console.log('defined meta href');
						EspressoData.query(oldScalarRow['@metadata'].href, oldScalarTableInfo.name, null, function (data) {
							if (data.length === 0) {
								//we must have deleted the old scalar row, do nothing
								return;
							}
							
							//make sure the scalar row is up to date
							var refreshedRow = {
								row : data[0],
								details : oldScalarTableInfo,
								settings : oldScalarSettings
							};
							Events.broadcast('WatchMainRow', refreshedRow);
							return;
						});
					}
					else {
						angular.forEach(rows, function (e, i) {
							if ($scope.gridData.indexOf(e)) {
								//make sure the scalar row is up to date
								var refreshedRow = {
										row : e,
										details : oldScalarTableInfo,
										settings : oldScalarSettings
								};
								Events.broadcast('WatchMainRow', refreshedRow);
							}
						});
					}
				}
				else {
					//console.log('undefined meta href');
					
				}
				$scope.gridData.pop();
				angular.element('#leftGridContainer').resize();
			});
		}
	});

	$scope.isUnsavedSuspended = false;
	$scope.suspendUnsaved = function suspendUnsaved(ms) {
		$scope.isUnsavedSuspended = true;
		$timeout(function () {
			$scope.isUnsavedSuspended = false;
		}, ms);
	};
	$rootScope.$on('undoAll', function(evt) {
		$scope.$evalAsync(function() {
			$scope.suspendUnsaved(500);
			for (var i = $scope.gridData.length - 1; i >= 0; i--) {
				var row = $scope.gridData[i];
				if (angular.equals(row, $scope.selectedRows[0])) {
					//they equaled
				}
				if (row['@metadata'].action == 'INSERT') {
					$scope.gridData.splice(i, 1);
					var scope = angular.element('#leftGridContainer .ngGrid').scope();
					Events.broadcast('UnsavedInsertDeleting', row);
					//$scope.grid.gridOptions.selectItem(0);
				}
				else if (row['@metadata'].action == 'DELETE') {
					row['@metadata'].action = null;
				}
				else if (row['@metadata'].action == 'UPDATE') {
					espresso.util.restoreRow(row);
					row['@metadata'].action = null;
				}
				
				if (row['__internal']) {
					(function (i, row) {
						$scope.$evalAsync(function () {
							row['__internal'] = angular.copy(row['__original']['__internal']);
						});
					})(i, row);
				}
			}
			Events.broadcast('ResetMainGrid');
		});
	});

	$scope.alertIfUneditable = function (table, col) {
		if (angular.isUndefined(col)) {return;}
		if (!$rootScope.root.editMode) {
			Notifications.error( 'You cannot edit this unless you are in Edit mode' );
			return;
		}
		if(table == null) {
			table = currentTableDetails.name;
		}
		if (!Tables.isEditable(table, col)) {
			Notifications.error( 'Unable to edit a computed field.' );
		}
	};
	///////////////////////////////////////////////////////////////////////////////
	$scope.isEditable = function (table, col) {
		if (table == null) {
			table = currentTableDetails.name;
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
	///////////////////////////////////////////////////////////////////////////////////
	$scope.$location = $location;
	$rootScope.$on('DirectLinkUpdate', function (event, params) {
		if (angular.isDefined(params.table)) {
			$scope.$evalAsync(function () {
				Tables.getAllTables().then(function () {
					currentTableDetails = $rootScope.allTables[ params.table ];
					$scope.searchTable = params.table;
	
					$scope.newTableSelected();
				});
			});
		}
	});
}]);

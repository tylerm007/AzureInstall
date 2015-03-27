espresso.app.controller(
	'espresso.DetailsCtrl',
	[ '$rootScope' , '$scope' , '$http' , '$resource' , '$routeParams' , '$location' , '$modal' , '$sce' , '$compile' ,
	  'EspressoData' , 'EspressoUtil' , 'Tables' , 'DirectLink', 'Notifications', 'Events', '$timeout', 'FormWindowHelper',
	function($rootScope, $scope, $http, $resource, $routeParams, $location, $modal, $sce, $compile, 
			EspressoData, EspressoUtil,Tables,DirectLink, Notifications, Events, $timeout, FormWindowHelper) {
	
	$scope.toggleExpressions = function toggleExpressions() {
		Events.broadcast('ToggleFormExpressions');
	};
		
	
	//Helper/Broadcaster - DOM & Controller
	$scope.createRow = function() {
		var newRow = {};
		_.each(scalarTableInfo.columns, function(col) {
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
			
			if (zoomData) {
				var role = zoomData.parentTable.childrenByName[zoomData.relationship];
				if (role.child_table == Tables.formTable) {
					angular.forEach(role.child_columns, function (column, index) {
						newRow[column] = zoomData.parentRow[role.parent_columns[index]];
					});
				}
			}
		});
		
		newRow["@metadata"] = {action: "INSERT", entity: scalarTableInfo.name, links: []};
		var data = {
			row : newRow,
			details : scalarTableInfo,
			settings : Tables.getSettings(scalarTableInfo.name)
		};
		Events.broadcast('WatchMainRow', data);
		return data;
	};
	
	var zoomData = null;
	Events.on('ChildZoom', function (event, data) {
		zoomData = data;
	});
	
	$scope.hasMoreHistory = false;
	$scope.formWindowBack = function () {
		var data = FormWindowHelper.getLastRow(true);
		
		//we just saved this row if it was a new selection, so we might have to go further back in our history
		while (FormWindowHelper.history().length > 1 && angular.equals(data.row, $scope.scalarRow)) {
			$scope.hasMoreHistory = true;
			data = FormWindowHelper.getLastRow(true);
		}
		//if this is the last row in the history, we don't want to delete it, but we do want to be sure there is nothing further back
		if (angular.equals(data.row, $scope.scalarRow)) {
			$scope.hasMoreHistory = false;
			data = FormWindowHelper.getLastRow();
		}
		
		if (data) {
			Events.broadcast('WatchMainRow', data);
		}
	};
	
	$scope.checkFormHistory = function checkFormHistory() {
		var previousRow = FormWindowHelper.getLastRow(false);
		if (angular.isDefined(previousRow) && previousRow.row) {
			$scope.hasMoreHistory = true;
		}
	};
	
	Events.on('RefreshMainGrid', function () {
		$timeout(function () {
			$scope.previousExists = !angular.element('#leftTableDiv .selected').prev().length;
			$scope.nextExists = !angular.element('#leftTableDiv .selected').next().length;
		});
	});
	
	//App Listener
	$scope.initializeFormWindowParameters = function (event, data) {
		if (angular.isUndefined(data.row)) {
			return;
		}
		if (data.mainRefresh) {
			if (data.details.name != Tables.formTable) {
				return;
			}
		}
		if (!FormWindowHelper.isPreviousRow(data)) {
			FormWindowHelper.addToPreviousRows(data);
			if (FormWindowHelper.history().length > 1) {
				$scope.hasMoreHistory = true;
			}
		}
		if (!data.settings) {
			//when inserting into an empty table, the table settings in the form view have not yet been set
				//root cause is WatchMainRow event requires settings set in another WatchFormRow or WatchFormTable event?
			setTimeout(function () { 
				angular.element('.grid-insert').click();
			});
			return;
		}

		Events.broadcast('WatchFormRow', data);
		
		$scope.scalarRow = data.row;
		$scope.formTableName = data.settings.name;
		$scope.formColumns = data.settings.scalarColumns;
		
		$scope.$evalAsync(function () {
			$scope.previousExists = !angular.element('#leftTableDiv .selected').prev().length;
			$scope.nextExists = !angular.element('#leftTableDiv .selected').next().length;
		});
		$scope.updateScalarRowPK();
		return data;
	};
	Events.on('WatchMainRow', $scope.initializeFormWindowParameters);
	
	var scalarTableInfo = {};
	$scope.childrenTables = {};

	//App Listener
	$scope.initializeFormRowParameters = function initializeFormRowParameters (event, data) {
		if (!data.details) {
			//attempt to set it
			data.details = scalarTableInfo;
		}
		if (!data.settings) {
			//attempt to set it
			data.settings = Tables.getSettings(data.details.name);
		}
		
		if (!data.details || !data.settings) { return; }
		
		$scope.attribSearchString = '';
		scalarTableInfo = data.details;
		Tables.formTable = data.details.name;

		$scope.updateScalarRowPK();
		Events.broadcast('WatchFormTable', data);
		return scalarTableInfo;
	};
	Events.on('WatchFormRow', $scope.initializeFormRowParameters);
	Events.broadcast('ForceFormRow', function (event, data) {
		$scope.scalarRow = data;
		$scope.updateScalarRowPK();
	});

	//App Listener
	//used by the FormInputGroup directive
	Events.on('WatchFormTable', function updateFormGroupings(event, data) {
		if (data.settings.expressedTitle) {
			try {
				//these are user expressions, sometimes they will fail, catching it is good sense
				$scope.expressedTitle = eval(
					'var table = data.details;' + 
					'var row = angular.copy(data.row);' + 
					'delete row["@metadata"];' +
					'delete row["__internal"];' +
					'delete row["__original"];' +
					data.settings.expressedTitle
				);
			} catch (e) {
				console.log(e);
			}
		}
		else {
			$scope.expressedTitle = null;
		}
		$scope.groups = data.settings.groups;
		$scope.labelPlacement = data.settings.labelPlacement;
	});
	Events.on('OptionsSettingUpdate', function updateFormGroupings(event, data) {
		Notifications.suspend('promptUnsaved');
		if (data.area == 'scalar') {
			$scope.groups = data.settings.groups;
			$scope.labelPlacement = data.settings.labelPlacement;
		}
	});
	
	
	//User Interface
	$scope.clickGridInsert = function clickGridInsert() {
		if (Tables.mainTable === Tables.formTable) {
			setTimeout(function () {$('#leftGridFooter .grid-insert').click();},0);
		}
		else {
			$scope.createRow();
		}
	};
	
	//User Interface - judged not worth testing
	$scope.clickGridPrevious = function clickGridPrevious() {
		setTimeout(function (){angular.element('#leftTableDiv .selected').prev().trigger('click');},0);
	};
	
	//User Interface - judged not worth testing
	$scope.clickGridNext = function clickGridNext() {
		setTimeout(function (){
			angular.element('#leftTableDiv .selected').next().trigger('click');
		},0);
	};

	//Helper - DOM & Controller
	$scope.updateScalarRowPK = function updateScalarRowPK() {
		//testing no-resize
		//angular.element('body').resize();
		if ( !scalarTableInfo || !scalarTableInfo.primaryKeyColumns ||
				! scalarTableInfo.primaryKeyColumns.length) {
			$scope.scalarRowPk = "?";
			return;
		}
		if (!$scope.scalarRow)
			return;

		var pk = "";
		for (var i = 0; i < scalarTableInfo.primaryKeyColumns.length; i++) {
			var pkName = scalarTableInfo.primaryKeyColumns[i];
			var value = $scope.scalarRow[pkName];
			if (angular.isUndefined(value)) { return; }
			if (pk.length > 0)
				pk += ",";
			pk += value;
		}
		
		angular.forEach(scalarTableInfo.columns, function (c, i) {
			if (c.name.match(/name/ig)) {
				pk = $scope.scalarRow[c.name];
			}
		});
		$scope.scalarRowPk = pk;

	};

	/////////////////////////////////////////////////////////////////////////
	// Filter the attributes based on the search box
	$scope.attribFilter = function(actual) {
		if ( ! $scope.attribSearchString)
			return true;
		return actual.alias.toUpperCase().indexOf($scope.attribSearchString.toUpperCase()) >= 0;
	};

	//Helper - DOM & Controller
	/////////////////////////////////////////////////////////////////////////
	$scope.getDetailInputStyle = function(attName) {
		switch (scalarTableInfo.columns[attName].type) {
			case 'BIGINT':
			case 'DECIMAL':
			case 'INTEGER':
				return 'width: 12em; text-align: right;';
		}
		return "";
	};

	//Helper - DOM & Controller
	/////////////////////////////////////////////////////////////////////////
	$scope.getDetailInputType = function(attName) {
		var colInfo = scalarTableInfo.columns[attName];
		switch (colInfo.generic_type) {
		case 'boolean':
			return 'checkbox';
		case 'number':
			return 'number';
		case 'date':
			switch (colInfo.type) {
			case 'DATE':
				return 'date';
			case 'TIME':
				return 'time';
			case 'DATETIME':
			case 'TIMESTAMP':
			default:
				return 'datetime';
			}
		case 'binary':
			return '';
		default:
			return "text";
		}
	};

	$scope.refreshUpdatedStatus = function () {
		$scope.isUpdated = $scope.rowIsUpdated();
	};
	
	//App Listener - checks Helper $scope func
	$scope.$watch('scalarRow', $scope.refreshUpdatedStatus);

	//App Listeners - checks Helper $scope func
	//broadcast from DetailInput when a form row changes
	Events.on('UpdateFormInput', $scope.refreshUpdatedStatus);
	Events.on('EditToMainGrid', $scope.refreshUpdatedStatus);
	Events.on('AlertUnsavedClosed', $scope.refreshUpdatedStatus);

	Events.on('RefreshRowIsUpdated', function () {
		//timeout justification: this is an event, it already happens asynchronously
		$timeout(function () {
			$scope.rowIsUpdated();
			$scope.refreshUpdatedStatus();
		}, 0);
	});

	//Helper - DOM & Controller
	/////////////////////////////////////////////////////////////////////////
	$scope.rowIsUpdated = function() {
		if (!$scope.scalarRow) {
			return false;
		}

		if (!$scope.scalarRow.__original) {
			//check that the scalar has @metadata
			//finally: check that the metadata.entity is defined
			if (
				angular.isDefined($scope.scalarRow['@metadata']) && 
				Tables.mainTable != $scope.scalarRow['@metadata'].entity
				) {
				//this is an insert from the details controller
				return true;
			}
			else {
				return false;
			}
		}
		//if the only updated columns are a binary type, we should return false, it saved immediately
		var rowsAreEqual = espresso.util.rowsAreEqual($scope.scalarRow, $scope.scalarRow.__original);
		if (rowsAreEqual && $scope.scalarRow['@metadata'].action != 'DELETE'){
			$scope.scalarRow['@metadata'].action = null;
		}
		else {
			if ($scope.scalarRow['@metadata'].action != 'DELETE') {
				$scope.scalarRow['@metadata'].action = 'UPDATE';
			}
		}
		return !rowsAreEqual;
	};
	
	$rootScope.rowIsUpdated = $scope.rowIsUpdated;

	$scope.reformatColumnName = EspressoUtil.reformatColumnName;

	//Broadcaster - calls $rootScope.root/outside $scope function
	///////////////////////////////////////////////////////////////////////////
	// When a user clicks on a column's settings button
	$scope.editColumnHeader = function(colSettings) {
		var colInfo = null;
		if (colSettings.parentRole) {
			var parentName = scalarTableInfo.parentsByName[colSettings.parentRole].parent_table;
			colInfo = $rootScope.allTables[parentName].columnsByName[colSettings.name];
		}
		else
			colInfo = scalarTableInfo.columnsByName[colSettings.name];
		$scope.root.editColumn(scalarTableInfo.name, colInfo, colSettings, undefined, 'DetailsCtrl');
	};

	//Broadcaster - triggers modal
	/////////////////////////////////////////////////////////////////////////
	// Called when user wants to edit a parent column
	$scope.scalarSelectParent = function(col) {
		if ( ! $rootScope.root.editMode)
			return;
		var roleName = col.parentRole;

		if ( ! roleName) { // This is a foreign key, not a parent attribute
			parentLoop:
			for (var i = 0; i < scalarTableInfo.parents.length; i++) {
				var parent = scalarTableInfo.parents[i];
				for (var j = 0; j < parent.child_columns.length; j++) {
					if (parent.child_columns[j] == col.name) {
						roleName = parent.name;
						break parentLoop;
					}
				}
			}
			if ( ! roleName)
				throw "Unable to select parent: this is not a parent column or a FK";
		}

		var parentRole = _.find(scalarTableInfo.parents, function(role) { return role.name == roleName; });
		var parentTableName = parentRole.parent_table;
		var parentTableInfo = $rootScope.allTables[parentTableName];
		$modal.open({
			backdrop	: true,
			keyboard	: true,
			templateUrl	: 'templates/modals/parentSelect.html',
			controller	: 'espresso.ParentSelectCtrl',
			resolve		: {
				childTableInfo: function(){ return scalarTableInfo; },
				childRow: function(){ return $scope.scalarRow; },
				parentTableInfos: function(){ return [parentTableInfo]; },
				roleNames: function(){ return [roleName]; },
				callback : function(){ return $scope.scalarParentSelected; }
			}
		});
	};

	//User Interface
	/////////////////////////////////////////////////////////////////////////
	// Called when the user selects a parent row from the search dialog
	$scope.scalarParentSelected = function(parentRow, roleName) {
		//if (parentRow)
		//	console.log("Selected parent row was: " + JSON.stringify(parentRow));

		var parentRole = _.find(scalarTableInfo.parents, function(role) { return role.name == roleName; });
		for (var i = 0; i < parentRole.parent_columns.length; i++) {
			var parentColName = parentRole.parent_columns[i];
			var childColName = parentRole.child_columns[i];
			$scope.scalarRow[childColName] = parentRow[parentColName];
		}
		$timeout(function() {
			//console.log(parentRow, roleName);
			if ( ! $scope.scalarRow.__internal) {
				$scope.scalarRow.__internal = {parentRows: {}};
			}
			$scope.scalarRow.__internal.parentRows[roleName] = parentRow;
			$scope.scalarRow['@metadata'].action = 'UPDATE';
			var tableInfo = Tables.getDetails(parentRole);
			angular.forEach(scalarTableInfo.columnsByName, function (columnInfo, name) {
				if (columnInfo.generic_type == 'number' && columnInfo.isFk) {
					$scope.scalarRow[name] = parseInt($scope.scalarRow[name]);
				}
			});
			return;
			//populate scalarRow expected attributes
			if (angular.isUndefined($scope.scalarRow.__internal)) {
				$scope.scalarRow.__internal = {
						parentRows : {}
				};
			}
			$scope.scalarRow.__internal.parentRows[roleName] = parentRow;
			//if this is an insert, no action update required
			if ($scope.scalarRow['@metadata'].action == 'INSERT') { return; }
			$scope.scalarRow['@metadata'].action = 'UPDATE';
		});
	};
	
	$scope.$watch('attribSearchString', function (current) {
		Events.broadcast('FormColumnFilterChange', current);
	});

	Events.on('ColumnSettingsUpdate', function () {
		//this forces DetailInput to rebuild the columns
		$scope.attribSearchString = '[_]'; //any string filtering ALL columns will do
		$timeout(function () {
			$scope.attribSearchString = ''; //reset the filter to ''
		}, 50);
	});
	
	$rootScope.$on('updatedRows', function (event, data) {
		if (Tables.formTable != Tables.mainTable) {
			angular.forEach(data, function (record, index) {
				if (record['@metadata'] && record['@metadata'].verb === 'INSERT') {
					if (record['@metadata'].resource == $scope.scalarRow['@metadata'].entity) {
						var data = {
							row : record,
							details : scalarTableInfo,
							settings : Tables.getSettings(scalarTableInfo.name)
						};
						Events.broadcast('WatchMainRow', data);
					}
				}
			});
		}
	});
	
	//App Listener - triggered by grid options update
	/////////////////////////////////////////////////////////////////////////
	$rootScope.$on('columnSelectionUpdated', function(evt, details) {
		$scope.attribSearchString = '[_]';
		$timeout(function () {
			$scope.attribSearchString = '';
		}, 50);
		if (details.area != 'scalar') {
			return;
		}
		if (details.tableName != scalarTableInfo.name) {
			return;
		}
		$scope.formColumns = Tables.getSettings(details.tableName).scalarColumns;
	});

	//App Listener - triggered after save all, but via a broadcast
	/////////////////////////////////////////////////////////////////////////
	$rootScope.$on('saveAll', function() {
		if ($scope.rowIsUpdated()) {
			$rootScope.addRowsToSave('scalar', [$scope.scalarRow]);
		}
		else {
			$rootScope.addRowsToSave('scalar', []); // Even if nothing to save, we must still report in.
		}
		return;
	});

	//App Listener - triggered after undo, but via a broadcast
	$rootScope.$on('undoAll', function(evt) {
		if ($scope.scalarRow['@metadata'].action == 'INSERT') {
			$scope.scalarRow = null;
		}
		else if ($scope.scalarRow['@metadata'].action == 'DELETE') {
			delete $scope.scalarRow['@metadata'].verb;
		}
		else if ($scope.scalarRow['@metadata'].action == 'UPDATE') {
			espresso.util.restoreRow($scope.scalarRow);
		}
		Events.broadcast('RefreshRowIsUpdated');
	});

	//App Listener - triggered after update, but via a broadcast
	//////////////////////////////////////////////////////////////////////////////////
	$rootScope.$on('updatedRows', function(evt, rows) {
		//$scope.detailsForm.$setPristine();
		for (var i = 0; i < rows.length; i++) {
			var obj = rows[i];
			if (obj['@metadata'].resource == scalarTableInfo.name) {
				$scope.replaceSavedObject(obj);
				break;
			}
		}
	});

	Events.on('UnsavedInsertDeleting', function (event, row) {
		if (angular.equals(row, $scope.scalarRow)) {
			var data = {
				row : null,
				details : scalarTableInfo,
				settings : Tables.getSettings(scalarTableInfo.name)
			};
			Events.broadcast('WatchMainRow', data);
		}
	});
	
	//App Listener - triggered after save all, but via a broadcast
	/////////////////////////////////////////////////////////////////////////
	// When an object has been saved, replace it
	$scope.replaceSavedObject = function(obj) {

		// Compare PK to see if this is in fact the object currently displayed
		for (var i = 0; i < scalarTableInfo.primaryKeyColumns.length; i++) {
			var pkName = scalarTableInfo.primaryKeyColumns[i];
			var oldValue = $scope.scalarRow[pkName];
			var newValue = obj[pkName];
			if (oldValue != newValue)
				return;
		}

		// We now know this is in fact the current scalar row -- replace it
		if (angular.isUndefined(obj) || angular.isUndefined(obj['@metadata']) || obj['@metadata'].verb == 'DELETE') {
			obj = null;
		}

		console.log('Replacing saved object in scalar', obj);

		$scope.$evalAsync(function() {
			$scope.scalarRow = obj;
		});
	};

	//App Listener
	//////////////////////////////////////////////////////////////////////////////////
	$rootScope.$on( 'DirectLinkUpdate' , function( event , params ){
		if( !angular.equals( params.table , null ) && !angular.equals( params.pk , null ) ){
			Tables.getAllTables().success(function(){
				$timeout(function () {
					var table = params.table;
					var column = Tables.getPrimaryKey( table ).columns;
					var value = params.pk;
	
					var query = column + ' LIKE "%' + value + '%"';
					var url = table;
					EspressoData.query(url, null , query , function(data){
						if( data.length > 0 ){
							scalarTableInfo = $rootScope.allTables[ table ];
							$scope.scalarRow = data[0];
							$scope.updateScalarRowPK();
						}
					});
				});
			});
		}
	});
}]);

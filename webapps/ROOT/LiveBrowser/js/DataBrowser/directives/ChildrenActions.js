//////////////////////////////////////////////////////////////////////////////////////
// Control buttons for child rows
espresso.app.directive("childActions", ["$rootScope", "Notifications", 'Tables', function($rootScope, Notifications, Tables) {
	  return {
	    restrict: "E",        // directive is an Element (not Attribute)
	    scope: {              // set up directive's isolated scope
	      roleName: "@",
	      row: "=",          // row passed by reference
	      childZoom: "&",
	      childGridData: "=" // We need the array of data to remove the row if it's deleted
	    },
	    template:             // replacement HTML (can use our scope vars here)
	      "<div>" + 
	      	"<button class='btn btn-sm fa {{getActionButtonClass()}} gridActionButton childActionButton' " + 
	      		"style=\"font-size: 10pt; font-family: FontAwesome;\" " +
	      		"ng-click='actionClick()' title='Delete this row'></button> " +
	      	"<button class='btn btn-sm glyphicon glyphicon-zoom-in gridActionButton childZoomButton' " +
	      		"style=\"font-family: 'Glyphicons Halflings'; font-size: 10pt;\" " +
	      		"ng-click='zoom()' title='Zoom in on this row'></button>" + 
	      "</div>",
	    replace: true,        // replace original markup with template
	    transclude: false,    // do not copy original HTML content
	    link: function (scope, element, attrs, controller) {
    		var zoomButton = element.find('.childZoomButton');
    		if (scope.row.entity["@metadata"] && scope.row.entity["@metadata"].action == 'INSERT')
    			zoomButton.hide();
//	    	scope.$watch("row", function(newVal, oldVal) {
//	    		var action = newVal.entity["@metadata"].action;
//	    		if (!action) actionButton.addClass("fa-times");
//	    		if (action == 'DELETE') actionButton.addClass("fa-undo");
//	    		if (action == 'INSERT') zoomButton.hide();
//	    		if (action == 'UPDATE') actionButton.addClass("fa fa-undo");
//	    	});
	    	scope.getActionButtonClass = function() {
	    		if ( ! scope.row.entity["@metadata"]) { // Not sure why that happens, but it does.
	    			return "";
	    		}
	    		var action = scope.row.entity["@metadata"].action;
	    		if (!action) return "fa-times";
	    		if (action == 'DELETE') return "fa-undo";
	    		if (action == 'INSERT') return "fa-times";
	    		if (action == 'UPDATE') return "fa-undo";
	    		return "";
	    	};
	    },
	    controller: ["$scope", 'Tables', 'Events', function ($scope, Tables, Events) {
	    	$scope.zoom = function() {
	    		Events.broadcast('ChildZoom', {
	    			parentTable: Tables.getDetails(Tables.formTable),
	    			parentRow: angular.element('.details-pane').scope().scalarRow,
	    			relationship: $scope.roleName
	    		});
    			$scope.childZoom($scope.row, $scope.roleName);
	    	};
	    	
	    	$scope.actionClick = function() {
	    		if ( ! $rootScope.root.editMode) {
	    			Notifications.error( 'This can only be done in edit mode.');
	    			return;
	    		}
	    		console.log('Action clicked for child row');

	    		var action = $scope.row.entity["@metadata"].action;
	    		
	    		if ($scope.row.entity["@metadata"].next_batch)
	    			return;
	    		
	        	var tableName = Tables.getDetails(Tables.formTable).childrenByName[$scope.roleName].child_table;
	        	var tableInfo = $rootScope.allTables[tableName];
	    		
	    		if ( ! action) {
	    			$scope.row.entity["@metadata"].action = 'DELETE';
	    		}
	    		else if (action == 'UPDATE') { // Rollback
	    			_.each(tableInfo.columns, function(col) {
	    				$scope.row.entity[col.name] = $scope.row.entity["__original"][col.name];
	    			});
	    			_.each(tableInfo.parents, function(parent) {
	    				$scope.row.entity["__internal"].parentRows[parent.name] = 
	    					$scope.row.entity.__original.__internal.parentRows[parent.name];
	    			});
	    			$scope.row.entity["@metadata"].action = null;
	    		}
	    		else if (action == 'DELETE') { // Undelete
	    			$scope.row.entity["@metadata"].action = null;
	    		}
	    		else if (action == 'INSERT') { // De-insert, aka delete
	    			var $childrenControllerScope = angular.element('#childCollections').scope();
	    			var gridData = $childrenControllerScope.childrenArea.gridData[$childrenControllerScope.getCurrentTab()];
	    			gridData.splice($scope.row.rowIndex, 1);
	    		}
	    	};
	    }]
	  };
}]);

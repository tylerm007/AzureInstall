// INCOMPLETE AND NOT IN USE

espresso.app.directive("espressoTable", function() {
	return {
		restrict: "E",        // directive is an Element (not Attribute)
		scope: {              // set up directive's isolated scope
			row: "=",         // row passed by reference
			actionClicked: "&"
		},
		template:             // replacement HTML (can use our scope vars here)
			"<div>" +
			"<button class='btn btn-sm glyphicon {{icon}} gridActionButton searchGridActionButton' " +
			"ng-click='actClicked()' title='{{rowTitle}}'></button> " +
			"<button class='btn btn-sm glyphicon glyphicon-repeat gridActionButton ng-click='secondActClicked()'></button>" +
			"</div>",
		replace: true,        // replace original markup with template
		transclude: false,    // do not copy original HTML content
		link: function (scope, element, attrs, controller) {
			console.log('In searchGridActions link');
			scope.$watch("row", function(newVal, oldVal) {
				console.log(new Date());
				return;
				if ( ! newVal)
					return;
				console.log('searchGridActions: row has changed');
				var action = newVal.entity["@metadata"].action;
				if (newVal.entity["@metadata"].next_batch) {
					// Nothing
				}
				else if (!action) {
					scope.icon = "glyphicon-trash";
					scope.rowTitle = "Delete this row";
				}
				else if (action == 'DELETE') {
					scope.icon = "glyphicon-repeat";
					scope.rowTitle = "Undelete this row";
				}
				else if (action == 'INSERT') {
					scope.icon = "glyphicon-trash";
					scope.rowTitle = "Unedit this row";
				}
				else if (action == 'UPDATE') {
					scope.icon = "glyphicon-repeat";
					scope.rowTitle = "Unedit this row";
				}
			});
		},
		controller: ["$scope", function ($scope) {
			$scope.actClicked = function() {
				console.log('searchGridActions controller: actClicked invoked');

				var idx = $scope.row.rowIndex;
				console.log("Action for index: " + idx);
				var action = $scope.row.entity["@metadata"].action;

				if ($scope.row.entity["@metadata"].next_batch) {
					return;
				}
				else if ( ! action) {
					if ( ! confirm('Delete this row???'))
						return;
					$scope.row.entity["@metadata"].action = 'DELETE';
					$scope.icon = 'glyphicon-repeat';
				}
				else if (action == 'UPDATE') {
					for (var i = 0; i < espresso.list.currentTableDetails.columns.length; i++) {
						var attName = espresso.list.currentTableDetails.columns[i].name;
						$scope.row.entity[attName] = $scope.row.entity["__original"][attName];
					}
					$scope.row.entity["@metadata"].action = null;
				}
				else if (action == 'DELETE') {
					$scope.row.entity["@metadata"].action = null;
					$scope.icon = "glyphicon-trash";
					$scope.rowTitle = "Delete this row";
				}
				else if (action == 'INSERT') {
					$scope.gridData.splice($scope.row.rowIndex, 1);
				}
			};
		}]
	};
});

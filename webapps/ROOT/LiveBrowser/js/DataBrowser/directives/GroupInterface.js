espresso.app.directive('groupInterface', [
		
	function () {
		var GroupInterface = {
			restrict: 'A',
			scope: {
				group: '=',
				columns: '=',
				params: '=',
				index: '='
			},
			template: '<div class="grouping-area">' +
				'<form class="form-inline">' +
					'<div class="input-group">' +
						'<input ng-trim="false" ng-model="group.title" class="form-control form-inline" placeholder="Group Title">' +
						//'<div class="input-group-addon" ng-click="actions.addColumn()"><i class="fa fa-plus"></i></div>' +
						'<div class="input-group-addon" ng-click="actions.deleteGroup()"><i class="fa fa-times"></i></div>' +
					'</div>' +
				'</form>' +
				'<ul class="sortable grouping">' +
					'<li class="column-item" ng-repeat="key in group.columns" data-column-key="{{key}}">{{columns[key].alias}}</li>' +
				'</ul>' +
			'</div>',
			//link: function (scope, element, attrs, controller) {},
			controller: [
				'$scope', 'Notifications', 'Events',
				function ($scope, Notifications, Events) {
					$scope.actions = {
						deleteGroup: function deleteGroup() {
							//test case: sliced array equals expected result
							//test case: error/fail on columns in group

				 			var columnsCount = _.keys($scope.params.groups[$scope.index].columns).length;
				 			if (columnsCount>0) {
				 				Notifications.error('Groups with active columns cannot be deleted. Please remove them before deleting.');
				 			}
				 			else {
				 				$scope.params.groups.splice($scope.index, 1);
				 			}
						},
					};
			 		Events.broadcast('OptionsRefreshSortable');
				}
			]
		};
		return GroupInterface;
	}
]);
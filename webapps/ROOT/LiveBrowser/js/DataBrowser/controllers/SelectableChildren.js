espresso.app.controller('espresso.SelectableChildrenCtrl', [
	'$scope', 'selectableChildrenTables', '$modalInstance', 'Events',
	function ($scope, selectableChildrenTables, $modalInstance, Events) {
		$scope.selectableChildrenTables = selectableChildrenTables;
		$scope.updateActiveSelectableChild = function updateActiveSelectableChild(table) {
			Events.broadcast('UpdateActiveSelectableChild', table);
			$modalInstance.close();
		};
	}
]);
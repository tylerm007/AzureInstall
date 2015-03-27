/**
 * @ngdoc controller
 * @name ChildrenOptions
 */
espresso.app.controller('espresso.ChildrenOptionsCtrl', [
	'$scope' , 'Tables' , 'callback', '$rootScope' , '$modalInstance' ,
	function( $scope , Tables , callback, $rootScope , $modalInstance ){
		var formTableSettings = Tables.getSettings(Tables.formTable);
		var formTableDetails = Tables.getDetails(Tables.formTable);
		var originalSettings = espresso.util.cloneObject(formTableSettings);
		$scope.scalarTableSettings = formTableSettings;
		$scope.scalarTableInfo = formTableDetails;
		
		$scope.$watch('scalarTableSettings', function (current) {
			if (current) {
				$scope.$evalAsync(function () {
                    var $modal = $('.modal-content');
                    var $table = $('.modal-content table');
                    $modal.width($table.width() + 40);
				});
			}
		});

		$scope.refreshSortable = function refreshSortable() {
			$scope.$evalAsync(function () {
				$('tbody').sortable({
					stop: function () {
						var $tables = $('.children-tables tbody tr');
						var names = [];
						_.each($tables, function (element, index) {
							names.push($(element).data('table-name'));
						});
						
						var oldChildOrder = angular.copy(formTableSettings.childrenSettings);
						var newChildOrder = {};
						_.each(names, function (element, index) {
							newChildOrder[element] = oldChildOrder[element];
						});
						formTableSettings.childrenSettings = newChildOrder;
					}
				});
			});
		};
		
		$scope.close = function(){
			$scope.saveChanges();
			$modalInstance.close();
			if (callback)
				callback();
		};

		// Save any changes
		$scope.saveChanges = function() {
			
			Tables.saveTableSettings(formTableSettings.name);

			// The name of the tabs gets automatically updated, but if one or more tab was shown or hidden,
			// we have to recreate the whole thing.
			var displayChanged = false;
			_.each(formTableDetails.childrenByName, function(child, childName) {
				if (formTableSettings.childrenSettings[childName].displayed !=
								originalSettings.childrenSettings[childName].displayed)
					displayChanged = true;
			});

			if (displayChanged)
				$rootScope.$emit('childrenTabsChanged');
		};
}]);

espresso.app.service('Events', [
	'$rootScope',
	function ($rootScope) {
		//RefreshMainGrid
		//RefreshChildGrid
		//EditToMainGrid
		
		//From: BrowserCtrl
			//WatchAuthorMode
			//WatchEditMode
			//WatchCurrentServer
		
		//From: ListCtrl
			//WatchMainRow
			//WatchCurrentTable
		
		//From: Settings
			//SettingsUpdate
		var $scope = $rootScope.$new(true); 
		var Events = {
			broadcast : function (eventName, data) {
				$scope.$broadcast(eventName, data);
			},
			on : function (eventName, callback) {
				callback = callback || function () {};
				$scope.$on(eventName, callback);
			}
		};
		return Events;
	}
]);
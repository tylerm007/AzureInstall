/**
 * @ngdoc service
 * @name AsyncActive
 * @description
 * An injected service into $http which increments the number of active requests.
 * Known Limitation: This will only track ajax requests made within $http. Support for ajax requests made with other
 * libraries may be added later.
 */
kahuna.app.factory('AsyncActive', ['$q', '$window', '$rootScope', function ($q, $window, $rootScope) {
	$rootScope.$on('asyncCountUpdate', function () {
		if (kahuna.app.asyncActive < 0) {
			kahuna.app.asyncActive = 0;
		}
		if (kahuna.app.asyncActive === 0) {
			$rootScope.fetchStatus = 'OK';
		}
		else {
			$rootScope.fetchStatus = 'Fetching';
		}
	});

	return function (promise) {
		return promise.then(function (response) {
			kahuna.app.asyncActive--;
			$rootScope.$emit('asyncCountUpdate');
			return response;
		},
		function (response) {
			kahuna.app.asyncActive--;
			$rootScope.$emit('asyncCountUpdate');
			return $q.reject(response);
		},
		function (response) {
			kahuna.app.asyncActive--;
			$rootScope.$emit('asyncCountUpdate');
			return $q.reject(response);
		});
	};
}]).config(['$httpProvider', function ($httpProvider) {
	kahuna.app.asyncActive = 0;
	$httpProvider.responseInterceptors.push('AsyncActive');
	var asyncCountCallback = function (data, headersGetter) {
		kahuna.app.asyncActive++;
		return data;
	};
	$httpProvider.defaults.transformRequest.push(asyncCountCallback);
}]);

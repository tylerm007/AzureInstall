/**
 * A local storage service wrapping the native localStorage object.
 *
 * Local session expiration behavior belongs here.
 */
angular.module('Storage', []).service('Storage', [function () {
	return {
		put: function put(key, data) {
			if(angular.isObject(data)) {
				data = JSON.stringify(data);
			}
			var set = false;
			try{
				localStorage.setItem(key, data);
				set = true;
			}
			catch (e) {
			}
			return set;
		},
		get: function get(key) {
			var data = false;
			try {
				data = localStorage.getItem(key);
				if(angular.isObject(JSON.parse(data))) {
					data = JSON.parse(data);
				}
				if (data === 'true' || data === 'false') {
					data = (data === 'true');
				}
			}
			catch (e) {
			}
			return data;
		},
		remove: function remove(key) {
			localStorage.removeItem(key);
			return true;
		}
	};
}]);

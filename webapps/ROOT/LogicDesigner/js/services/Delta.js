/**
 * @ngdoc service
 * @name Delta
 * @description A factory service for monitoring scope values between events.
 */
kahuna.app.factory('Delta', [
	'$rootScope', '$q',
	function ($rootScope, $q) {
		//var $scope = $rootScope.$new();
		var Service = null;
		Service = {
			/**
			 * @ngdoc property
			 * @name Delta.attributes.scope
			 * @propertyOf Delta
			 * @description controller scope object
			 */
			scope: {},

			/**
			 * @ngdoc property
			 * @name Delta.attributes.snapshots
			 * @propertyOf Delta
			 * @description A collection of values taken with Delta.snapshot()
			 */
			snapshots: {},

			/**
			 * @ngdoc property
			 * @name Delta.attributes.listeners
			 * @propertyOf Delta
			 * @description A collection of listeners created when Delta.snapshot() $watches a function
			 */
			listeners: {},

			/**
			 * @ngdoc property
			 * @name Delta.attributes.reviewed
			 * @propertyOf Delta
			 * @description
			 * - Every time a snapshot is taken, this value will set to false.
			 * - Every time Delta.review() is called, review is set to true.
			 */
			reviewed: false,

			/**
			 * @ngdoc method
			 * @name Delta.methods.put
			 * @param {scope} the scope of the current controller
			 */
			put: function (scope) {
				Service.snapshots = {};
				Service.scope = scope;
				return Service;
			},

			/**
			 * @ngdoc method
			 * @name Delta.methods.snapshot
			 * @param {string} a path to the monitored value in Service.scope
			 * @description Copies a value for a future Delta.review()
			 */
			snapshot: function (path) {
				//temporarily DBF
				if (false && angular.isDefined(Service.listeners[path])) {
					//there was already a listener attached, detach it:
					Service.listeners[path]();
				}

				Service.listeners[path] = Service.scope.$watch(path, function (current, previous){
					if (angular.isDefined(current)) {
						Service.snapshots[path] = angular.copy(current);
						Service.reviewed = false;
					}
				});
				return Service;
			},

			/**
			 * @ngdoc method
			 * @name Delta.methods.remove
			 * @description This will conditionally remove and unwatch a snapshot.
			 */
			remove: function () {
			},

			/**
			 * @ngdoc method
			 * @name Delta.methods.reset
			 * @description After events which have incorporated a change between a snapshot and Delta.review(),
			 * Delta.reset() will update defined scope elements inside of Delta.snapshots and Delta.review() will
			 * not reject.
			 */
			reset: function () {
				angular.forEach(Service.snapshots, function (element, index) {
					var ref = eval('Service.scope.' + index);
					if (angular.isDefined(ref)) {
						Service.snapshots[index] = ref;
					}
				});
				Service.reviewed = false;
				return Service;
			},

			/**
			 * @ngdoc method
			 * @name Delta.methods.review
			 * @returns {promise} A promise resolved if nothing is changed, rejected otherwise
			 */
			review: function () {
				var deferred = $q.defer();

				//scenario A: in looping through snapshots, we find changes [reject]
				Service.reviewed = true;
				angular.forEach(Service.snapshots, function (snapshot, index) {
					var current = eval('Service.scope.' + index );
					if (!angular.equals(snapshot, current)) {
						
						// dbaseschemas are treated differently, since changes to status are meaningless.
						if (snapshot['@metadata'] && snapshot['@metadata'].href && snapshot['@metadata'].href.indexOf('/rest/abl/admin/v2/DbSchemas/') > -1) {
							snapshot.status = current.status; // Re-compare with the same status and checksum
							snapshot['@metadata'].checksum = current['@metadata'].checksum;
							snapshot['@metadata'].resource = current['@metadata'].resource;
							snapshot['@metadata'].verb = current['@metadata'].verb;
							if (angular.equals(snapshot, current))
								return;
						}
						
						deferred.reject(Service.scope);
						return deferred.promise;
					}
				});

				//scenario B: there were no changes [resolve]
				deferred.resolve(Service.scope);
				return deferred.promise;
			},

			/**
			 * @ngdoc method
			 * @name Delta
			 */
			isReviewed: function () {
				return Service.reviewed;
			}
		};
		return Service;
	}
]);

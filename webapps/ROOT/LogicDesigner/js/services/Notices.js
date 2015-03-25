/**
 * @ngdoc service
 * @name Notices
 * @description
 * A service for prompting and alerting users.
 */
kahuna.app.service('Notices', [
	'$rootScope', 'jqueryUI', '$q', 'Delta',
	function ($rootScope, jqueryUI, $q, Delta) {
		var Service = {
			confirmUnsaved: function () {
				var deferred = $q.defer();
				var options = {
					modal : true,
					buttons : {
						"Save Changes and Continue" : function () {
							$rootScope.$apply();
							deferred.resolve(true);
							$(this).dialog("close");
						},
						"Go Back and Review Changes" : function () {
							$rootScope.$apply();
							deferred.reject(false);
							$(this).dialog("close");
						},
						"Ignore and Lose Changes" : function () {
							$rootScope.$apply();
							Delta.reset();
							deferred.resolve(false);
							$(this).dialog("close");
						}
					}
				};
				jqueryUI.wrapper('#unsavedPrompt', 'dialog', options);
				return deferred.promise;
			},
			requireName: function () {
				angular.element('#requireName input').val('');
				var deferred = $q.defer();
				var options = {
					modal: true,
					buttons: {
						Cancel: function () {
							console.log(angular.element('#requireName input').val());
							$rootScope.$apply();
							deferred.reject();
							$(this).dialog("close");},
						Create: function () {
							$rootScope.$apply();
							deferred.resolve(angular.element('#requireName input').val());
							$(this).dialog("close");
						}
					},
				};
				jqueryUI.wrapper('#requireName', 'dialog', options);
				return deferred.promise;
			}
		};
		return Service;
	}
]);

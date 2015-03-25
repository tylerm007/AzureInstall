/**
 * @ngdoc service
 * @name Notifications
 * @requires jQuery
 * @requires pnotice
 * @description A service wrapping notify.js
 */
espresso.app.factory( 'Notifications' , [
	'$modal', '$rootScope', '$timeout',
	function($modal, $rootScope, $timeout){
		var Module = {
			/**
			 * @ngdoc property
			 * @name Notifications.attributes.messages
			 * @propertyOf Notifications
			 * @description The history of messages.
			 * [{
			 * 	message	: string
			 * 	type	: string (info|success|error|warn)
			 * 	event	: (false|window.event.target)
			 * 	element	: (false|element)
			 * 	options	: object
			 * }]
			 */
			messages	:[],
			/**
			 * @ngdoc property
			 * @name Notifications.attributes.options
			 * @propertyOf Notifications
			 */
			options		: {
				type	: 'info',
				event	: false,
				element	: false,
			},
			/**
			 * @ngdoc method
			 * @name Notifications.methods.output
			 * @description mdh: it may do more later, for now it outputs the last message stored, which
			 * should remain its default behavior.
			 */
			output		: function(){
				//get last message from messages collection
			},
			/**
			 * @ngdoc method
			 * @name Notifications.methods.create
			 */
			alert	: function( message , options ){
				var opts = {};
				angular.extend( opts , Module.options );
				angular.extend( opts , options );
				if( Module.isEvent() ){
					//tooltip
					opts['element'] = angular.element( window.event.target );
					var tooltip = opts['element'].opentip( message , {
						className	: opts.type,
					});
					tooltip.show();
					setTimeout(function(){ tooltip.deactivate(); },2500);
				} else {
					//default placement
					$.notify( message , opts.type );
				}
			},
			warnPopup : function (message) {
				$.notify(message, {type:'info'});
			},
			isEvent	: function(){
				if( angular.isDefined( window.event ) && angular.isDefined( window.event.target ) ){
					return true;
				}
				return false;
			},
			/**
			 * @ngdoc method
			 * @name Notifications.methods.info
			 */
			info	: function( message , options ){
				var opts = { type	: 'info' };
				angular.extend( opts , options );
				Module.alert( message , opts );
			},
			/**
			 * @ngdoc method
			 * @name Notifications.methods.success
			 */
			success	: function( message , options ){
				var opts = { type	: 'info' };
				angular.extend( opts , options );
				Module.alert( message , opts );
				return;
				var element = Module.placement( options );
				element.notify( message , 'success' );
			},
			/**
			 * @ngdoc method
			 * @name Notifications.methods.error
			 */
			error	: function( message , options ){
				return $modal.open({
					backdrop	: true,
					keyboard	: true,
					templateUrl	: 'templates/modals/errorDialog.html',
					controller	: 'espresso.ErrorDialogCtrl',
					resolve: {
						message: function () { return message; },
					},
					windowClass: 'NotificationsModal'
				});
			},
			/**
			 * 
			 */
			promptUnsaved: function promptUnsaved(options) {
				var $notificationModal = $('.NotificationsModal');
				if ($notificationModal.length || Module.suspended['promptUnsaved']) {return;}
				return $modal.open({
					backdrop	: true,
					keyboard	: true,
					templateUrl	: 'templates/modals/promptUnsaved.html',
					controller	: ['$modalInstance', '$scope', 'Events', function ($modalInstance, $scope, Events) {
						$scope.close = function close() {
							$modalInstance.close();
							Events.broadcast('AlertUnsavedClosed');
						};

						$scope.broadcastUndo = function broadcastUndo() {
							$rootScope.$broadcast('undoAll');
						};
					}],
					windowClass: 'NotificationsModal'
				});
			},
			suspended: {},
			suspend: function (method, milliseconds) {
				if (!milliseconds) {
					milliseconds = 300;
				}
				Module.suspended[method] = true;
				
				if (typeof milliseconds === 'boolean') {
					Module.suspended[method] = milliseconds;
				}
				else {
					$timeout(function () {
						Module.suspended[method] = false;
					}, milliseconds);
				}
			},
			/**
			 * @ngdoc method
			 * @name Notifications.methods.fail
			 */
			fail	: function( message , options ){
				var opts = { type	: 'info' };
				angular.extend( opts , options );
				Module.alert( message , opts );
				return;
				var element = Module.placement( options );
				element.notify( message , 'error' );
			},
			/**
			 * @ngdoc method
			 * @name Notifications.methods.placement
			 * @description In the future, this should also allow for a definition of where to output the notification.
			 * Currently it makes an educated guess, and failing to find an event, it will just output in the top right.
			 */
			placement	: function( options ){
				var element = $;
				//strange positioning and z indexing prevents it from being this simple ::
				if( angular.isDefined( window.event ) && angular.isDefined( window.event.target ) ){
					//element = $( window.event.target ).parent();
					$( window.event.target ).opentip(  );
				}
				//get window.event.target position on screen, update position of .notifyjs-wrapper accordingly
				return element;
			},

		};
		return Module;
}]);
espresso.app.controller( 'espresso.ErrorDialogCtrl', [
	 '$modalInstance', 'message', '$scope',
	 function ($modalInstance, message, $scope) {
		 console.log(message);
		 $scope.message = message;
		 $scope.close = function close() {
			$modalInstance.close();
		 };
	 }
]);

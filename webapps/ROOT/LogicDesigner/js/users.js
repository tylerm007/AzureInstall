
kahuna.users = {
	UsersCtrl: function ($scope, $rootScope, $routeParams, $timeout, KahunaData) {

		$rootScope.currentPage = 'users';
		$rootScope.currentPageHelp = 'docs/logic-designer/security/authentication#TOC-Authentication-Provider';
		$rootScope.helpDialog('users', 'Help', localStorage['eslo-ld-learn-complete']);

		var passwordPlaceholder = "????????";

		$scope.data = {};
		$scope.data.activeTab = [true, false, false];

		// if ($routeParams.projectId) {
		//     $rootScope.currentProject = kahuna.globals.projects[$routeParams.projectId];
		// }

		if ($routeParams.userId) {
			KahunaData.get('users', $routeParams.userId, function (data) {
				$scope.data.currentUser = data;
				$scope.data.userPassword = passwordPlaceholder;
			});
		}

		// Get all the users for the current account
		KahunaData.query('admin:users', 'project_ident=' + $rootScope.currentProject.ident, function (data) {
			//kahuna.setInScope($scope, "users", data);
			$scope.data.users = data;
			$scope.data.nextBatch = false;
			if (data.length > 0) {
				if (data[data.length - 1]['@metadata'].next_batch) {
					$scope.data.nextBatch = data[data.length - 1]['@metadata'].next_batch;
					$scope.data.users.pop();
				}
			}
			if (data.length > 0 && ! $scope.data.currentUser) {
				$scope.data.currentUser = data[0];
				$scope.data.userPassword = passwordPlaceholder;
				$scope.userSelected(data[0]);
			}
		});

		$scope.getUserClass = function (user, idx) {
			if (user.ident == $scope.data.currentUser.ident)
				return "SelectedItem";
			return (idx % 2) ? "OddItem" : "EvenItem";
		};

		$scope.userSelected = function (user) {
			$scope.data.currentUser = user;
			$scope.showUserRoles();
			$scope.data.userPassword = passwordPlaceholder;

			if (user.apikey_lifespan) {
				$scope.data.keyDays = Math.floor(user.apikey_lifespan/86400);
				$scope.data.keyHours = Math.floor((user.apikey_lifespan - ($scope.data.keyDays * 86400)) / 3600);
				$scope.data.keyMinutes = Math.floor((user.apikey_lifespan - (($scope.data.keyDays * 86400) + ($scope.data.keyHours * 3600))) / 60);
			}
		};

		$scope.showNextBatch = function () {
			KahunaData.query($scope.data.nextBatch, null, function (data) {
				for (var i = 0; i < data.length; i++)
					$scope.data.users.push(data[i]);
				$scope.data.nextBatch = false;
				if (data.length > 0) {
					if (data[data.length - 1]['@metadata'].next_batch) {
						$scope.data.nextBatch = data[data.length - 1]['@metadata'].next_batch;
						$scope.data.users.pop();
					}
				}
			});
		};

		$scope.saveUser = function (user) {
			if ($scope.data.userPassword == passwordPlaceholder)
				delete $scope.data.currentUser.password_hash;
			else
				$scope.data.currentUser.password_hash = $scope.data.userPassword;
			var lifespan = 0;
			if ($scope.data.keyDays) lifespan += $scope.data.keyDays*86400;
			if ($scope.data.keyHours) lifespan += $scope.data.keyHours*3600;
			if ($scope.data.keyMinutes) lifespan += $scope.data.keyMinutes*60;
			if (lifespan > 0)
				$scope.data.currentUser.apikey_lifespan = lifespan;
			KahunaData.update($scope.data.currentUser, function (data) {
				for (var i = 0; i < data.txsummary.length; i++) {
					var modObj = data.txsummary[i];
					if (modObj['@metadata'].resource === 'admin:users' && modObj.ident === $scope.data.currentUser.ident) {
						// kahuna.setInScope($scope, "currentUser", modObj);
						$scope.data.currentUser = modObj;
						for (var j = 0; j < $scope.data.users.length; j++) {
							if ($scope.data.users[j].ident == modObj.ident) {
								$scope.data.users[j] = modObj;
								break;
							}
						}
						break;
					}
				}
				kahuna.util.info('User ' + $scope.data.currentUser.name + ' was saved');
				try { woopra.track('user_saved'); } catch (e) { console.log('Woopra error: ' + e); }
			});
		};

		$scope.deleteUser = function () {
			if ( ! confirm('Delete user ' + $scope.data.currentUser.name + ' ?'))
				return;
			KahunaData.remove($scope.data.currentUser, function (data) {
				kahuna.util.info('User ' + $scope.data.currentUser.name + ' was deleted');
				var idx = $scope.data.users.indexOf($scope.data.currentUser);
				$scope.data.users.splice(idx, 1);
				if (idx > 0)
					$scope.data.currentUser = $scope.data.users[idx - 1];
				else if ($scope.data.users.length > 0)
					$scope.data.currentUser = $scope.data.users[0];
				else
					$scope.data.currentUser = null;
				$scope.data.userPassword = passwordPlaceholder;
			});
		};

		$scope.createUser = function () {
			KahunaData.create('admin:users', {
				name: "User" + (new Date()).getTime(),
				fullname: "New user",
				email: "new@user.com",
				status: 'A',
				apikey_lifespan: 86400,
				project_ident: $rootScope.currentProject.ident
			},
			function (data) {
				for (var i = 0; i < data.txsummary.length; i++) {
					var modObj = data.txsummary[i];
					if (modObj['@metadata'].resource === 'admin:users' && modObj['@metadata'].verb === 'INSERT') {
						$scope.data.users.push(modObj);
						$scope.data.currentUser = modObj;
						$scope.data.userPassword = passwordPlaceholder;
						break;
					}
				}
			});
			kahuna.logEvalProgress("created user", $scope.data.users.length );
		};

		//////////////////////////////////////////////////////////////
		// Roles stuff

		$scope.selectedRoles = [];

		function findRoleIndex(name) {
			if ( ! $scope.roles)
				return -1;
			for (var i = 0; i < $scope.roles.length; i++) {
				if (name == $scope.roles[i].name)
					return i;
			}
			return -1;
		}

		$scope.showUserRoles = function () {
			$scope.selectedRoles = [];
			if ( ! $scope.data.currentUser)
				return;

			var rolesStr = $scope.data.currentUser.roles;
			if (!rolesStr || rolesStr.trim().length == 0)
				return;

			var roleParts = rolesStr.split(",");
			for (var i = 0; i < roleParts.length; i++) {
				var idx = findRoleIndex(roleParts[i]);
				if (idx != -1)
					$scope.selectedRoles[idx] = true;
			}
		};

		// Fetch all roles for the current project
		KahunaData.query('AllRoles', {filter: 'project_ident=' + $rootScope.currentProject.ident, pagesize: 200}, function (data) {
			kahuna.setInScope($scope, "roles", data);
			$scope.showUserRoles();
		});

		$scope.saveRoles = function () {
			var roleStr = '';
			for (var i = 0; i < $scope.selectedRoles.length; i++) {
				if ($scope.selectedRoles[i]) {
					roleStr += $scope.roles[i].name + ',';
				}
			}
			$scope.data.currentUser.roles = roleStr;
			KahunaData.update($scope.data.currentUser, function (data) {
				for (var i = 0; i < data.txsummary.length; i++) {
					var modObj = data.txsummary[i];
					if (modObj['@metadata'].resource === 'admin:users' && modObj.ident === $scope.data.currentUser.ident) {
						$scope.data.currentUser = modObj;
						break;
					}
				}
				$scope.data.userPassword = passwordPlaceholder;
				kahuna.util.info('User ' + $scope.data.currentUser.name + ' was saved');
			});
		};
	}
};

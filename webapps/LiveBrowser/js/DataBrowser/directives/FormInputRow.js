espresso.app.directive('formInputRow', [
	'Tables',
	function (Tables) {
		var FormInputRow = {
			restrict: 'A',
			template: function () {
				var html = '';
				//labelPlacement: Left
				html += '<div ng-if="labelPlacement == \'Left\'" class="form-group dynamic-column-row column-container-{{slugify(att.name)}}">' +
						'<div class="column-container">' +
							'<div class="col-sm-3">' +
								'<table>' +
									'<tr>' +
										'<td>' +
										'<i class="icon fa fa-cog control-label gridHeaderButton eslo-header-button" ng-click="editColumnHeader( att );" ng-show=\'root.authorMode\' title=\'Edit how this attribute is displayed\'></i>' +
										'&nbsp;' +
										'</td>' +
										'<td>' +
										'<label for="att{{att.name}}" class="control-label scalar-label eslo-form-label" title="{{att.name}} ({{att.type}}){{!att.is_nullable && \', cannot be NULL\' || \'\'}}">' +
										'<span title="This value cannot be NULL" class="nullable-indicator" ng-if="!att.is_nullable">*</span>{{att.alias}}:' +
										'</label>' +
										'</td>' +
									'</tr>' +
								'</table>' +
							'</div>' +
							'<div class="col-sm-9">' +
								'<espresso-detail table-name="formTableName" col="att" row="scalarRow" edit-mode="root.editMode" parent-select-function="scalarSelectParent" />' +
							'</div>' +
						'</div>' +
					'</div>';

				//labelPlacement: Top
				html += '<div ng-if="labelPlacement == \'Top\'" class="form-group dynamic-column-row column-container-{{slugify(att.name)}}">' +
						'<div class="column-container">' +
							'<div class="col-sm-12">' +
								'<table>' +
									'<tr>' +
										'<td>' +
										'<i class="icon fa fa-cog control-label gridHeaderButton eslo-header-button" ng-click="editColumnHeader( att );" ng-show=\'root.authorMode\' title=\'Edit how this attribute is displayed\'></i>' +
										'&nbsp;' +
										'</td>' +
										'<td>' +
										'<label for="att{{att.name}}" class="control-label scalar-label eslo-form-label" title="{{att.name}} ({{att.type}}){{!att.is_nullable && \', cannot be NULL\' || \'\'}}">' +
										'<span title="This value cannot be NULL" class="nullable-indicator" ng-if="!att.is_nullable">*</span>{{att.alias}}:' +
										'</label>' +
										'</td>' +
									'</tr>' +
								'</table>' +
							'</div>' +
							'<div class="col-sm-12">' +
								'<espresso-detail table-name="formTableName" col="att" row="scalarRow" edit-mode="root.editMode" parent-select-function="scalarSelectParent" />' +
							'</div>' +
						'</div>' +
					'</div>';
				
				return html;
			},
			//link: function (scope, element, attrs, controller) {},
			controller: [
				'$scope',
				function ($scope) {
					if ($scope.att.parentRole) {
						//$scope.scalarRow = scope.$eval($scope.att.dataSource);
						var scope = $scope.$new();
						$.extend(scope, $scope.$eval('scalarRow'))
						//console.log(scope, scope.$eval($scope.att.dataSource), $scope.att.dataSource);
						scope.$watch('__internal', function () {
							var internal = scope.$eval($scope.att.dataSource);
							if (internal) {
								//$scope.scalarRow[$scope.att.name] = internal;
							}
						}, true);
					}
				}
			]
		};
		return FormInputRow;
	}
]);
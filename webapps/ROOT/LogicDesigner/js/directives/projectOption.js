kahuna.app.directive('projectOption', function () {
		var ProjectOption = {
			restrict: 'E',
			template: function () {
				var html = '<div ng-switch on="optionType.data_type">';
				html += '<div ng-switch-when="boolean" class="">' +
						'  <input type="checkbox" ng-model="optionValues[optionType.ident]" ' +
						'    ng-true-value="true" ng-false-value="false" ' +
						'    id="optionType{{optionType.ident}}"/>' +
						'</div>';
				html += '<div ng-switch-when="string" class="">' +
						'  <input class="form-control" type="text" size="40" ng-model="optionValues[optionType.ident]" id="optionType{{optionType.ident}}" />' +
						'</div>';
				html += '<div ng-switch-when="integer" class="">' +
						'  <input class="form-control" type="text" size="10" style="text-align: right;" ng-model="optionValues[optionType.ident]" id="optionType{{optionType.ident}}" />' +
						'</div>';
				html += '<div ng-switch-when="enum" class="">' +
						'  <select class="form-control" ng-model="optionValues[optionType.ident]" ng-options="val for val in optionTypeEnums[optionType.ident]" id="optionType{{optionType.ident}}"/>' +
						'</div>';
				html += '<div ng-switch-default class="">' +
						'  UNKNOWN OPTION TYPE: {{optionType.data_type}}' +
						'</div>';
				html += "</div>";

				return html;
			},
			//link: function (scope, element, attrs, controller) {},
			scope: {
				optionType: '=optionType',
				optionValues: '=optionValues',
				optionTypeEnums: '=optionTypeEnums'
			},
			controller: [
				'$scope',
				function ($scope) {
				}
			]
		};
		return ProjectOption;
	}
);

espresso.app.service('CellTemplates', [
	'$rootScope',
	function ($rootScope) {
		var CellTemplates = {
			templates: {},
			//a list of those used and defined generic_types associated with their unique CellTemplates name
			genericTypesMap: {
				text: 'text'
			},
			getByGenericType: function getByGenericType(genericType, params) {
				return CellTemplates.getTemplate(CellTemplates.genericTypesMap[genericType], params);
			},
			getTemplate: function getTemplate(template, params) {
				return CellTemplates.templates[template];
			},
			addTemplate: function addTemplate(name, template, callback) {
				if (!callback) {
					callback = CellTemplates.defaultTemplateCallback;
				}
				
				CellTemplates.templates[name] = {template: template, callback: callback};
			},
			defaultTemplateCallback: function defaultTemplateCallback(params) {
				return params;
			}
		};
		return CellTemplates;
	}
]);
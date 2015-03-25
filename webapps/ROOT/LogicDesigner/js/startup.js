$(document).ready(function () {

//	$('#restServerName').val(kahuna.rootUrl);

	// Fetch the current account
	kahuna.fetchData('admin:accounts', null, function (data) {
		var accountIndex = 0;
		if (data.length > 1) {
			var i;
			for (i = 0; i < data.length; i++) {
				if (data[i].ident == 1) {
					accountIndex = i;
					break;
				}
			}
		}
		kahuna.globals.currentAccount = data[accountIndex];
		kahuna.putInScope('currentAccount', data[accountIndex]);
		$('#GlobalAccountName').html(data[accountIndex].name);
	});

	kahuna.meta.getRuleTypes();
});

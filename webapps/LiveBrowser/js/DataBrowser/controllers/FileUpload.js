espresso.app.controller( 'espresso.FileUploadCtrl', [
	'$scope', 'row', 'col', 'callback', '$rootScope', '$modalInstance', 'Events',
	function($scope, row, col, callback, $rootScope, $modalInstance, Events){
		$scope.upload = {
			uploaded: 0,
			progressBarType: "info"
			};

		$scope.fileSelected = function() {
			console.log('File chosen');
			var f = $('#uploadFileChooser')[0].files[0];
			$scope.upload.fileSize = f.size + " bytes";
			$scope.upload.fileType = f.type;
		};

		$scope.uploadProgress = function(e) {
			if(e.lengthComputable){
				espresso.util.setInScopeFun($scope, function() {
					$scope.upload.uploaded = Math.floor(e.loaded * 100 / e.total);
					$scope.upload.progressBarMessage = "" + $scope.upload.pctUploaded + "%";
				});
			}
		};

		$scope.uploadFile = function() {
			$scope.upload.errorMessage = null;
			var formData = new FormData();
			formData.append('checksum', 'override');
			formData.append('authorization', espresso.globals.apiKeyValue + ':1');
			formData.append(col.name, $('#uploadFileChooser')[0].files[0]);
			$.ajax({
				url: row['@metadata'].href,
				type: 'POST',
				xhr: function() {  // Custom XMLHttpRequest
					var myXhr = $.ajaxSettings.xhr();
					if(myXhr.upload){
						myXhr.upload.addEventListener('progress', $scope.uploadProgress, false);
					}
					return myXhr;
				},
				beforeSend: function() {
				},
				success: function(data) {
					$rootScope.setPictureUpdatedStatus(true);
					espresso.util.setInScopeFun($scope, function() {
						$scope.upload.progressBarMessage = "Upload complete";
						$scope.upload.progressBarType = "success";
					});
					Events.broadcast('ForceFormRow', data[0]);//this was a file upload for a binary column, it should only ever update one column
					if (callback) callback(data.txsummary);
				},
				error: function(err) {
					$rootScope.setPictureUpdatedStatus(true);
					espresso.util.setInScopeFun($scope, function() {
						if (err && err.responseJSON && err.responseJSON.errorMessage) {
							$scope.upload.errorMessage = err.responseJSON.errorMessage;
							var parse = S($scope.upload.errorMessage);
							if (S(parse).contains('truncation') || parse.contains('truncate')) {
								$scope.upload.errorMessage = '[The upload was likely too large for the column] ' + $scope.upload.errorMessage;
							}
							if (S(parse).contains('max_allowed_packet')) {
								$scope.upload.errorMessage = '[The file was likely too large to upload] ' + $scope.upload.errorMessage;
							}
						}
						$scope.upload.progressBarType = "danger";
						$scope.upload.progressBarMessage = "Upload failed";
					});
					espresso.util.error("File upload failed");
					console.log("Error during upload");
				},
				// Form data
				data: formData,
				//Options to tell jQuery not to process data or worry about content-type.
				cache: false,
				contentType: false,
				processData: false
			});
		};

		$scope.exitModal = function() {
			$rootScope.setPictureUpdatedStatus(true);
			Events.broadcast('RefreshMainGrid');
			$modalInstance.close();
		};
	}
]);

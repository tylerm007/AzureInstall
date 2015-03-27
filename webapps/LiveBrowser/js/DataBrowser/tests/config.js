module.exports = function(config) {
  config.set({
    // base path, that will be used to resolve files and exclude
    basePath: '..',
    // frameworks to use
    frameworks: ['jasmine'],
    // list of files / patterns to load in the browser
    files: [
    		'../jquery-2.1.0.min.js',
    		'../moment.min.js',
    		'../string.js',
    		'../jquery.mask.min.js',
    		'../mousetrap.min.js',
    		'../bootstrap.min.js',
    		'../jqueryui/jquery-ui-1.10.0.custom.js',
    		'../ui-layout/jquery.layout-1.3.0.js',
    		'../angular.js',
    		'../angular-resource.js',
    		'../angular-route.js',
    		'../angular-sanitize.min.js',
    		'../angular-ui/ui-bootstrap-tpls-0.10.0.js',
    		'../DataBrowser/directives/QuickDate.js',
    		'../angular-ui/ui-utils.min.js',
    		'../jquery.pnotify.min.js',
    		'../../ng-grid/2.0.7/ng-grid-2.0.7.debug_custom.js',
    		'../underscore/1.5.2/underscore.js',
    		'../introjs/intro.js',
    		'../text-angular.js',
    		'../text-angular-sanitize.js',
    		
    		'../DataBrowser/services/Data.js',
    		'../DataBrowser/services/Storage.js',
    		'../DataBrowser/services/Auth.js',
    		'../DataBrowser/services/Dimensions.js',
    		'../DataBrowser/browser.js',
    		'../DataBrowser/services/Events.js',
    		'../DataBrowser/controllers/Browser.js',
    		'../DataBrowser/controllers/LoginDialog.js',
    		'../DataBrowser/services/Tables.js',
    		'../DataBrowser/services/Settings.js',
    		'../DataBrowser/services/DirectLink.js',
    		'../DataBrowser/services/Notifications.js',
    		'../DataBrowser/services/Masks.js',
    		'../DataBrowser/services/Query.js',
    		'../DataBrowser/services/Device.js',
    		'../DataBrowser/services/FormWindowHelper.js',
    		
    		'../DataBrowser/util.js',
    		'../DataBrowser/metadata.js',
    		'../DataBrowser/list.js',
    		'../DataBrowser/details.js',
    		'../DataBrowser/children.js',
    		
    		'../DataBrowser/controllers/Column.js',
    		'../DataBrowser/controllers/GridOptions.js',
    		'../DataBrowser/controllers/ParentSelect.js',
    		'../DataBrowser/controllers/ChildrenOptions.js',
    		'../DataBrowser/controllers/RouteController.js',
    		'../DataBrowser/controllers/HeaderController.js',
    		'../DataBrowser/controllers/LinkGeneratorController.js',
    		'../DataBrowser/controllers/AuthorLogin.js',
    		'../DataBrowser/controllers/FileUpload.js',
    		'../DataBrowser/controllers/SelectableChildren.js',
    		'../DataBrowser/controllers/AppSettings.js',
    		
    		//'../DataBrowser/main.js', //in app, but not test b/c -> does dom manipulations
    		
    		'../DataBrowser/directives/ChildrenActions.js',
    		'../DataBrowser/directives/DetailInput.js',
    		'../DataBrowser/directives/EspressoMask.js',
    		'../DataBrowser/directives/ParentDraggable.js',
    		'../DataBrowser/directives/gestures.min.js',
    		'../DataBrowser/directives/EspressoGrid.js',
    		'../DataBrowser/directives/EspressoTrackModel.js',
    		'../DataBrowser/directives/OptionInput.js',
    		
    		'../DataBrowser/filters/InputMask.js',
    		'../DataBrowser/filters/Binary.js',
    		
    		'../DataBrowser/directives/GroupInterface.js',
    		'../DataBrowser/directives/FormInputGroup.js',
    		'../DataBrowser/directives/FormInputRow.js',
    		
    		//Vendor Testing Scripts
    		'../angular-mocks.js',
    		
    		//Controllers
    		'tests/controllers/DetailsCtrl.js',
    		'tests/controllers/ChildrenCtrl.js',
    		'tests/controllers/ListCtrl.js',
    		'tests/controllers/ChildrenCtrl.js',
    		'tests/controllers/ColumnCtrl.js',
    		'tests/controllers/GridOptionsCtrl.js',
    		'tests/controllers/HeaderCtrl.js',
    		'tests/controllers/ParentSelect.js',
    		
    		//Services
    		'tests/services/Masks.js',
    		'tests/services/FormWindowHelper.js',
    		
    		
    		
    		//'tests/directives/espressoDetail.js',
    		//'',../ =C:/Users/Master/logic/LiveBrowser/WebContent/js/ 
    		//C:/Users/Master/logic/LiveBrowser/WebContent/js/DataBrowser/tests/config.js
    ],


    // list of files to exclude
    exclude: [
      
    ],


    // test results reporter to use
    // possible values: 'dots', 'progress', 'junit', 'growl', 'coverage'
    reporters: ['progress'],


    // web server port
    port: 9876,


    // enable / disable colors in the output (reporters and logs)
    colors: true,


    // level of logging
    // possible values: config.LOG_DISABLE || config.LOG_ERROR || config.LOG_WARN || config.LOG_INFO || config.LOG_DEBUG
    logLevel: config.LOG_INFO,


    // enable / disable watching file and executing tests whenever any file changes
    autoWatch: true,


    // Start these browsers, currently available:
    // - Chrome
    // - ChromeCanary
    // - Firefox
    // - Opera
    // - Safari (only Mac)
    // - PhantomJS
    // - IE (only Windows)
    browsers: ["C:/Program Files (x86)/Google/Chrome/Application/chrome.exe"],


    // If browser does not capture in given timeout [ms], kill it
    captureTimeout: 60000,


    // Continuous Integration mode
    // if true, it capture browsers, run tests and exit
    singleRun: false
  });
};
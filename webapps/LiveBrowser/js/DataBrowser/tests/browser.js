module.exports = function(config) {
  config.set({
    // base path, that will be used to resolve files and exclude
    basePath: '..',
    // frameworks to use
    frameworks: ['jasmine'],
    // list of files / patterns to load in the browser
    files: [
      '../../jquery-2.0.3.min.js',
      '../../jquery.mask.min.js',
      'http://netdna.bootstrapcdn.com/bootstrap/3.1.0/js/bootstrap.min.js',
      '../../jqueryui/jquery-ui-1.10.0.custom.js',
      '../../ui-layout/jquery.layout-1.3.0.js',
      'http://ajax.googleapis.com/ajax/libs/angularjs/1.2.11/angular.js',
      'http://ajax.googleapis.com/ajax/libs/angularjs/1.2.11/angular-resource.js',
      'http://ajax.googleapis.com/ajax/libs/angularjs/1.2.11/angular-route.js',
	  'http://cdnjs.cloudflare.com/ajax/libs/angular.js/1.2.0rc3/angular-mocks.js',
      '../../angular-ui/ui-bootstrap-tpls-0.10.0.js',
      '../../angular-ui/ui-utils.min.js',
      '../../jquery.pnotify.min.js',
      'C:/Users/Master/logic/DataBrowser/WebContent/ng-grid/2.0.7/ng-grid-2.0.7.debug.js',
      '../../underscore/1.5.2/underscore.js',
      '../../DataBrowser/services.js',
      '../../DataBrowser/',
      '../../DataBrowser/services/Auth.js',
      '../../DataBrowser/services/Dimensions.js',
      '../../DataBrowser/browser.js',
      '../../DataBrowser/services/Tables.js',
      '../../DataBrowser/services/Settings.js',
      '../../DataBrowser/services/DirectLink.js',
      '../../DataBrowser/services/Notifications.js',
      '../../DataBrowser/services/Masks.js',
      '../../DataBrowser/util.js',
      '../../DataBrowser/metadata.js',
      '../../DataBrowser/list.js',
      '../../DataBrowser/details.js',
      '../../DataBrowser/children.js',
      '../../DataBrowser/controllers/Column.js',
      '../../DataBrowser/controllers/GridOptions.js',
      '../../DataBrowser/controllers/ParentSelect.js',
      '../../DataBrowser/directives/ChildrenActions.js',
      '../../DataBrowser/directives/DetailInput.js',
      '../../DataBrowser/directives/DetailLink.js',
      '../../DataBrowser/directives/EspressoMask.js',
      '../../DataBrowser/directives/EspressoTrackModel.js',
      '../../DataBrowser/filters/InputMask.js',
      '../../DataBrowser/tests/services/DirectLink.js',
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

function moveCursorToEnd(el) {
	var $element = angular.element(el);
	var attempts = $element.data('clicks');
	if ($element.is(':focus') && attempts > 2) {return;}
	setTimeout(function () {
		try {
		    if (typeof el.selectionStart == "number") {
		        el.selectionStart = el.selectionEnd = el.value.length;
		    } else if (typeof el.createTextRange != "undefined") {
		        el.focus();
		        var range = el.createTextRange();
		        range.collapse(false);
		        range.select();
		    }
		} catch(e) {
		}
	    $element.focus();
	    $element.data('clicks', parseInt(attempts)+1);
	}, 100);
}
//////////////////////////////////////////////////////////////
// Layout setup
var toggleButtons	= '<div class="btnCenter" style="width: 12px; height: 30px;"></div>'
					+ '<div class="btnBoth" style="width: 12px; height: 20px;"></div>'
					+ '<div class="btnWest" style="width: 12px; height: 30px;"></div>';

var layouts = {};

$(document).ready(function(){
	espresso.layout = {};
	
	
	$("#childCollections") 
		.tabs()
		.find(".ui-tabs-nav")
			.sortable({ axis: 'x', zIndex: 2 })
	;	
	
	// Overall layout
	layouts['top'] = espresso.topLayout = $('body').layout({
		name: 'outerLayout',
		resizeWhileDragging: false,
		resizerDblClickToggle: false,
		sizable: false,
		animatePaneSizing: false,
		fxSpeed: 'slow',
		spacing_open: 0,
		spacing_closed: 0,
		north: {
			paneSelector: '.outerLayout-north',
			size: 40,
			resizerDblClickToggle: false,
			overflow: 'visible',
			zIndex: 5,
			showOverflowOnHover: true
		},
		center: {
			paneSelector: '.outerLayout-center',
			resizerDblClickToggle: false,
			minSize: 50
		},
		west: {
			paneSelector: '.outerLayout-west',
			resizerDblClickToggle: false,
			spacing_open: 12,
			size: '50%',
			spacing_closed: 12,
			togglerLength_closed: 82,
			togglerLength_open: 82,
			onresize_end: function(paneName, paneElement, paneState, paneOptions, layoutName) {
				$('#leftTableDiv').trigger('resize');
				$('#childTabs').trigger('resize');
			}
		}
	});

	layouts['left'] = espresso.leftLayout = $('#leftSide').layout({
		name: 'leftLayout',
		resizeWhileDragging: false,
		resizerDblClickToggle: false,
		sizable: false,
		spacing_open: 0,
		spacing_closed: 0,
		animatePaneSizing: false,
		fxSpeed: 'slow',
		north: {
			paneSelector: '.leftLayout-north',
			resizerDblClickToggle: false,
			showOverflowOnHover: true,
			size: 40
		},
		center: {
			paneSelector: '.leftLayout-center',
			resizerDblClickToggle: false,
			spacing_open: 1,
			//showOverflowOnHover: false
		},
		south: {
			paneSelector: '.leftLayout-south',
			resizerDblClickToggle: false,
			size: $('#leftGridFooter').outerHeight(true) + 8
		}
	});
	
	// Resize the components of the children tabs/table to fit
	//var $injector = angular.injector( [ 'espresso.browser' ] );
	//var Settings = $injector.get( 'Settings' );
	//var Dimensions = $injector.get( 'Dimensions' );
	espresso.layout.resizeTable = function() {
		$('.childrenGrid').trigger('resize');
		var parentHeight = $('#childTabs').outerHeight();
		var tabsHeight = $('#childTabs').find('.ui-widget-header').outerHeight();
		var newHeight = (parentHeight - tabsHeight) - 5;
		$('#childTabs').find(".tab-content").height(newHeight);
		var headerHeight = $('#childTabs').find('.ngTopPanel').outerHeight();
		$('#childTabs').find("div.ngViewport.ng-scope").height(newHeight - headerHeight);
		
		//save local screen position settings
		if( Dimensions.initState ){
			Dimensions.setDimensions( Settings.getDimensions() );
		} else {
			Settings.setDimensions( Dimensions.getDimensions() );
		}
		Dimensions.initState = false;
	};
	var preventResize = false;
	$('body').resize(function () {
		//return;
	    setTimeout(function () {
	        //allow for split columns in
	        var columnWidth = 500;
	        var $detailsPane = $( '.details-pane' );
	        var detailsColumns = Math.floor( $detailsPane.width()/columnWidth );
	        var $labelControlForm = $('.details-pane .col-sm-3');
	        var labelWidth = $labelControlForm.eq(1).width();
	        if (labelWidth < 100) { labelWidth = 100; }labelWidth = 100;
	        $('.details-pane label.control-label').width(labelWidth);
	        $detailsPane.removeClass( 'columns-1 columns-2 columns-3 columns-4 columns-5 columns-6' );
	        $detailsPane.addClass( 'columns-' + detailsColumns );
	    }, 0);
	});
	
	layouts['right'] = espresso.rightLayout = $('#rightSide').layout({
		name: 'rightLayout',
		resizeWhileDragging: false,
		sizable: true,
		animatePaneSizing: false,
		resizerDblClickToggle: false,
		fxSpeed: 'slow',
		north: {
			paneSelector: '.rightLayout-north',
			closable: true,
			resizable: true,
			spacing_open: 8,
			size: '50%',
			resizerDblClickToggle: false,
			spacing_closed: 8,
			togglerLength_closed: 105,
			togglerLength_open: 105,
//			togglerContent_closed: toggleButtons,
//			togglerContent_open: toggleButtons,
		},
		center: {
			paneSelector: '.rightLayout-center',
			resizerDblClickToggle: false,
			closable: true,
			resizable: true,
//			size: 240,
//			spacing_open: 12,
//			spacing_closed: 12,
//			togglerLength_closed: 105,
//			togglerLength_open: 105,
//			togglerContent_closed: toggleButtons,
//			togglerContent_open: toggleButtons,
//			onresize_end: espresso.layout.resizeTable
		}
	});
	
	layouts['child'] = espresso.childrenLayout = $('#childCollections').layout({
		name: 'childrenLayout',
		resizerDblClickToggle: false,
		resizeWhileDragging: false,
		sizable: true,
		center: {
			paneSelector: '.childrenLayout-center',
			closable:true,
			sizable:true
		},
		south: {
			paneSelector: '.childrenLayout-south',
			size: $('#childFooter').outerHeight(true) + 4,
			sizable: false,
			resizerDblClickToggle: false,
			spacing_open: 0,
			spacing_closed: 0
		}
	});

	// customize the west-toggler events
	espresso.topLayout.togglers.west
		// UN-BIND DEFAULT TOGGLER FUNCTIONALITY
		.unbind("click")
		// BIND CUSTOM WEST METHODS
		.find(".btnCenter").click( maximizeCenter ).attr("title", "Maximize right").end()
		.find(".btnWest").click( maximizeWest ).attr("title", "Maximize left").end()
		.find(".btnBoth").click( equalizePanes ).attr("title", "Reset to middle").end()
	;
	
	espresso.initLayoutUI = function reinitLayoutUI() {
		_.each(layouts, function (element) {
			try {
				element.destroy();
			} catch(e) {
				//this may be a child layout, and as a result of the parent being destroyed this fails
			}
		});
		
		espresso.layout = {};
		
		$("#childCollections") 
			.tabs()
			.find(".ui-tabs-nav")
				.sortable({ axis: 'x', zIndex: 2 })
		;	
		
		// Overall layout
		layouts['top'] = espresso.topLayout = $('body').layout({
			name: 'outerLayout',
			resizeWhileDragging: false,
			resizerDblClickToggle: false,
			sizable: false,
			animatePaneSizing: false,
			fxSpeed: 'slow',
			spacing_open: 0,
			spacing_closed: 0,
			north: {
				paneSelector: '.outerLayout-north',
				size: 40,
				resizerDblClickToggle: false,
				overflow: 'visible',
				zIndex: 5,
				onresize: espresso.triggerGlobalResize,
				showOverflowOnHover: true
			},
			center: {
				paneSelector: '.outerLayout-center',
				resizerDblClickToggle: false,
				onresize: espresso.triggerGlobalResize,
				minSize: 50
			},
			west: {
				paneSelector: '.outerLayout-west',
				resizerDblClickToggle: false,
				spacing_open: 12,
				size: '50%',
				spacing_closed: 12,
				togglerLength_closed: 82,
				togglerLength_open: 82,
				onresize_end: function(paneName, paneElement, paneState, paneOptions, layoutName) {
					$(window).trigger('resize');
					//$('#childTabs').trigger('resize');
				}
			}
		});

		layouts['left'] = espresso.leftLayout = $('#leftSide').layout({
			name: 'leftLayout',
			resizeWhileDragging: false,
			resizerDblClickToggle: false,
			sizable: false,
			spacing_open: 0,
			spacing_closed: 0,
			animatePaneSizing: false,
			fxSpeed: 'slow',
			north: {
				paneSelector: '.leftLayout-north',
				resizerDblClickToggle: false,
				showOverflowOnHover: true,
				onresize: espresso.triggerGlobalResize,
				size: 40
			},
			center: {
				paneSelector: '.leftLayout-center',
				resizerDblClickToggle: false,
				onresize: espresso.triggerGlobalResize,
				spacing_open: 1,
				//showOverflowOnHover: false
			},
			south: {
				paneSelector: '.leftLayout-south',
				resizerDblClickToggle: false,
				onresize: espresso.triggerGlobalResize,
				size: $('#leftGridFooter').outerHeight(true) + 8
			}
		});
		
		// Resize the components of the children tabs/table to fit
		//var $injector = angular.injector( [ 'espresso.browser' ] );
		//var Settings = $injector.get( 'Settings' );
		//var Dimensions = $injector.get( 'Dimensions' );
		espresso.layout.resizeTable = function() {
			$('.childrenGrid').trigger('resize');
			var parentHeight = $('#childTabs').outerHeight();
			var tabsHeight = $('#childTabs').find('.ui-widget-header').outerHeight();
			var newHeight = (parentHeight - tabsHeight) - 5;
			$('#childTabs').find(".tab-content").height(newHeight);
			var headerHeight = $('#childTabs').find('.ngTopPanel').outerHeight();
			$('#childTabs').find("div.ngViewport.ng-scope").height(newHeight - headerHeight);
			
			//save local screen position settings
			if( Dimensions.initState ){
				Dimensions.setDimensions( Settings.getDimensions() );
			} else {
				Settings.setDimensions( Dimensions.getDimensions() );
			}
			Dimensions.initState = false;
		};
		
		layouts['right'] = espresso.rightLayout = $('#rightSide').layout({
			name: 'rightLayout',
			resizeWhileDragging: false,
			sizable: true,
			animatePaneSizing: false,
			resizerDblClickToggle: false,
			fxSpeed: 'slow',
			north: {
				paneSelector: '.rightLayout-north',
				closable: true,
				resizable: true,
				spacing_open: 8,
				size: '50%',
				resizerDblClickToggle: false,
				spacing_closed: 8,
				onresize: espresso.triggerGlobalResize,
				togglerLength_closed: 105,
				togglerLength_open: 105,
//				togglerContent_closed: toggleButtons,
//				togglerContent_open: toggleButtons,
			},
			center: {
				paneSelector: '.rightLayout-center',
				resizerDblClickToggle: false,
				closable: true,
				resizable: true,
				onresize: espresso.triggerGlobalResize,
//				size: 240,
//				spacing_open: 12,
//				spacing_closed: 12,
//				togglerLength_closed: 105,
//				togglerLength_open: 105,
//				togglerContent_closed: toggleButtons,
//				togglerContent_open: toggleButtons,
//				onresize_end: espresso.layout.resizeTable
			}
		});
		
		layouts['child'] = espresso.childrenLayout = $('#childCollections').layout({
			name: 'childrenLayout',
			resizerDblClickToggle: false,
			resizeWhileDragging: false,
			sizable: true,
			center: {
				paneSelector: '.childrenLayout-center',
				closable:true,
				onresize: espresso.triggerGlobalResize,
				sizable:true
			},
			south: {
				paneSelector: '.childrenLayout-south',
				size: $('#childFooter').outerHeight(true) + 4,
				sizable: false,
				resizerDblClickToggle: false,
				onresize: espresso.triggerGlobalResize,
				spacing_open: 0,
				spacing_closed: 0
			}
		});

		// customize the west-toggler events
		espresso.topLayout.togglers.west
			// UN-BIND DEFAULT TOGGLER FUNCTIONALITY
			.unbind("click")
			// BIND CUSTOM WEST METHODS
			.find(".btnCenter").click( maximizeCenter ).attr("title", "Maximize right").end()
			.find(".btnWest").click( maximizeWest ).attr("title", "Maximize left").end()
			.find(".btnBoth").click( equalizePanes ).attr("title", "Reset to middle").end()
		;
	};
	espresso.triggerGlobalResize = function triggerGlobalResize() {
		$('#leftGridContainer').trigger('resize');
		var $root = angular.element('body').scope().$root;
		$root.$apply();
	};
	// Initial resize
//	setTimeout(espresso.layout.resizeTable, 500);
	
	$('body').trigger('childTabsCreated');

	////////////////////////////////////
	// Test
//	$('#leftGridContainer').resize(function(data) {
//		console.log('Resize on leftGridContainer');
//	});
//	
//	var top = $('#searchCriteriaDiv').position().top + $('#searchCriteriaDiv').outerHeight(true);
//	var bottom = $('#leftGridFooter').position().top;
//	$('#leftGridContainer').css({top: top, height: bottom - top});
});

// CUSTOM WEST METHODS
function maximizeCenter	(evt) { espresso.topLayout.close("west"); evt.stopPropagation(); }
function maximizeWest	(evt) { espresso.topLayout.sizePane("west", "100%"); espresso.topLayout.open("west"); evt.stopPropagation(); }
function equalizePanes	(evt) { espresso.topLayout.sizePane("west",  "50%"); espresso.topLayout.open("west"); evt.stopPropagation(); }

// GENERIC HELPER FUNCTION
function sizePane (pane, size) {
	espresso.topLayout.sizePane(pane, size);
	espresso.topLayout.open(pane); // open pane if not already
}

/////////////////////////////////////////////////////////////////////////////

// Generalized function to fetch data from the server
// This is used to get data outside of AngularJS.
espresso.fetchData = function(url, params, doneFunction) {
	//var statusId = kahuna.startFetch();
    $.ajaxSetup({
    	contentType: "application/json"
    });

	if (url.substring(0, 4) != 'http')
		url = espresso.baseUrl + url;
	jQuery.support.cors = true;
	$.ajax({
		type: 'GET',
		url: url,
		headers: {"Authorization": "Espresso " + espresso.globals.apiKeyValue + ":1"},
		data: params,
		dataType: "json",
		async: true,
		error: function(jqXHR, textStatus, errorThrown) {
			//kahuna.endFetch(statusId);
			if (jqXHR && jqXHR.responseText) {
				errorThrown = jqXHR.responseText;
				if (errorThrown.substring(0, 1) == "{") {
					try {
						errorThrown = JSON.parse(errorThrown).errorMessage;
					}
					catch(e) {
						
					}
				}
			}
			console.log("Ajax error:" + errorThrown);
			alert("Ajax failed:" + errorThrown);
		}
	}).done(function(data){
		//kahuna.endFetch(statusId);
		if (doneFunction)
			doneFunction(data);
	});
};

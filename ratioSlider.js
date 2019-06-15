(function($){

	var defaults = {

		// GENERAL
		mode: 'default',
		slideSelector: '',
    	infiniteLoop: true,
	    startSlide: 0,
	    preloadImages: 'all',
	    slideMargin: 12,
    	hideControlOnEnd: false,
		speed: 500,
		easing: null,
		wrapperClass: 'jubal-wrapper',

	    // TOUCH

	    // ACCESSIBILITY
	    ariaLive: true,
	    ariaHidden: true,

	    // KEYBOARD

	    // PAGER
	    pager: true,
	    pagerType: 'full',
	    pagerShortSeparator: ' / ',
	    pagerSelector: null,
	    buildPager: null,
	    pagerCustom: null,

	    // CONTROLS
	    controls: true,
	    nextText: 'Next',
	    prevText: 'Prev',
	    nextSelector: null,
	    prevSelector: null,

	    // AUTO
	    auto: true,
	    pause: 4000,
	    autoStart: true,
	    autoDirection: 'next',
	    stopAutoOnClick: true,
	    autoHover: false,
	    autoDelay: 0,
	    autoSlideForOnePage: false,

		// CAROUSEL
	    minSlides: 1,
	    maxSlides: 1,
	    slideWidth: 0

	    // CALLBACKS

	}

	$.fn.jubalSlider = function(options) {

	    if (this.length === 0) {
	    	return this;
	    }

	    // support multiple elements
	    if (this.length > 1) {
	      this.each(function() {
	        $(this).jubalSlider(options);
	      });
	      return this;
	    }

	    var jubal = {},
	    el = this,
	    windowWidth = $(window).width(),
	    windowHeight = $(window).height();

	    // Return if slider is already initialized
	    if ($(el).data('jubalSlider')) { return; }

	    /**
	     * ===================================================================================
	     * = PRIVATE FUNCTIONS
	     * ===================================================================================
	     */

	    /**
	     * Initializes namespace settings to be used throughout plugin
	     */

		var init = function() {

			// Return if slider is already initialized
			if ($(el).data('jubalSlider')) { return; }
			// merge user-supplied options with the defaults
			jubal.settings = $.extend({}, defaults, options);
	 		// store the original children
	      	jubal.children = el.children(jubal.settings.slideSelector);
	        // check if actual number of slides is less than minSlides / maxSlides
	        if (jubal.children.length < jubal.settings.minSlides) { jubal.settings.minSlides = jubal.children.length; }
	        if (jubal.children.length < jubal.settings.maxSlides) { jubal.settings.maxSlides = jubal.children.length; }
	        // store active slide information
	      	jubal.active = { index: jubal.settings.startSlide };
		    // store if the slider is in carousel mode (displaying / moving multiple slides)
		    jubal.carousel = jubal.settings.minSlides > 1 || jubal.settings.maxSlides > 1 ? true : false;
	      	// if carousel, force preloadImages = 'all'
	      	if (jubal.carousel) { jubal.settings.preloadImages = 'all'; }
		    // calculate the min / max width thresholds based on min / max number of slides
		    // used to setup and update carousel slides dimensions
		    //jubal.minThreshold = (jubal.settings.minSlides * jubal.settings.slideWidth) + ((jubal.settings.minSlides - 1) * jubal.settings.slideMargin);
		    //jubal.maxThreshold = (jubal.settings.maxSlides * jubal.settings.slideWidth) + ((jubal.settings.maxSlides - 1) * jubal.settings.slideMargin);
		    // store the current state of the slider (if currently animating, working is true)
		    jubal.working = false;
	        // initialize the controls object
	        jubal.controls = {};
	        // initialize an auto interval
	        jubal.interval = null;	   
		    // save original style data
		    el.data('origStyle', el.attr('style'));
		    el.children(jubal.settings.slideSelector).each(function() {
		      $(this).data('origStyle', $(this).attr('style'));
		    });

		    // perform all DOM / CSS modifications
		    setup();
		};

		/**
	    * Performs all DOM and CSS modifications
	    */
	    var setup = function() {

	    	var preloadSelector = jubal.children.eq(jubal.settings.startSlide); // set the default preload selector (visible)
		    
		    // wrap el in a wrapper
		    el.wrap('<div class="' + jubal.settings.wrapperClass + '"><div class="jubal-viewport"></div></div>');
		    // store a namespace reference to .jubal-viewport
		    jubal.viewport = el.parent();
		    // add aria-live if the setting is enabled and ticker mode is disabled
		    if (jubal.settings.ariaLive && !jubal.settings.ticker) {
		      jubal.viewport.attr('aria-live', 'polite');
		    }
		    // add a loading div to display while images are loading
		    jubal.loader = $('<div class="jubal-loading" />');
		    jubal.viewport.prepend(jubal.loader);
		    // if no easing value was supplied, use the default JS animation easing (swing)
		    jubal.settings.easing = 'swing';
		    // make modifications to the viewport (.jubal-viewport)
		    jubal.viewport.css({
		        width: windowWidth,
		        height: windowHeight,
		        overflow: 'hidden',
		        position: 'relative'
		    });
		    // calculate the ratio of the viewport
			jubal.viewport.ratio = windowWidth/windowHeight;
		    // make modification to the wrapper (.jubal-wrapper)
		    if (!jubal.settings.pager && !jubal.settings.controls) {
		        jubal.viewport.parent().css({
		          margin: '0 auto 0px'
		      });
		    }

		    /* begin mods */
		    // set the stage for the images
	    	el.children().wrapAll('<div class="jubalStage" />');
		    jubal.stage = $('.jubalStage');

		    jubal.stage.css({
		        position: 'relative'
		    });
		    // apply css to all slider children
		    jubal.children.css({
		        listStyle: 'none',
		        position: 'absolute',
		        top: 0,
		        left: 0
		    });
		    // if "fade" mode, add positioning and z-index CSS
		    if (jubal.settings.mode === 'fade') {
		        jubal.children.css({
			        position: 'absolute',
			        zIndex: 0,
			        display: 'none'
		        });
		    }
		    // create an element to contain all slider controls (pager, start / stop, etc)
		    jubal.controls.el = $('<div class="jubal-controls" />');
		    // if captions are requested, add them
		    if (jubal.settings.captions) { appendCaptions(); }
		    // check if startSlide is last slide
		    jubal.active.last = jubal.settings.startSlide === getPagerQty() - 1;
		    // if video is true, set up the fitVids plugin
		    if (jubal.settings.video) { el.fitVids(); }
		    if (jubal.settings.preloadImages === 'all' || jubal.settings.ticker) { preloadSelector = jubal.children; }
		    // only check for control addition if not in "ticker" mode
		    if (!jubal.settings.ticker) {
		        // if controls are requested, add them
		        if (jubal.settings.controls) { appendControls(); }
		        // if auto is true, and auto controls are requested, add them
		        if (jubal.settings.auto && jubal.settings.autoControls) { appendControlsAuto(); }
		        // if pager is requested, add it
		        if (jubal.settings.pager) { appendPager(); }
		        // if any control option is requested, add the controls wrapper
		        if (jubal.settings.controls || jubal.settings.autoControls || jubal.settings.pager) { jubal.viewport.after(jubal.controls.el); }
		    // if ticker mode, do not allow a pager
		    } else {
		        jubal.settings.pager = false;
		    }
		    loadElements(preloadSelector, start);
		};

	    var loadElements = function(selector, callback) {

	    	var count = 0;
	    	var total = selector.length;

		    selector.each(function() {
		        $(this).one('load error', function() {

		          if (++count === total) {callback(); }
		        }).each(function() {
		          if (this.complete) { $(this).trigger('load'); }
		        });
		    });
		};

	    /**
	     * Start the slider
	     */
		var start = function() {
			// if infinite loop, prepare additional slides
			if (jubal.settings.infiniteLoop && jubal.settings.mode !== 'fade') {
				var slice    = jubal.settings.maxSlides,
				sliceAppend  = jubal.children.slice(0, slice).clone(true).addClass('jubal-clone'),
				slicePrepend = jubal.children.slice(-slice).clone(true).addClass('jubal-clone');
				if (jubal.settings.ariaHidden) {
					sliceAppend.attr('aria-hidden', true);
					slicePrepend.attr('aria-hidden', true);
				}
				//jubal.stage.append(sliceAppend).prepend(slicePrepend);
			}

			// store the ratios in each images data attr
	    	getSlideOriginalRatios();
		    //now that images have loaded get data and set css to images
		    jubal.children.each(function(){
		    	// set the object's data property 'nextSlidePos'
		    	$(this).data('nextSlidePos', getNextSlidePos($(this)));
		    	// apply the calculated width (images should be loaded now)
		    	$(this).css({
		    		width: getSlideWidth($(this)),
		    		height: getSlideHeight($(this)),
		    		top: getPositionTop($(this)),
		    		left: getPositionLeft($(this))
		    	});
		    });
		    // remove the loading DOM element
      		jubal.loader.remove();
			// slider has been fully initialized
			jubal.initialized = true;
			// if auto is true and has more than 1 page, start the show
			if (jubal.settings.auto && jubal.settings.autoStart && (getPagerQty() > 1 || jubal.settings.autoSlideForOnePage)) { initAuto(); }
		}

	    var getSlideOriginalRatios = function() {
	    	jubal.children.each(function(){
	    		var tempImg = new Image();
				tempImg.src = $(this).attr('src');
				$(this).data('ratio', tempImg.width/tempImg.height);
			});
	    }

	    /**
	     * Returns either "right" or "bottom" as the next slide's position
	     */
	    var getNextSlidePos = function(obj) {
	    	if((obj.data('ratio') < jubal.viewport.ratio) ){
	    		return 'right';
	    	}else{
	    		return 'bottom';
	    	}
	    };

	    /**
	     * Returns the calculated position to be applied to each slide
	     */
	    var getPositionTop = function(obj) {
	    	if (obj.index() === 0){
	    		return 0;
	    	}
	    	if(obj.prev().data('nextSlidePos')==='right'){
	    		return obj.prev().position().top;
	    	} else {
	    		return obj.prev().position().top + obj.prev().height() + jubal.settings.slideMargin;
	    	}
	    };

	    /**
	     * Returns the calculated position to be applied to each slide
	     */
	    var getPositionLeft = function(obj) {
	    	if (obj.index() === 0){
	    		return 0;
	    	}
	    	if(obj.prev().data('nextSlidePos')==='right'){
	    		return obj.prev().position().left + obj.prev().width() + jubal.settings.slideMargin;
	    	} else {
	    		return obj.prev().position().left;
	    	}
	    };

	    /**
	     * Returns the calculated width to be applied to each slide
	     */
	    var getSlideWidth = function(obj) {
	    	if((obj.data('ratio') < jubal.viewport.ratio) ){
	    		return 'initial';
	    	}else{
	    		return windowWidth;
	    	}
	    };

	    /**
	     * Returns the calculated height to be applied to each slide
	     */
	    var getSlideHeight = function(obj) {
	    	if(obj.data('ratio') < jubal.viewport.ratio ){
	    		return windowHeight;
	    	}else{
	    		return 'initial';
	    	}
	    };

		/**
		 * Returns the number of slides currently visible in the viewport (includes partially visible slides)
		 */
		var getNumberSlidesShowing = function() {
			var slidesShowing = 1;


			//obviously something goes here


			return slidesShowing;
		};

		/**
		* Returns the number of pages (one full viewport of slides is one "page")
		*/
		var getPagerQty = function() {
				return jubal.children.length;
		};

	    /**
	     * Returns the number of individual slides by which to shift the slider
	     */
	    var getMoveBy = function() {
			// if moveSlides was set by the user and moveSlides is less than number of slides showing
			if (jubal.settings.moveSlides > 0) {
				return jubal.settings.moveSlides;
			}
			// if moveSlides is 0 (auto)
			return 1;
	    };

	    /**
	     * Sets the el's animating property position (which in turn will sometimes animate el).
	     * If using CSS, sets the transform property. If not using CSS, sets the top / left property.
	     *
	     * @param value (int)
	     *  - the animating property's value
	     *
	     * @param type (string) 'slide', 'reset', 'ticker'
	     *  - the type of instance for which the function is being
	     *
	     * @param duration (int)
	     *  - the amount of time (in ms) the transition should occupy
	     *
	     * @param params (array) optional
	     *  - an optional parameter containing any variables that need to be passed in
	     */
	    var setPositionProperty = function(value, type, duration, params) {
	        animateObj = {};
	        animateObj[jubal.animProp] = value;
	        
			// use JS animate
			if (type === 'slide') {
				jubal.viewport.animate(animateObj, duration, jubal.settings.easing, function() {
					updateAfterSlideTransition();
				});
			} else if (type === 'reset') {
			  el.css(jubal.animProp, value);
			}
	    };

	    /**
	     * Populates the pager with proper amount of pages
	     */
	    var populatePager = function() {
			return true;
	    };

	    /**
	     * Appends the pager to the controls element
	     */
	    var appendPager = function() {
			return true;
	    };

	    /**
	     * Appends prev / next controls to the controls element
	     */
	    var appendControls = function() {
	    	jubal.controls.next = $('<a class="jubal-next" href="">' + jubal.settings.nextText + '</a>');
      		jubal.controls.prev = $('<a class="jubal-prev" href="">' + jubal.settings.prevText + '</a>');
			// bind click actions to the controls
			jubal.controls.next.bind('click touchend', clickNextBind);
			jubal.controls.prev.bind('click touchend', clickPrevBind);
			// if nextSelector was supplied, populate it
			if (jubal.settings.nextSelector) {
				$(jubal.settings.nextSelector).append(jubal.controls.next);
			}
			// if prevSelector was supplied, populate it
			if (jubal.settings.prevSelector) {
				$(jubal.settings.prevSelector).append(jubal.controls.prev);
			}
			// if no custom selectors were supplied
			if (!jubal.settings.nextSelector && !jubal.settings.prevSelector) {
				// add the controls to the DOM
				jubal.controls.directionEl = $('<div class="bx-controls-direction" />');
				// add the control elements to the directionEl
				jubal.controls.directionEl.append(jubal.controls.prev).append(jubal.controls.next);
				// slider.viewport.append(slider.controls.directionEl);
				jubal.controls.el.addClass('bx-has-controls-direction').append(jubal.controls.directionEl);
			}
	    };

	    /**
	     * Click next binding
	     *
	     * @param e (event)
	     *  - DOM event object
	     */
	    var clickNextBind = function(e) {
			e.preventDefault();
			if (jubal.controls.el.hasClass('disabled')) { return; }
			// if auto show is running, stop it
			if (jubal.settings.auto && jubal.settings.stopAutoOnClick) { el.stopAuto(); }
			el.goToNextSlide();
	    };

	    /**
	     * Click prev binding
	     *
	     * @param e (event)
	     *  - DOM event object
	     */
	    var clickPrevBind = function(e) {
			e.preventDefault();
			if (jubal.controls.el.hasClass('disabled')) { return; }
			// if auto show is running, stop it
			if (jubal.settings.auto && jubal.settings.stopAutoOnClick) { el.stopAuto(); }
			el.goToPrevSlide();
	    };


		/**
		 * Performs needed actions after a slide transition
		 */
		var updateAfterSlideTransition = function() {
			// if infinite loop is true
			if (jubal.settings.infiniteLoop) {
				var position = '';
				// first slide
				if (jubal.active.index === 0) {
					// set the new position
					position = jubal.children.eq(0).position();
				// last slide
				} else if (jubal.active.index === getPagerQty() - 1) {
					position = jubal.children.eq(getPagerQty() - 1).position();
				}
			}
			// declare that the transition is complete
			jubal.working = false;
		};

	    /**
	     * Updates the direction controls (checks if either should be hidden)
	     */
	    var updateDirectionControls = function() {

			if (!jubal.settings.infiniteLoop && jubal.settings.hideControlOnEnd) {
				// if first slide
				if (jubal.active.index === 0) {
					jubal.controls.prev.addClass('disabled');
					jubal.controls.next.removeClass('disabled');
				// if last slide
				} else if (jubal.active.index === getPagerQty()) {
					jubal.controls.next.addClass('disabled');
					jubal.controls.prev.removeClass('disabled');
				// if any slide in the middle
				} else {
					jubal.controls.prev.removeClass('disabled');
					jubal.controls.next.removeClass('disabled');
				}
			}
	    };

		/**
		 * Initializes the auto process
		 */
		var initAuto = function() {
			console.log('initAuto');
			// if autoDelay was supplied, launch the auto show using a setTimeout() call
			if (jubal.settings.autoDelay > 0) {
				var timeout = setTimeout(el.startAuto, jubal.settings.autoDelay);
				// if autoDelay was not supplied, start the auto show normally
			} else {
				el.startAuto();
				//add focus and blur events to ensure its running if timeout gets paused
				$(window).focus(function() {
					el.startAuto();
				}).blur(function() {
					el.stopAuto();
				});
			}
			// if autoHover is requested
			if (jubal.settings.autoHover) {
				// on el hover
				el.hover(function() {
					// if the auto show is currently playing (has an active interval)
					if (jubal.interval) {
						// stop the auto show and pass true argument which will prevent control update
						el.stopAuto(true);
						// create a new autoPaused value which will be used by the relative "mouseout" event
						jubal.autoPaused = true;
					}
				}, function() {
					// if the autoPaused value was created be the prior "mouseover" event
					if (jubal.autoPaused) {
						// start the auto show and pass true argument which will prevent control update
						el.startAuto(true);
						// reset the autoPaused value
						jubal.autoPaused = null;
					}
				});
			}
		};

		/**
		* Adds an aria-hidden=true attribute to each element
		*
		* @param startVisibleIndex (int)
		*  - the first visible element's index
		*/
		var applyAriaHiddenAttributes = function(startVisibleIndex) {
			var numberOfSlidesShowing = getNumberSlidesShowing();
			// only apply attributes if the setting is enabled and not in ticker mode
			if (jubal.settings.ariaHidden && !jubal.settings.ticker) {
				// add aria-hidden=true to all elements
				jubal.children.attr('aria-hidden', 'true');
				// get the visible elements and change to aria-hidden=false
				jubal.children.slice(startVisibleIndex, startVisibleIndex + numberOfSlidesShowing).attr('aria-hidden', 'false');
			}
		};

	    /**
	     * Returns index according to present page range
	     *
	     * @param slideOndex (int)
	     *  - the desired slide index
	     */
	    var setSlideIndex = function(slideIndex) {
	        if (slideIndex < 0) {
		    	return jubal.active.index;
		    // set active index to requested slide
		    } else {
		    	return slideIndex;
		    }
	    };

	    /**
	     * ===================================================================================
	     * = PUBLIC FUNCTIONS
	     * ===================================================================================
	     */

	    /**
	     * Performs slide transition to the specified slide
	     *
	     * @param slideIndex (int)
	     *  - the destination slide's index (zero-based)
	     *
	     * @param direction (string)
	     *  - INTERNAL USE ONLY - the direction of travel ("prev" / "next")
	     */
	    el.goToSlide = function(slideIndex, direction) {
			// onSlideBefore, onSlideNext, onSlidePrev callbacks
			// Allow transition canceling based on returned value
			var performTransition = true,
			moveBy = 0,
			position = {left: 0, top: 0},
			lastChild = null,
			lastShowingIndex, eq, value, requestEl, prevDirection;
			// if plugin is currently in motion, ignore request
			if (jubal.working || jubal.active.index === jubal.oldIndex) { console.log(jubal.working); return; }
			// store the old index
			jubal.oldIndex = jubal.active.index;
			//set new index
			jubal.active.index = setSlideIndex(slideIndex);
			// declare that plugin is in motion
			console.log('stepping');
			jubal.working = true;
			/* handling callbacks - commented for now because not handleing 

			performTransition = jubal.settings.onSlideBefore.call(el, slider.children.eq(slider.active.index), slider.oldIndex, slider.active.index);

			// If transitions canceled, reset and return
			if (typeof (performTransition) !== 'undefined' && !performTransition) {
			slider.active.index = slider.oldIndex; // restore old index
			slider.working = false; // is not in motion
			return;
			}

			if (direction === 'next') {
			// Prevent canceling in future functions or lack there-of from negating previous commands to cancel
			if (!slider.settings.onSlideNext.call(el, slider.children.eq(slider.active.index), slider.oldIndex, slider.active.index)) {
			  performTransition = false;
			}
			} else if (direction === 'prev') {
			// Prevent canceling in future functions or lack there-of from negating previous commands to cancel
			if (!slider.settings.onSlidePrev.call(el, slider.children.eq(slider.active.index), slider.oldIndex, slider.active.index)) {
			  performTransition = false;
			}
			}
			*/

			// check if last slide
			jubal.active.last = jubal.active.index >= getPagerQty() - 1;
			// // check for direction control update
			if (jubal.settings.controls) { updateDirectionControls(); }

				/* animation starts here */

			// if slider is set to mode: "fade"
			if (jubal.settings.mode === 'fade') {

				// fade out the visible child and reset its z-index value
				jubal.children.filter(':visible').fadeOut(jubal.settings.speed).css({zIndex: 0});
				// fade in the newly requested slide
				jubal.children.eq(jubal.active.index).css('zIndex', jubal.settings.slideZIndex + 1).fadeIn(jubal.settings.speed, function() {
				  $(this).css('zIndex', jubal.settings.slideZIndex);
				  updateAfterSlideTransition();
				});
			// slider mode is not "fade"
			} else {
				// if carousel and not infinite loop
				if (!jubal.settings.infiniteLoop && jubal.carousel && jubal.active.last) {
					// currently not supported
				// horizontal carousel, going previous while on first slide (infiniteLoop mode)
				} else if (jubal.carousel && jubal.active.last && direction === 'prev') {
					// get the last child position
					eq = jubal.settings.moveSlides === 1 ? jubal.settings.maxSlides - getMoveBy() : ((getPagerQty() - 1) * getMoveBy()) - (jubal.children.length - jubal.settings.maxSlides);
					lastChild = el.children('.bx-clone').eq(eq);
					position = lastChild.position();
				// if infinite loop and "Next" is clicked on the last slide
				} else if (direction === 'next' && jubal.active.index === 0) {
					// get the last clone position
					position = el.find('> .bx-clone').eq(jubal.settings.maxSlides).position();
					jubal.active.last = false;
        		// normal non-zero requests
				} else if (slideIndex >= 0) {
					console.log(jubal.active.last);
					prevDirection = direction === 'prev' ? jubal.children.eq(jubal.oldIndex -1).data('nextSlidePos') : jubal.children.eq(jubal.oldIndex).data('nextSlidePos');
				 	console.log(prevDirection);
				 	if(prevDirection === 'right'){
				 		jubal.animProp = 'scrollLeft';
				 		position = jubal.children.eq(jubal.active.index).position().left;
				 	}else{
				 		jubal.animProp = 'scrollTop';
				 		position = jubal.children.eq(jubal.active.index).position().top;
				 	}
				}
				/* If the position doesn't exist
				 * (e.g. if you destroy the slider on a next click),
				 * it doesn't throw an error.
				 */
				if (typeof (position) !== 'undefined') {
				  // plugin values to be animated
				  setPositionProperty(position, 'slide', jubal.settings.speed);
				} else {
				  jubal.working = false;
				}
			}
			if (jubal.settings.ariaHidden) { applyAriaHiddenAttributes(jubal.active.index * getMoveBy()); }
	    };

	    /**
	     * Transitions to the next slide in the show
	     */
	    el.goToNextSlide = function() {
			// if infiniteLoop is false and last page is showing, disregard call
			if (!jubal.settings.infiniteLoop && jubal.active.last) { return; }
			var pagerIndex = parseInt(jubal.active.index) + 1;
			el.goToSlide(pagerIndex, 'next');
	    };

	    /**
	     * Transitions to the prev slide in the show
	     */
	    el.goToPrevSlide = function() {
			// if infiniteLoop is false and last page is showing, disregard call
			if (!jubal.settings.infiniteLoop && jubal.active.index === 0) { return; }
			var pagerIndex = parseInt(jubal.active.index) - 1;
			el.goToSlide(pagerIndex, 'prev');
	    };

		/**
		 * Starts the auto show
		 *
		 * @param preventControlUpdate (boolean)
		 *  - if true, auto controls state will not be updated
		 */
		el.startAuto = function(preventControlUpdate) {
			// if an interval already exists, disregard call
			if (jubal.interval) { return; }
			// create an interval
			jubal.interval = setInterval(function() {
				if (jubal.settings.autoDirection === 'next') {
					el.goToNextSlide();
				} else {
					el.goToPrevSlide();
				}
			}, jubal.settings.pause);
			// if auto controls are displayed and preventControlUpdate is not true
			if (jubal.settings.autoControls && preventControlUpdate !== true) { updateAutoControls('stop'); }
		};

		/**
		 * Stops the auto show
		 *
		 * @param preventControlUpdate (boolean)
		 *  - if true, auto controls state will not be updated
		 */
		el.stopAuto = function(preventControlUpdate) {
			// if no interval exists, disregard call
			if (!jubal.interval) { return; }
			// clear the interval
			clearInterval(jubal.interval);
			jubal.interval = null;
			// if auto controls are displayed and preventControlUpdate is not true
			if (jubal.settings.autoControls && preventControlUpdate !== true) { updateAutoControls('start'); }
		};

		init();

		$(el).data('jubalSlider', this);

		return this;

		};


})(jQuery);;
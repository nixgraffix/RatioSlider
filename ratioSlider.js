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
		wrapperClass: 'ratioSlider-wrapper',

	    // ACCESSIBILITY
	    ariaLive: true,
	    ariaHidden: true,

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

	}

	$.fn.ratioSlider = function(options) {

	    if (this.length === 0) {
	    	return this;
	    }

	    // support multiple elements
	    if (this.length > 1) {
	      this.each(function() {
	        $(this).ratioSlider(options);
	      });
	      return this;
	    }

	    var rslider = {},
	    el = this,
	    parentWidth = el.width(),
	    parentHeight = el.height();

	    // Return if slider is already initialized
	    if ($(el).data('ratioSlider')) { return; }

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
			if ($(el).data('ratioSlider')) { return; }
			// merge user-supplied options with the defaults
			rslider.settings = $.extend({}, defaults, options);
	 		// store the original children
	      	rslider.children = el.children(rslider.settings.slideSelector);
	        // check if actual number of slides is less than minSlides / maxSlides
	        if (rslider.children.length < rslider.settings.minSlides) { rslider.settings.minSlides = rslider.children.length; }
	        if (rslider.children.length < rslider.settings.maxSlides) { rslider.settings.maxSlides = rslider.children.length; }
	        // store active slide information
	      	rslider.active = { index: rslider.settings.startSlide };
		    // store if the slider is in carousel mode (displaying / moving multiple slides)
		    rslider.carousel = rslider.settings.minSlides > 1 || rslider.settings.maxSlides > 1 ? true : false;
	      	// if carousel, force preloadImages = 'all'
	      	if (rslider.carousel) { rslider.settings.preloadImages = 'all'; }
		    // calculate the min / max width thresholds based on min / max number of slides
		    // used to setup and update carousel slides dimensions
		    //rslider.minThreshold = (rslider.settings.minSlides * rslider.settings.slideWidth) + ((rslider.settings.minSlides - 1) * rslider.settings.slideMargin);
		    //rslider.maxThreshold = (rslider.settings.maxSlides * rslider.settings.slideWidth) + ((rslider.settings.maxSlides - 1) * rslider.settings.slideMargin);
		    // store the current state of the slider (if currently animating, working is true)
		    rslider.working = false;
	        // initialize the controls object
	        rslider.controls = {};
	        // initialize an auto interval
	        rslider.interval = null;	   
		    // save original style data
		    el.data('origStyle', el.attr('style'));
		    el.children(rslider.settings.slideSelector).each(function() {
		      $(this).data('origStyle', $(this).attr('style'));
		    });

		    // perform all DOM / CSS modifications
		    setup();
		};

		/**
	    * Performs all DOM and CSS modifications
	    */
	    var setup = function() {

	    	var preloadSelector = rslider.children.eq(rslider.settings.startSlide); // set the default preload selector (visible)
		    
		    // wrap el in a wrapper
		    el.wrap('<div class="' + rslider.settings.wrapperClass + '"><div class="rslider-viewport"></div></div>');
		    // store a namespace reference to .rslider-viewport
		    rslider.viewport = el.parent();
		    // add aria-live if the setting is enabled and ticker mode is disabled
		    if (rslider.settings.ariaLive && !rslider.settings.ticker) {
		      rslider.viewport.attr('aria-live', 'polite');
		    }
		    // add a loading div to display while images are loading
		    rslider.loader = $('<div class="rslider-loading" />');
		    rslider.viewport.prepend(rslider.loader);
		    // if no easing value was supplied, use the default JS animation easing (swing)
		    rslider.settings.easing = 'swing';
		    // make modifications to the viewport (.rslider-viewport)
		    rslider.viewport.css({
		        width: parentWidth,
		        height: parentHeight,
		        overflow: 'hidden',
		        position: 'relative'
		    });
		    // calculate the ratio of the viewport
			rslider.viewport.ratio = parentWidth/parentHeight;
		    // make modification to the wrapper (.rslider-wrapper)
		    if (!rslider.settings.pager && !rslider.settings.controls) {
		        rslider.viewport.parent().css({
		          margin: '0 auto 0px'
		      });
		    }

		    /* begin mods */
		    // set the stage for the images
	    	el.children().wrapAll('<div class="rsliderStage" />');
		    rslider.stage = $('.rsliderStage');

		    rslider.stage.css({
		        position: 'relative'
		    });
		    // apply css to all slider children
		    rslider.children.css({
		        listStyle: 'none',
		        position: 'absolute',
		        top: 0,
		        left: 0
		    });
		    // if "fade" mode, add positioning and z-index CSS
		    if (rslider.settings.mode === 'fade') {
		        rslider.children.css({
			        position: 'absolute',
			        zIndex: 0,
			        display: 'none'
		        });
		    }
		    // create an element to contain all slider controls (pager, start / stop, etc)
		    rslider.controls.el = $('<div class="rslider-controls" />');
		    // if captions are requested, add them
		    if (rslider.settings.captions) { appendCaptions(); }
		    // check if startSlide is last slide
		    rslider.active.last = rslider.settings.startSlide === getPagerQty() - 1;
		    // if video is true, set up the fitVids plugin
		    if (rslider.settings.video) { el.fitVids(); }
		    if (rslider.settings.preloadImages === 'all' || rslider.settings.ticker) { preloadSelector = rslider.children; }
		    // only check for control addition if not in "ticker" mode
		    if (!rslider.settings.ticker) {
		        // if controls are requested, add them
		        if (rslider.settings.controls) { appendControls(); }
		        // if auto is true, and auto controls are requested, add them
		        if (rslider.settings.auto && rslider.settings.autoControls) { appendControlsAuto(); }
		        // if pager is requested, add it
		        if (rslider.settings.pager) { appendPager(); }
		        // if any control option is requested, add the controls wrapper
		        if (rslider.settings.controls || rslider.settings.autoControls || rslider.settings.pager) { rslider.viewport.after(rslider.controls.el); }
		    // if ticker mode, do not allow a pager
		    } else {
		        rslider.settings.pager = false;
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
			if (rslider.settings.infiniteLoop && rslider.settings.mode !== 'fade') {
				var slice    = rslider.settings.maxSlides,
				sliceAppend  = rslider.children.slice(0, slice).clone(true).addClass('rslider-clone'),
				slicePrepend = rslider.children.slice(-slice).clone(true).addClass('rslider-clone');
				if (rslider.settings.ariaHidden) {
					sliceAppend.attr('aria-hidden', true);
					slicePrepend.attr('aria-hidden', true);
				}
				//rslider.stage.append(sliceAppend).prepend(slicePrepend);
			}

			// store the ratios in each images data attr
	    	getSlideOriginalRatios();
		    //now that images have loaded get data and set css to images
		    rslider.children.each(function(){
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
      		rslider.loader.remove();
			// slider has been fully initialized
			rslider.initialized = true;
			// if auto is true and has more than 1 page, start the show
			if (rslider.settings.auto && rslider.settings.autoStart && (getPagerQty() > 1 || rslider.settings.autoSlideForOnePage)) { initAuto(); }
		}

	    var getSlideOriginalRatios = function() {
	    	rslider.children.each(function(){
	    		var tempImg = new Image();
				tempImg.src = $(this).attr('src');
				$(this).data('ratio', tempImg.width/tempImg.height);
			});
	    }

	    /**
	     * Returns either "right" or "bottom" as the next slide's position
	     */
	    var getNextSlidePos = function(obj) {
	    	if((obj.data('ratio') < rslider.viewport.ratio) ){
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
	    		return obj.prev().position().top + obj.prev().height() + rslider.settings.slideMargin;
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
	    		return obj.prev().position().left + obj.prev().width() + rslider.settings.slideMargin;
	    	} else {
	    		return obj.prev().position().left;
	    	}
	    };

	    /**
	     * Returns the calculated width to be applied to each slide
	     */
	    var getSlideWidth = function(obj) {
	    	if((obj.data('ratio') < rslider.viewport.ratio) ){
	    		return 'initial';
	    	}else{
	    		return parentWidth;
	    	}
	    };

	    /**
	     * Returns the calculated height to be applied to each slide
	     */
	    var getSlideHeight = function(obj) {
	    	if(obj.data('ratio') < rslider.viewport.ratio ){
	    		return parentHeight;
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
				return rslider.children.length;
		};

	    /**
	     * Returns the number of individual slides by which to shift the slider
	     */
	    var getMoveBy = function() {
			// if moveSlides was set by the user and moveSlides is less than number of slides showing
			if (rslider.settings.moveSlides > 0) {
				return rslider.settings.moveSlides;
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
	        animateObj[rslider.animProp] = value;
	        
			// use JS animate
			if (type === 'slide') {
				rslider.viewport.animate(animateObj, duration, rslider.settings.easing, function() {
					updateAfterSlideTransition();
				});
			} else if (type === 'reset') {
			  el.css(rslider.animProp, value);
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
	    	rslider.controls.next = $('<a class="rslider-next" href="">' + rslider.settings.nextText + '</a>');
      		rslider.controls.prev = $('<a class="rslider-prev" href="">' + rslider.settings.prevText + '</a>');
			// bind click actions to the controls
			rslider.controls.next.bind('click touchend', clickNextBind);
			rslider.controls.prev.bind('click touchend', clickPrevBind);
			// if nextSelector was supplied, populate it
			if (rslider.settings.nextSelector) {
				$(rslider.settings.nextSelector).append(rslider.controls.next);
			}
			// if prevSelector was supplied, populate it
			if (rslider.settings.prevSelector) {
				$(rslider.settings.prevSelector).append(rslider.controls.prev);
			}
			// if no custom selectors were supplied
			if (!rslider.settings.nextSelector && !rslider.settings.prevSelector) {
				// add the controls to the DOM
				rslider.controls.directionEl = $('<div class="bx-controls-direction" />');
				// add the control elements to the directionEl
				rslider.controls.directionEl.append(rslider.controls.prev).append(rslider.controls.next);
				// slider.viewport.append(slider.controls.directionEl);
				rslider.controls.el.addClass('bx-has-controls-direction').append(rslider.controls.directionEl);
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
			if (rslider.controls.el.hasClass('disabled')) { return; }
			// if auto show is running, stop it
			if (rslider.settings.auto && rslider.settings.stopAutoOnClick) { el.stopAuto(); }
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
			if (rslider.controls.el.hasClass('disabled')) { return; }
			// if auto show is running, stop it
			if (rslider.settings.auto && rslider.settings.stopAutoOnClick) { el.stopAuto(); }
			el.goToPrevSlide();
	    };


		/**
		 * Performs needed actions after a slide transition
		 */
		var updateAfterSlideTransition = function() {
			// if infinite loop is true
			if (rslider.settings.infiniteLoop) {
				var position = '';
				// first slide
				if (rslider.active.index === 0) {
					// set the new position
					position = rslider.children.eq(0).position();
				// last slide
				} else if (rslider.active.index === getPagerQty() - 1) {
					position = rslider.children.eq(getPagerQty() - 1).position();
				}
			}
			// declare that the transition is complete
			rslider.working = false;
		};

	    /**
	     * Updates the direction controls (checks if either should be hidden)
	     */
	    var updateDirectionControls = function() {

			if (!rslider.settings.infiniteLoop && rslider.settings.hideControlOnEnd) {
				// if first slide
				if (rslider.active.index === 0) {
					rslider.controls.prev.addClass('disabled');
					rslider.controls.next.removeClass('disabled');
				// if last slide
				} else if (rslider.active.index === getPagerQty()) {
					rslider.controls.next.addClass('disabled');
					rslider.controls.prev.removeClass('disabled');
				// if any slide in the middle
				} else {
					rslider.controls.prev.removeClass('disabled');
					rslider.controls.next.removeClass('disabled');
				}
			}
	    };

		/**
		 * Initializes the auto process
		 */
		var initAuto = function() {
			console.log('initAuto');
			// if autoDelay was supplied, launch the auto show using a setTimeout() call
			if (rslider.settings.autoDelay > 0) {
				var timeout = setTimeout(el.startAuto, rslider.settings.autoDelay);
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
			if (rslider.settings.autoHover) {
				// on el hover
				el.hover(function() {
					// if the auto show is currently playing (has an active interval)
					if (rslider.interval) {
						// stop the auto show and pass true argument which will prevent control update
						el.stopAuto(true);
						// create a new autoPaused value which will be used by the relative "mouseout" event
						rslider.autoPaused = true;
					}
				}, function() {
					// if the autoPaused value was created be the prior "mouseover" event
					if (rslider.autoPaused) {
						// start the auto show and pass true argument which will prevent control update
						el.startAuto(true);
						// reset the autoPaused value
						rslider.autoPaused = null;
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
			if (rslider.settings.ariaHidden && !rslider.settings.ticker) {
				// add aria-hidden=true to all elements
				rslider.children.attr('aria-hidden', 'true');
				// get the visible elements and change to aria-hidden=false
				rslider.children.slice(startVisibleIndex, startVisibleIndex + numberOfSlidesShowing).attr('aria-hidden', 'false');
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
		    	return rslider.active.index;
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
			if (rslider.working || rslider.active.index === rslider.oldIndex) { console.log(rslider.working); return; }
			// store the old index
			rslider.oldIndex = rslider.active.index;
			//set new index
			rslider.active.index = setSlideIndex(slideIndex);
			// declare that plugin is in motion
			console.log('stepping');
			rslider.working = true;
			/* handling callbacks - commented for now because not handleing 

			performTransition = rslider.settings.onSlideBefore.call(el, slider.children.eq(slider.active.index), slider.oldIndex, slider.active.index);

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
			rslider.active.last = rslider.active.index >= getPagerQty() - 1;
			// // check for direction control update
			if (rslider.settings.controls) { updateDirectionControls(); }

				/* animation starts here */

			// if slider is set to mode: "fade"
			if (rslider.settings.mode === 'fade') {

				// fade out the visible child and reset its z-index value
				rslider.children.filter(':visible').fadeOut(rslider.settings.speed).css({zIndex: 0});
				// fade in the newly requested slide
				rslider.children.eq(rslider.active.index).css('zIndex', rslider.settings.slideZIndex + 1).fadeIn(rslider.settings.speed, function() {
				  $(this).css('zIndex', rslider.settings.slideZIndex);
				  updateAfterSlideTransition();
				});
			// slider mode is not "fade"
			} else {
				// if carousel and not infinite loop
				if (!rslider.settings.infiniteLoop && rslider.carousel && rslider.active.last) {
					// currently not supported
				// horizontal carousel, going previous while on first slide (infiniteLoop mode)
				} else if (rslider.carousel && rslider.active.last && direction === 'prev') {
					// get the last child position
					eq = rslider.settings.moveSlides === 1 ? rslider.settings.maxSlides - getMoveBy() : ((getPagerQty() - 1) * getMoveBy()) - (rslider.children.length - rslider.settings.maxSlides);
					lastChild = el.children('.bx-clone').eq(eq);
					position = lastChild.position();
				// if infinite loop and "Next" is clicked on the last slide
				} else if (direction === 'next' && rslider.active.index === 0) {
					// get the last clone position
					position = el.find('> .bx-clone').eq(rslider.settings.maxSlides).position();
					rslider.active.last = false;
        		// normal non-zero requests
				} else if (slideIndex >= 0) {
					console.log(rslider.active.last);
					prevDirection = direction === 'prev' ? rslider.children.eq(rslider.oldIndex -1).data('nextSlidePos') : rslider.children.eq(rslider.oldIndex).data('nextSlidePos');
				 	console.log(prevDirection);
				 	if(prevDirection === 'right'){
				 		rslider.animProp = 'scrollLeft';
				 		position = rslider.children.eq(rslider.active.index).position().left;
				 	}else{
				 		rslider.animProp = 'scrollTop';
				 		position = rslider.children.eq(rslider.active.index).position().top;
				 	}
				}
				/* If the position doesn't exist
				 * (e.g. if you destroy the slider on a next click),
				 * it doesn't throw an error.
				 */
				if (typeof (position) !== 'undefined') {
				  // plugin values to be animated
				  setPositionProperty(position, 'slide', rslider.settings.speed);
				} else {
				  rslider.working = false;
				}
			}
			if (rslider.settings.ariaHidden) { applyAriaHiddenAttributes(rslider.active.index * getMoveBy()); }
	    };

	    /**
	     * Transitions to the next slide in the show
	     */
	    el.goToNextSlide = function() {
			// if infiniteLoop is false and last page is showing, disregard call
			if (!rslider.settings.infiniteLoop && rslider.active.last) { return; }
			var pagerIndex = parseInt(rslider.active.index) + 1;
			el.goToSlide(pagerIndex, 'next');
	    };

	    /**
	     * Transitions to the prev slide in the show
	     */
	    el.goToPrevSlide = function() {
			// if infiniteLoop is false and last page is showing, disregard call
			if (!rslider.settings.infiniteLoop && rslider.active.index === 0) { return; }
			var pagerIndex = parseInt(rslider.active.index) - 1;
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
			if (rslider.interval) { return; }
			// create an interval
			rslider.interval = setInterval(function() {
				if (rslider.settings.autoDirection === 'next') {
					el.goToNextSlide();
				} else {
					el.goToPrevSlide();
				}
			}, rslider.settings.pause);
			// if auto controls are displayed and preventControlUpdate is not true
			if (rslider.settings.autoControls && preventControlUpdate !== true) { updateAutoControls('stop'); }
		};

		/**
		 * Stops the auto show
		 *
		 * @param preventControlUpdate (boolean)
		 *  - if true, auto controls state will not be updated
		 */
		el.stopAuto = function(preventControlUpdate) {
			// if no interval exists, disregard call
			if (!rslider.interval) { return; }
			// clear the interval
			clearInterval(rslider.interval);
			rslider.interval = null;
			// if auto controls are displayed and preventControlUpdate is not true
			if (rslider.settings.autoControls && preventControlUpdate !== true) { updateAutoControls('start'); }
		};

		init();

		$(el).data('ratioSlider', this);

		return this;

		};


})(jQuery);;
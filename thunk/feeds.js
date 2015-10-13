(function Feeds(){
	"use strict";

	var // signal event handler(s)
		item_feed;

	EVT.on("setup-feeds",setupFeeds);


	// ***********************************

	function setupFeeds() {
		// setup fake item feed
		fakeItemFeed(function setupItemFeed(th){
			item_feed = th;
		});

		// setup slow feed (feed 1)
		var slow_feed_toggle;
		setupFeed(
			/*feedID=*/1,
			/*delay=*/2000,
			function setupSlowFeedToggle(th){
				slow_feed_toggle = th;
			}
		);

		// setup fast feed (feed 2)
		var fast_feed_toggle;
		setupFeed(
			/*feedID=*/2,
			/*delay=*/1300,
			function setupFastFeedToggle(th){
				fast_feed_toggle = th;
			}
		);

		// track feed statuses
		var st1 = true, st2 = true;

		// monitor feed statuses
		(function listenToFeedStatus(){
			var fired = false;

			// monitor each status
			slow_feed_toggle(function cb(st){
				if (!fired) {
					st1 = st;
					fired = true;
					monitorFeedStatus(st1,st2);

					// listen again
					setTimeout(listenToFeedStatus,0);
				}
			});
			fast_feed_toggle(function cb(st){
				if (!fired) {
					st2 = st;
					fired = true;
					monitorFeedStatus(st1,st2);

					// listen again
					setTimeout(listenToFeedStatus,0);
				}
			});
		})();

		// setup my feed (duplicate checking)
		setupMyFeed();
	}

	// fake a network stream of data
	function fakeItemFeed(handleThunk) {
		var next = thunkBasedEventHandler(handleThunk);

		// fake a delay
		var intv = setInterval(function timer(){
			// signal a new item
			next( ItemsText.more() );
		},50);
	}

	function setupFeed(feedID,delay,defineThunk) {
		// setup feed thunks
		var feed_is_running = true, tmp, notifyToggle,
			feed_status, feed_toggle,

			PAUSED_FEED = makeThunk(function noop(){}),
			RUNNING_FEED = makeThunk(function run(cb){ cb(); });

		// start with feed running
		feed_status = RUNNING_FEED;

		setupNextFeedToggle();

		fromEvent(
			"status-" + feedID,
			setupFeedToggle
		);

		sampledStream(delay,setupStreamEventHandler);


		// ***********************************

		function setupFeedToggle(th) {
			// distinct consecutive
			th(handleFeedToggle);
		}

		function setupNextFeedToggle() {
			tmp = extractThunkContinuation();
			feed_toggle = tmp[0];
			notifyToggle = tmp[1];
			defineThunk(feed_toggle);
		}

		function handleFeedToggle(st) {
			// resuming feed?
			if (st !== feed_is_running && st === true) {
				feed_is_running = true;
				feed_status = RUNNING_FEED;
			}
			// switching to paused feed
			else {
				feed_is_running = false;
				feed_status = PAUSED_FEED;
			}

			notifyToggle(feed_is_running);

			setupNextFeedToggle();
		}

		function setupStreamEventHandler(th) {
			feed_status(function statusToggled(){
				th(handleItemText);
			});
		}

		function handleItemText(itemText) {
			// feed still running?
			if (feed_is_running) {
				EVT.emit("feed-insertion",feedID,itemText);
			}
		}
	}

	function sampledStream(delay,defineThunk) {
		// throttle feed sampling
		var intv = setInterval(timer,delay);


		// ***********************************

		function timer() {
			var tmp = extractThunkContinuation(),
				th = tmp[0],
				continuation = tmp[1];

			defineThunk(th);

			// signal a new feed item
			item_feed(continuation);
		}
	}

	function monitorFeedStatus(running1,running2) {
		// both feeds paused?
		if (!running1 && !running2) {
			// TODO: pause the item feed
		}
		// keep calm and carry on
		else {
			// TODO: resume the item feed
		}
	}

	function setupMyFeed() {
		var my_feed_text = {};

		fromEvent("item-selection",function setupItemSelection(th){
			th(handleItemSelection);
		});


		// ***********************************

		function handleItemSelection(feedID,itemText,$item) {
			// not a duplicate message?
			if (!(itemText in my_feed_text)) {
				my_feed_text[itemText] = true;

				// signal my-feed insertion
				EVT.emit("my-feed-insertion",feedID,$item);
			}
			else {
				// signal kill (duplicate) item
				EVT.emit("feed-kill",$item);
			}
		}
	}

	function fromEvent(evtName,handleThunk) {
		EVT.on(
			evtName,
			thunkBasedEventHandler(handleThunk)
		);
	}

	function extractThunkContinuation() {
		var continuation,
			th = makeThunk(function op(){
				continuation = arguments[arguments.length-1];
			});

		return [th,continuation];
	}

	function thunkBasedEventHandler(handleThunk) {
		var th, continuation;

		getNextThunk();

		return eventHandler;


		// ***********************************

		function eventHandler() {
			// continue previous thunk
			continuation.apply(null,arguments);

			// get the next thunk ready in case
			// this event fires again
			getNextThunk();
		}

		function getNextThunk() {
			var tmp = extractThunkContinuation();

			th = tmp[0];
			continuation = tmp[1];

			handleThunk(th);
		}
	}

	function makeThunk(fn) {
		var args = [].slice.call(arguments,1), vals, cb;

		args.push(function callback(){
			if (cb) {
				cb.apply(null,arguments);
			}
			else {
				vals = [].slice.call(arguments);
			}
		});

		fn.apply(null,args);
		args = null;

		return function th(callback) {
			if (vals) {
				callback.apply(null,vals);
			}
			else {
				cb = callback;
			}
		}
	}

})();

(function Feeds(){
	"use strict";

	var // signal event handler(s)
		item_feed;

	EVT.on("setup-feeds",setupFeeds);


	// ***********************************

	function setupFeeds() {
		// setup fake item feed
		fakeItemFeed(function setupItemFeed(pr){
			item_feed = pr;
		});

		// setup slow feed (feed 1)
		var slow_feed_toggle;
		setupFeed(
			/*feedID=*/1,
			/*delay=*/2000,
			function setupSlowFeedToggle(pr){
				slow_feed_toggle = pr;
			}
		);

		// setup fast feed (feed 2)
		var fast_feed_toggle;
		setupFeed(
			/*feedID=*/2,
			/*delay=*/1300,
			function setupFastFeedToggle(pr){
				fast_feed_toggle = pr;
			}
		);

		// track feed statuses
		var st1 = true, st2 = true;

		// monitor feed statuses
		var listenToFeedStatus = ASQ.wrap(function *wrapped(){
			// monitor each status
			slow_feed_toggle.then(function then(st){
				st1 = st;
			});
			fast_feed_toggle.then(function then(st){
				st2 = st;
			});

			// listen for either status to toggle
			yield Promise.race([slow_feed_toggle,fast_feed_toggle]);

			monitorFeedStatus(st1,st2);

			// wait for next tick
			yield Promise.resolve();

			listenToFeedStatus();
		},{ gen: true });
		listenToFeedStatus();

		// setup my feed (duplicate checking)
		setupMyFeed();
	}

	// fake a network stream of data
	function fakeItemFeed(definePromiseChain) {
		var next = promiseBasedEventHandler(definePromiseChain);

		// fake a delay
		var intv = setInterval(function timer(){
			// signal a new item
			next( ItemsText.more() );
		},50);
	}

	function setupFeed(feedID,delay,defineTogglePromiseChain) {
		// setup feed reactive sequences
		var feed_is_running = true, tmp, notifyToggle,
			feed_status, feed_toggle,

			PAUSED_FEED = new Promise(function noop(){}),
			RUNNING_FEED = Promise.resolve(true);

		// start with feed running
		feed_status = RUNNING_FEED;

		setupNextFeedToggle();

		fromEvent(
			"status-" + feedID,
			setupFeedToggle
		);

		sampledStream(
			delay,
			ASQ.wrap(setupStreamEventHandler,{ gen: true, spread: true })
		);


		// ***********************************

		function *setupFeedToggle(pr) {
			// distinct consecutive
			handleFeedToggle( yield pr );
		}

		function setupNextFeedToggle() {
			tmp = extractPromiseResolvers();
			feed_toggle = tmp[0];
			notifyToggle = tmp[1];
			defineTogglePromiseChain(feed_toggle);
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

		function *setupStreamEventHandler(pr) {
			var args = yield Promise.all([pr,feed_status]);
			handleItemText(args[0]);
		}

		function handleItemText(itemText) {
			// feed still running?
			if (feed_is_running) {
				EVT.emit("feed-insertion",feedID,itemText);
			}
		}
	}

	function sampledStream(delay,definePromiseChain) {
		// throttle feed sampling
		var intv = setInterval(
			ASQ.wrap(timer,{ gen: true }),
			delay
		);


		// ***********************************

		function *timer() {
			var tmp = extractPromiseResolvers(),
				pr = tmp[0],
				resolve = tmp[1];

			definePromiseChain(pr);

			// signal a new feed item
			resolve( yield item_feed );
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

		fromEvent(
			"item-selection",
			function *setupItemSelection(pr){
				handleItemSelection( yield pr );
			}
		);


		// ***********************************

		function handleItemSelection(tmp) {
			var feedID = tmp[0],
				itemText = tmp[1],
				$item = tmp[2];

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

	function fromEvent(evtName,definePromiseChain) {
		EVT.on(
			evtName,
			promiseBasedEventHandler(
				ASQ.wrap(definePromiseChain,{ gen: true, spread: true })
			)
		);
	}

	function extractPromiseResolvers() {
		var resolveFn, rejectFn,
			pr = new Promise(function resolver(resolve,reject){
				resolveFn = resolve;
				rejectFn = reject;
			});
		return [pr,resolveFn,rejectFn];
	}

	function promiseBasedEventHandler(definePromiseChain) {
		var pr, resolve;

		// start out with a promise
		getNextPromise();

		return eventHandler;


		// ***********************************

		function eventHandler() {
			// resolve previous promise
			resolve(
				arguments.length <= 1 ? arguments[0] : [].slice.call(arguments)
			);

			// get the next promise ready in case
			// this event fires again
			getNextPromise();
		}

		function getNextPromise() {
			var tmp = extractPromiseResolvers();

			pr = tmp[0];
			resolve = tmp[1];

			definePromiseChain(pr);
		}
	}

})();

(function Feeds(){
	"use strict";

	var // signal event handler(s)
		item_feed;

	EVT.on("setup-feeds",setupFeeds);


	// ***********************************

	function setupFeeds() {
		// setup fake item feed
		fakeItemFeed(function setupItemFeed(sq){
			item_feed = sq;
		});

		// setup slow feed (feed 1)
		var slow_feed_toggle;
		setupFeed(
			/*feedID=*/1,
			/*delay=*/2000,
			function setupSlowFeedToggle(sq){
				slow_feed_toggle = sq;
			}
		);

		// setup fast feed (feed 2)
		var fast_feed_toggle;
		setupFeed(
			/*feedID=*/2,
			/*delay=*/1300,
			function setupFastFeedToggle(sq){
				fast_feed_toggle = sq;
			}
		);

		// track feed statuses
		var st1 = true, st2 = true;

		// monitor feed statuses
		var listenToFeedStatus = ASQ.wrap(function *wrapped(){
			// monitor each status
			slow_feed_toggle.val(function val(st){
				st1 = st;
			});
			fast_feed_toggle.then(function val(st){
				st2 = st;
			});

			// listen for either status to toggle
			yield ASQ().race(slow_feed_toggle,fast_feed_toggle);

			monitorFeedStatus(st1,st2);

			// wait for next tick
			yield ASQ();

			listenToFeedStatus();
		},{ gen: true });
		listenToFeedStatus();

		// setup my feed (duplicate checking)
		setupMyFeed();
	}

	// fake a network stream of data
	function fakeItemFeed(defineSequence) {
		var next = sequenceBasedEventHandler(defineSequence);

		// fake a delay
		var intv = setInterval(function timer(){
			// signal a new item
			next( ItemsText.more() );
		},50);
	}

	function setupFeed(feedID,delay,defineToggleSequence) {
		// setup feed reactive sequences
		var feed_is_running = true,
			feed_status, feed_toggle,

			PAUSED_FEED = ASQ(function noop(){});

		// start with feed running
		feed_status = ASQ(true);

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

		function *setupFeedToggle(sq) {
			// distinct consecutive
			handleFeedToggle( yield sq );
		}

		function setupNextFeedToggle() {
			feed_toggle = ASQ.iterable();
			defineToggleSequence(feed_toggle);
		}

		function handleFeedToggle(st) {
			// resuming feed?
			if (st !== feed_is_running && st === true) {
				feed_is_running = true;
				feed_status = ASQ(true);
			}
			// switching to paused feed
			else {
				feed_is_running = false;
				feed_status = PAUSED_FEED;
			}

			feed_toggle.next(feed_is_running);

			setupNextFeedToggle();
		}

		function *setupStreamEventHandler(sq) {
			var args = yield ASQ().all(sq,feed_status);
			handleItemText(args[0]);
		}

		function handleItemText(itemText) {
			// feed still running?
			if (feed_is_running) {
				EVT.emit("feed-insertion",feedID,itemText);
			}
		}
	}

	function sampledStream(delay,defineSequence) {
		// throttle feed sampling
		var intv = setInterval(
			ASQ.wrap(timer,{ gen: true }),
			delay
		);


		// ***********************************

		function *timer() {
			var sq = ASQ.iterable();

			defineSequence(ASQ.messages(sq));

			// signal a new feed item
			sq.next( yield item_feed );
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
			function *setupItemSelection(sq){
				handleItemSelection.apply( null, yield sq );
			}
		);


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

	function fromEvent(evtName,defineSequence) {
		EVT.on(
			evtName,
			sequenceBasedEventHandler(
				ASQ.wrap(defineSequence,{ gen: true, spread: true })
			)
		);
	}

	function sequenceBasedEventHandler(defineSequence) {
		var sq;

		// start out with a sequence
		getNextSequence();

		return eventHandler;


		// ***********************************

		function eventHandler() {
			// resolve previous sequence
			sq.next.apply(null,arguments);

			// get the next sequence ready in case
			// this event fires again
			getNextSequence();
		}

		function getNextSequence() {
			sq = ASQ.iterable();

			defineSequence(ASQ.messages(sq));
		}
	}

})();

(function Feeds(){
	"use strict";

	var Ar = ASQ.react, // namespace shortcut

		// signal sequence(s)
		item_feed;

	EVT.on("setup-feeds",setupFeeds);


	// ***********************************

	function setupFeeds() {
		// setup fake item feed
		item_feed = Ar(fakeItemFeed);

		// setup slow feed (feed 1)
		var slow_feed_toggle = setupFeed(/*feedID=*/1,/*delay=*/2000);

		// setup fast feed (feed 2)
		var fast_feed_toggle = setupFeed(/*feedID=*/2,/*delay=*/1300);

		// monitor feed status
		Ar.latest(
			slow_feed_toggle, fast_feed_toggle
		)
		.val(monitorFeedStatus);

		// setup my feed (duplicate checking)
		setupMyFeed();
	}

	// fake a network stream of data
	function fakeItemFeed(next,registerTeardown) {
		// fake a delay
		var intv = setInterval(function timer(){
			// signal a new item
			next( ItemsText.more() );
		},50);

		registerTeardown(function teardown(){
			clearInterval(intv);
		});
	}

	function setupFeed(feedID,delay) {
		// setup feed reactive sequences
		var feed_toggle = Ar.distinctConsecutive(
			fromEvent("status-" + feedID)
		);
		var feed = sampledStream(item_feed,delay)
			.val(function val(itemText){
				EVT.emit("feed-insertion",feedID,itemText);
			});

		feed_toggle.val(handleFeedToggle);

		return feed_toggle;


		// ***********************************

		function handleFeedToggle(st){
			if (st) feed.resume();
			else feed.pause();
			return st;
		}
	}

	function sampledStream(stream,delay) {
		var saveLatest = true, latest;

		// observe the stream's messages as they go by
		stream.val(observeStream);

		return Ar(interval);


		// ***********************************

		function interval(next,registerTeardown) {
			saveLatest = true;

			// throttle feed sampling
			var intv = setInterval(function timer(){
				// signal a new feed item
				next.apply(null,latest);
			},delay);

			registerTeardown(function teardown(){
				saveLatest = false;
				clearInterval(intv);
			});
		}

		function observeStream() {
			var args = ASQ.messages.apply(null,arguments);
			if (saveLatest) latest = args;
			return args;
		}
	}

	function monitorFeedStatus(running1,running2) {
		// both feeds paused?
		if (!running1 && !running2) {
			// protect the CPU!
			item_feed.pause();
		}
		// keep calm and carry on
		else {
			item_feed.resume();
		}
	}

	function setupMyFeed() {
		var my_feed_text = {};

		Ar(function reactor(next){
			// wait for item-selection signal
			EVT.on("item-selection",next);
		})
		.val(handleItemSelection);


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

	function fromEvent(evtName) {
		return Ar(listen);


		// ***********************************

		function listen(next,registerTeardown) {
			EVT.on(evtName,next);

			registerTeardown(function teardown(){
				EVT.off(evtName,next);
			});
		}
	}

})();

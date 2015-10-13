(function Feeds(){
	"use strict";

	var // signal event handler(s)
		item_feed;

	EVT.on("setup-feeds",setupFeeds);


	// ***********************************

	function setupFeeds() {
		// setup fake item feed
		fakeItemFeed(function getNewItem(itemText){
			slow_feed(itemText);
			fast_feed(itemText);
		});

		// track feed statuses
		var st1 = true, st2 = true;

		// setup slow feed (feed 1)
		var slow_feed = setupFeed(
				/*feedID=*/1,
				/*delay=*/2000,

				// monitor feed status
				function handleStatusToggle(st){
					if (st1 !== st) {
						st1 = st;
						monitorFeedStatus(st1,st2);
					}
				}
			);

		// setup fast feed (feed 2)
		var fast_feed = setupFeed(
				/*feedID=*/2,
				/*delay=*/1300,

				// monitor feed status
				function handleStatusToggle(st){
					if (st2 !== st) {
						st2 = st;
						monitorFeedStatus(st1,st2);
					}
				}
			);

		// setup my feed (duplicate checking)
		setupMyFeed();
	}

	// fake a network stream of data
	function fakeItemFeed(next) {
		// fake a delay
		var intv = setInterval(function timer(){
			// signal a new item
			next( ItemsText.more() );
		},50);
	}

	function setupFeed(feedID,delay,notifyToggle) {
		var feed_is_running = true, last;

		EVT.on("status-" + feedID,function handleFeedToggle(st) {
			// toggling feed status?
			if (st !== feed_is_running) {
				feed_is_running = st;
				notifyToggle(feed_is_running);
			}
		});

		sampledStream(delay,function nextStreamSample() {
			// feed item waiting and feed still running?
			if (last != null && feed_is_running) {
				EVT.emit("feed-insertion",feedID,last);
				last = null;
			}
		});

		return function nextFeedItem(itemText) {
			last = itemText;
		};
	}

	function sampledStream(delay,cb) {
		// throttle feed sampling
		var intv = setInterval(cb,delay);
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

		EVT.on("item-selection",handleItemSelection);


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

})();

(function Feeds(){
	"use strict";

	var // signal event handler(s)
		item_feed;

	EVT.on("setup-feeds",setupFeeds);

	// ***********************************

	function setupFeeds() {
		var slow_feed = setupFeed(
				/*feedID=*/1,
				/*delay=*/2000
			);

		// setup fast feed (feed 2)
		var fast_feed = setupFeed(
				/*feedID=*/2,
				/*delay=*/1300
			);

		// setup fake item feed
		fakeItemFeed(function getNewItem(itemText){
			slow_feed(itemText);
			fast_feed(itemText);
		});

    EVT.on("item-selection",sam.selectItem);
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
		var last;

		EVT.on("status-" + feedID, function() {
			sam.toggleFeed(feedID);
		});

		EVT.on("feed-status-changed", monitorFeedStatus);

    sampledStream(delay,function nextStreamSample() {
			sam.feed(feedID, last);
    });

		return function nextFeedItem(itemText) {
			last = itemText;
		};
	}

	function sampledStream(delay,cb) {
		// throttle feed sampling
		var intv = setInterval(cb,delay);
	}
  //

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

})();

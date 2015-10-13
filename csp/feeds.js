var Feeds = (function FeedsAPI(){
	"use strict";

	var Ac = ASQ.csp, // namespace shortcut

		// signal channel(s)
		item_feed,

		publicAPI = {
			channels: {
				feeds_setup: Ac.chan(),
				feed_insertions: Ac.chan(),
				my_feed_insertions: Ac.chan(),
				item_selections: Ac.chan(),
				feed_kills: Ac.chan(),
				status: [ Ac.chan(), Ac.chan() ]
			},
			setupFeeds: setupFeeds
		};

	return publicAPI;


	// ***********************************

	function *setupFeeds(ch) {
		// wait for setup signal
		yield Ac.take(
			publicAPI.channels.feeds_setup
		);

		// setup fake item feed
		item_feed = Ac.chan();
		ch.go(fakeItemFeed);

		// setup slow feed (feed 1)
		var slow_feed_toggle = setupFeed(ch.go,/*feedID=*/1,/*delay=*/2000);

		// setup fast feed (feed 2)
		var fast_feed_toggle = setupFeed(ch.go,/*feedID=*/2,/*delay=*/1300);

		// monitor feed status
		ch.go(
			monitorFeedStatus,
			[slow_feed_toggle, fast_feed_toggle]
		);

		// setup my feed (duplicate checking)
		setupMyFeed(ch.go);
	}

	// fake a network stream of data
	function *fakeItemFeed() {
		while (true) {
			// fake a delay
			yield Ac.take(Ac.timeout(50));

			// signal a new item
			yield Ac.put(
				item_feed,
				ItemsText.more()
			);
		}
	}

	function setupFeed(go,feedID,delay) {
		var feed_restart = Ac.chan(),
			feed_toggle = Ac.chan(),
			running = true;

		// setup feed processes
		go(handleFeedToggle);
		go(handleFeed);

		return feed_toggle;


		// ***********************************

		function *handleFeedToggle(){
			var st = running;

			while (true) {
				// wait for status signal
				st = yield Ac.take(
					publicAPI.channels.status[feedID-1]
				);

				// flip of status (aka distinct)?
				if (st !== running) {
					// feed wasn't previously running?
					if (!running) {
						// update status
						running = st;

						// signal restart of feed
						yield Ac.put(feed_restart);
					}
					else {
						// update status
						running = st;
					}

					// notify of feed toggle
					yield Ac.put(feed_toggle,feedID,running);
				}
			}
		}

		function *handleFeed(){
			while (true) {
				if (!running) {
					// wait for feed restart
					yield Ac.take(feed_restart);
				}

				// throttle feed sampling
				yield Ac.take(Ac.timeout(delay));

				// feed still running?
				if (running) {
					// pull new item from feed
					var itemText = yield Ac.take(item_feed);

					// signal a feed insertion
					yield Ac.put(
						publicAPI.channels.feed_insertions,
						[feedID,itemText]
					);
				}
			}
		}
	}

	function *monitorFeedStatus(ch,toggle_1,toggle_2) {
		var running1 = true, running2 = true, feed_id;

		while (true) {
			// wait for toggle from either feed
			feed_id = yield Ac.alts([toggle_1,toggle_2]);

			// flip feed status
			if (feed_id == 1) running1 = !running1;
			else if (feed_id == 2) running2 = !running2;

			// both feeds paused?
			if (!running1 && !running2) {
				// TODO: pause the item feed
			}
			// keep calm and carry on
			else {
				// TODO: resume the item feed
			}
		}
	}

	function setupMyFeed(go) {
		go(handleItemSelection);
	}

	function *handleItemSelection() {
		var tmp, my_feed_text = {},
			feed_id, item_text, $item;

		while (true) {
			// wait for item-selection signal
			tmp = yield Ac.take(
				publicAPI.channels.item_selections
			);

			feed_id = tmp[0];
			item_text = tmp[1];
			$item = tmp[2];

			// not a duplicate message?
			if (!(item_text in my_feed_text)) {
				my_feed_text[item_text] = true;

				// signal my-feed insertion
				yield Ac.put(
					publicAPI.channels.my_feed_insertions,
					[feed_id,$item]
				);
			}
			else {
				// signal kill (duplicate) item
				yield Ac.put(
					publicAPI.channels.feed_kills,
					$item
				);
			}
		}
	}

})();

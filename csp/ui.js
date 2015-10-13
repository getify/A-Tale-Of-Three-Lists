(function App(global){
	"use strict";

	var Ac = ASQ.csp, // namespace shortcut

		$body, $feed_1, $feed_2, $my_feed,
		$feed_1_content, $feed_2_content,
		$my_feed_content,

		// signal channel(s)
		toggle_clicks,
		item_clicks,
		raf_chan = Ac.chan(),
		docready_chan = Ac.chan(),

		// promise wrapper(s)
		rAF,
		docready;

	// run everything!
	ASQ().runner(
		Ac.go(setup),
		Ac.go(toggleFeed),
		Ac.go(insertFeedItem),
		Ac.go(selectItem),
		Ac.go(insertMyFeedItem),
		Ac.go(killFeedItem),

		Ac.go(Feeds.setupFeeds)
	)
	.or(function(err){
		console.log(err);
	});


	// ***********************************

	function *setup() {
		// channel-message wrapper for requestAnimationFrame event
		rAF = function rAF(){
			requestAnimationFrame(function af(){
				Ac.putAsync(raf_chan);
			});
			return raf_chan;
		};

		// channel-message wrapper for DOM-ready event
		docready = function docready(){
			$(document).ready(function ready(){
				Ac.putAsync(docready_chan);
			});
			return docready_chan;
		};

		// channels for DOM events
		toggle_clicks = Ac.chan();
		item_clicks = Ac.chan();

		// wait for DOM-ready
		yield Ac.take( docready() );

		$body = $(document.body);

		$feed_1 = $("[rel*=js-feed-1]");
		$feed_1_content = $feed_1.children("[rel*=js-content]");
		$feed_1.children("[rel*=js-toggle]")
			.on("click",channelToEventHandler(toggle_clicks));

		$feed_2 = $("[rel*=js-feed-2]");
		$feed_2_content = $feed_2.children("[rel*=js-content]");
		$feed_2.children("[rel*=js-toggle]")
			.on("click",channelToEventHandler(toggle_clicks));

		$my_feed = $("[rel*=js-my-feed]");
		$my_feed_content = $my_feed.children("[rel*=js-content]");
		$my_feed_content.on("click","[rel*=js-item]",noop);

		$feed_1.on("click","[rel*=js-item]",channelToEventHandler(item_clicks));
		$feed_2.on("click","[rel*=js-item]",channelToEventHandler(item_clicks));

		// signal the feeds setup to proceed
		yield Ac.put(Feeds.channels.feeds_setup);
	}

	function *toggleFeed() {
		var $btn, $feed, feed_id, running, status;

		while (true) {
			// wait for a feed-toggle click
			$btn = yield Ac.take(toggle_clicks);

			$feed = $btn.closest("[rel*=js-feed-]");
			feed_id = Number( $feed.attr("rel").substr(8) );
			running = ($feed.attr("data-paused") !== "true");

			// currently running feed?
			if (running) {
				// pause it
				$feed.attr({ "data-paused": "true" });
				$btn.text("resume");
			}
			// paused feed
			else {
				// resume it
				$feed.removeAttr("data-paused");
				$btn.text("pause list");
			}

			// which status channel?
			if (feed_id == 1) status = Feeds.channels.status[0];
			else if (feed_id == 2) status = Feeds.channels.status[1];

			// signal status message
			yield Ac.put(status,!running);
		}
	}

	function *insertFeedItem() {
		var tmp, feed_id, itemText,
			$content, $item, $items;

		while (true) {
			// wait for an item insertion signal
			tmp = yield Ac.take(Feeds.channels.feed_insertions);

			feed_id = tmp[0];
			itemText = tmp[1];

			// which feed to insert into?
			if (feed_id == 1) $content = $feed_1_content;
			else if (feed_id == 2) $content = $feed_2_content;

			$item = $("<a>")
				.addClass("item")
				.attr({ href: "#", rel: "js-item" })
				.text(itemText);

			$content.prepend($item);

			$items = $content.children("[rel*=js-item]");
			if ($items.length > 20) {
				$items.last().remove();
			}
		}
	}

	function *selectItem() {
		var $item, $feed, feed_id;

		while (true) {
			// wait for a click on an item
			$item = yield Ac.take(item_clicks);

			// item not yet killed?
			if (!$item.is(".killed")) {
				$feed = $item.closest("[rel*=js-feed-]");
				feed_id = Number( $feed.attr("rel").substr(8) );

				// signal item selection
				yield Ac.put(
					Feeds.channels.item_selections,
					[feed_id,$item.text(),$item]
				);
			}
		}
	}

	function *insertMyFeedItem() {
		var tmp, feed_id, $item, $floating_item,
			item_dims, item_margin_left,
			item_margin_top, my_feed_dims;

		while (true) {
			// wait for a my-feed item insertion signal
			tmp = yield Ac.take(Feeds.channels.my_feed_insertions);

			feed_id = tmp[0];
			$item = tmp[1];

			$floating_item = $item.clone().addClass("floating");

			if (feed_id == 1) $floating_item.addClass("first-list");
			else if (feed_id == 2) $floating_item.addClass("second-list");

			item_dims = $item.offset();
			item_margin_left = parseInt($item.css("margin-left"),10);
			item_margin_top = parseInt($item.css("margin-top"),10);

			$floating_item.css({
					left: (Math.round(item_dims.left) - item_margin_left) + "px",
					top: (Math.round(item_dims.top) - item_margin_top) + "px"
				})
				.appendTo($body);

			$item.remove();

			// wait for the next animation frame (CSS junk)
			yield Ac.take( rAF() );

			my_feed_dims = $my_feed_content.offset();

			$floating_item.css({
				left: Math.round(my_feed_dims.left) + "px",
				top: Math.round(my_feed_dims.top) + "px"
			});

			// wait for the transition to end
			yield Ac.take(
				fromEvent($floating_item,"transitionend")
			);

			$floating_item
				.unbind("transitionend")
				.css({ left: "", top: "" })
				.removeClass("floating")
				.prependTo($my_feed_content);
		}
	}

	function *killFeedItem() {
		var $item;

		while (true) {
			// wait for an item kill signal (selected dupe)
			$item = yield Ac.take(Feeds.channels.feed_kills);

			$item.addClass("killed");

			// wait for a second
			yield Ac.take(Ac.timeout(1000));

			$item.remove();
		}
	}

	// bridge DOM events to channel messages
	function fromEvent($el,evtName) {
		var ch = Ac.chan();
		$el.on(evtName,channelToEventHandler(ch));
		return ch;
	}

	// wrap channel messages as DOM event handler
	function channelToEventHandler(ch) {
		return function handler(evt) {
			noop(evt);
			Ac.putAsync(ch,$(evt.target));
		};
	}

	function noop(evt) {
		evt.preventDefault();
		evt.stopPropagation();
		evt.stopImmediatePropagation();
	}

})(window);

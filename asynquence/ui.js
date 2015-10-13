(function UI(global){
	"use strict";

	var $body, $feed_1, $feed_2, $my_feed,
		$feed_1_content, $feed_2_content,
		$my_feed_content,

		// signal event handler(s)
		toggle_clicks,
		item_clicks,

		// sequence wrapper(s)
		rAF,
		docready;

	// pubsub hub
	global.EVT = new EventEmitter2();

	// run everything!
	ASQ().runner(setup);


	// ***********************************

	function *setup() {
		// sequence-wrapper for requestAnimationFrame event
		// note: this is a one-time event, so sequence OK
		rAF = function rAF() {
			return ASQ(function asq(done){
				requestAnimationFrame(done);
			});
		},

		// sequence-wrapper for DOM-ready event
		// note: this is a one-time event, so sequence OK
		docready = function docready() {
			return ASQ(function asq(done){
				$(document).ready(done);
			});
		};

		// DOM event handlers from sequences
		toggle_clicks = sequenceBasedEventHandler(function *setupToggleClicks(sq){
			toggleFeed( yield sq );
		});
		item_clicks = sequenceBasedEventHandler(function *setupItemClicks(sq){
			selectItem( yield sq );
		});

		// wait for DOM-ready
		yield docready();

		$body = $(document.body);

		$feed_1 = $("[rel*=js-feed-1]");
		$feed_1_content = $feed_1.children("[rel*=js-content]");
		$feed_1.children("[rel*=js-toggle]")
			.on("click",toggle_clicks);

		$feed_2 = $("[rel*=js-feed-2]");
		$feed_2_content = $feed_2.children("[rel*=js-content]");
		$feed_2.children("[rel*=js-toggle]")
			.on("click",toggle_clicks);

		$my_feed = $("[rel*=js-my-feed]");
		$my_feed_content = $my_feed.children("[rel*=js-content]");
		$my_feed_content.on("click","[rel*=js-item]",noop);

		$feed_1.on("click","[rel*=js-item]",item_clicks);
		$feed_2.on("click","[rel*=js-item]",item_clicks);

		EVT.on("feed-insertion",insertFeedItem);
		EVT.on("my-feed-insertion",ASQ.wrap(insertMyFeedItem,{ gen: true, spread: true }));
		EVT.on("feed-kill",ASQ.wrap(killFeedItem,{ gen: true, spread: true }));

		// signal the feeds setup to proceed
		EVT.emit("setup-feeds");
	}

	function toggleFeed($btn) {
		var $feed = $btn.closest("[rel*=js-feed-]");
		var feed_id = Number( $feed.attr("rel").substr(8) );
		var running = ($feed.attr("data-paused") !== "true");

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

		// signal status message
		EVT.emit("status-" + feed_id,!running);
	}

	function insertFeedItem(feedID,itemText) {
		var $content;

		// which feed to insert into?
		if (feedID == 1) $content = $feed_1_content;
		else if (feedID == 2) $content = $feed_2_content;

		var $item = $("<a>")
			.addClass("item")
			.attr({ href: "#", rel: "js-item" })
			.text(itemText);

		$content.prepend($item);

		var $items = $content.children("[rel*=js-item]");
		if ($items.length > 20) {
			$items.last().remove();
		}
	}

	function selectItem($item) {
		// item not yet killed?
		if (!$item.is(".killed")) {
			var $feed = $item.closest("[rel*=js-feed-]");
			var feed_id = Number( $feed.attr("rel").substr(8) );

			// signal item selection
			EVT.emit("item-selection",feed_id,$item.text(),$item);
		}
	}

	function *insertMyFeedItem(feed_id,$item) {
		var $floating_item = $item.clone().addClass("floating");

		if (feed_id == 1) $floating_item.addClass("first-list");
		else if (feed_id == 2) $floating_item.addClass("second-list");

		var item_dims = $item.offset();
		var item_margin_left = parseInt($item.css("margin-left"),10);
		var item_margin_top = parseInt($item.css("margin-top"),10);

		$floating_item.css({
				left: (Math.round(item_dims.left) - item_margin_left) + "px",
				top: (Math.round(item_dims.top) - item_margin_top) + "px"
			})
			.appendTo($body);

		$item.remove();

		// wait for the next animation frame (CSS junk)
		yield rAF();

		var my_feed_dims = $my_feed_content.offset();

		$floating_item.css({
			left: Math.round(my_feed_dims.left) + "px",
			top: Math.round(my_feed_dims.top) + "px"
		});

		// wait for the transition to end
		yield fromEventOnce($floating_item,"transitionend");

		$floating_item
			.unbind("transitionend")
			.css({ left: "", top: "" })
			.removeClass("floating")
			.prependTo($my_feed_content);
	}

	function *killFeedItem($item) {
		$item.addClass("killed");

		// wait for a second
		yield ASQ.after(1000);

		$item.remove();
	}

	// bridge DOM events to sequences
	function fromEventOnce($el,evtName,defineSequenceChain) {
		var sq = ASQ.iterable();

		$el.on(evtName,onevt);

		return sq;


		// ***********************************

		function onevt(evt) {
			noop(evt);

			// unbind event handler since sequences are
			// resolvable only once
			$el.off(evtName,onevt);

			sq.next($(evt.target));
		}
	}

	function sequenceBasedEventHandler(defineSequenceChain) {
		var sq;

		defineSequenceChain = ASQ.wrap(defineSequenceChain,{ gen: true, spread: true });

		// start out with a sequence
		getNextSequence();

		return eventHandler;

		// ***********************************

		function eventHandler(evt) {
			noop(evt);

			// resolve previous sequence
			sq.next($(evt.target));

			// get the next sequence ready in case
			// this event fires again
			getNextSequence();
		}

		function getNextSequence() {
			sq = ASQ.iterable();

			defineSequenceChain(ASQ.messages(sq));
		}
	}

	function noop(evt) {
		evt.preventDefault();
		evt.stopPropagation();
		evt.stopImmediatePropagation();
	}

})(window);

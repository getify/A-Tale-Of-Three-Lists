// SAM is a async and state management pattern created by Jean-Jacques Dubray
// http://sam.js.org/
document.sam = {};

var model = {
  myFeedTextMap: {},
  feed1Running: true,
  feed2Running: true
};
var state = '';
var actions = {
  feed: function(feedId, itemText) {
    present({feedId: feedId, itemText: itemText});
  },
  toggleFeed: function(feedId) {
    present({toggleStatusFeedId: feedId});
  },
  selectItem: function(feedId,itemText,$item) {
    present({
      userSelection: true,
      feedId: feedId,
      itemText: itemText,
      $item: $item
    })
  }
};
var present = function(proposal) {
  model.isDuplicateNewText = false;
  model.newTextItem = '';
  model.feedIdContext = undefined;
  model.$item = undefined;
  model.toggled = false;

  // Handle stream data
  if (proposal.itemText && proposal.feedId) {
    model.feedIdContext = proposal.feedId;
    model.newTextItem = proposal.itemText;
  }

  // Handle user selection
  if (proposal.itemText && proposal.feedId && proposal.$item) {
    model.itemTextSelected = proposal.itemText;
    if (model.myFeedTextMap[proposal.itemText]) {
      model.isDuplicateNewText = true;
    } else {
      model.myFeedTextMap[proposal.itemText] = true;
    }
    model.$item = proposal.$item;
  }

  // Toggle Status
  if (proposal.toggleStatusFeedId) {
    if (proposal.toggleStatusFeedId === 1) {
      model.feed1Running = !model.feed1Running;
    }
    if (proposal.toggleStatusFeedId === 2) {
      model.feed2Running = !model.feed2Running;
    }
    model.toggled = true;
    model.feedIdContext = proposal.feedId;
  }

  state();
};
var state = function() {
  // Emit state representation

  if (!model.$item && model.newTextItem) {
    if ((model.feedIdContext === 1 && model.feed1Running)
      || (model.feedIdContext === 2 && model.feed2Running)) {
      EVT.emit("feed-insertion",model.feedIdContext,model.newTextItem);
    }
  }

  if (model.$item && model.isDuplicateNewText) {
    EVT.emit("feed-kill",model.$item);
  } else if (model.$item && model.newTextItem) {
    EVT.emit("my-feed-insertion",model.feedIdContext,model.$item);
  }

  if (model.toggled) {
    EVT.emit('feed-status-change', model.feed1Running, model.feed2Running);
  }
};
var nap = function() {

};

sam = Object.assign({}, actions, {model: model});
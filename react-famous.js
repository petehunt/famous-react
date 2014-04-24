/**
 * Copyright 2013 Facebook, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * @providesModule ReactFamous
 */

// ART -> Famo.us
// --------------
// Surface -> Context
// Node -> Surface

"use strict";

var Engine = require('./famous/core/Engine');
var ImageSurface = require('./famous/surfaces/ImageSurface');

var DOMPropertyOperations = require('react/lib/DOMPropertyOperations');
var ReactBrowserComponentMixin = require('react/lib/ReactBrowserComponentMixin');
var ReactComponent = require('react/lib/ReactComponent');
var ReactMount = require('react/lib/ReactMount');
var ReactMultiChild = require('react/lib/ReactMultiChild');
var ReactDOMComponent = require('react/lib/ReactDOMComponent');
var ReactUpdates = require('react/lib/ReactUpdates');

var ReactComponentMixin = ReactComponent.Mixin;

var mixInto = require('react/lib/mixInto');
var merge = require('react/lib/merge');

// Used for comparison during mounting to avoid a lot of null checks
var BLANK_PROPS = {};

// Put React on famo.us's tick
var FamousBatchingStrategy = {
  isBatchingUpdates: true,
  batchedUpdates: function(callback, param) {
    callback(param);
  }
};

ReactUpdates.injection.injectBatchingStrategy(FamousBatchingStrategy);
Engine.on('prerender', ReactUpdates.flushBatchedUpdates.bind(ReactUpdates));

function createComponent(name) {
  var ReactFamousComponent = function() {};
  ReactFamousComponent.displayName = name;
  for (var i = 1, l = arguments.length; i < l; i++) {
    mixInto(ReactFamousComponent, arguments[i]);
  }
  var ConvenienceConstructor = function(props, children) {
    var instance = new ReactFamousComponent();
    // Children can be either an array or more than one argument
    instance.construct.apply(instance, arguments);
    return instance;
  };
  ConvenienceConstructor.type = ReactFamousComponent;
  ReactFamousComponent.prototype.type = ReactFamousComponent;
  return ConvenienceConstructor;
}

// ContainerMixin for components that can hold Famous nodes

var ContainerMixin = merge(ReactMultiChild.Mixin, {

  /**
   * Moves a child component to the supplied index.
   *
   * @param {ReactComponent} child Component to move.
   * @param {number} toIndex Destination index of the element.
   * @protected
   */
  moveChild: function(child, toIndex) {
    // Famous doesn't let you move shit around.
    return;
  },

  /**
   * Creates a child component.
   *
   * @param {ReactComponent} child Component to create.
   * @param {object} childNode ART node to insert.
   * @protected
   */
  createChild: function(child, childNode) {
    child._mountImage = childNode;
    this.node.add(childNode);
  },

  /**
   * Removes a child component.
   *
   * @param {ReactComponent} child Child to remove.
   * @protected
   */
  removeChild: function(child) {
    child._mountImage.eject();
    child._mountImage = null;
  },

  /**
   * Override to bypass batch updating because it is not necessary.
   *
   * @param {?object} nextChildren.
   * @param {ReactReconcileTransaction} transaction
   * @internal
   * @override {ReactMultiChild.Mixin.updateChildren}
   */
  updateChildren: function(nextChildren, transaction) {
    this._mostRecentlyPlacedChild = null;
    this._updateChildren(nextChildren, transaction);
  },

  // Shorthands

  mountAndInjectChildren: function(children, transaction) {
    var mountedImages = this.mountChildren(
      children,
      transaction
    );
    // Each mount image corresponds to one of the flattened children
    var i = 0;
    for (var key in this._renderedChildren) {
      if (this._renderedChildren.hasOwnProperty(key)) {
        var child = this._renderedChildren[key];
        child._mountImage = mountedImages[i];
        this.node.add(mountedImages[i]);
        i++;
      }
    }
  }

});

// Context - Root node of all Famous

var Context = createComponent(
  'Context',
  ReactDOMComponent.Mixin,
  ReactComponentMixin,
  ContainerMixin, 
  ReactBrowserComponentMixin, {

  mountComponent: function(rootID, transaction, mountDepth) {
    ReactComponentMixin.mountComponent.call(
      this,
      rootID,
      transaction,
      mountDepth
    );
    transaction.getReactMountReady().enqueue(this, this.componentDidMount);
    // Temporary placeholder
    var idMarkup = DOMPropertyOperations.createMarkupForID(rootID);
    return '<div ' + idMarkup + '></div>';
  },

  componentDidMount: function() {
    this.node = Engine.createContext(this.getDOMNode());

    var transaction = ReactComponent.ReactReconcileTransaction.getPooled();
    transaction.perform(
      this.mountAndInjectChildren,
      this,
      this.props.children,
      transaction
    );
    ReactComponent.ReactReconcileTransaction.release(transaction);
  },

  receiveComponent: function(nextComponent, transaction) {
    var props = nextComponent.props;
    var node = this.node;

    this._updateDOMProperties(props);

    this.updateChildren(props.children, transaction);

    this.props = props;
  },

  unmountComponent: function() {
    ReactComponentMixin.unmountComponent.call(this);
    this.unmountChildren();
  }

});

var SurfaceMixin = merge(ReactComponentMixin, {
  applyNodeProps: function(oldProps, props) {
    this.node.setOptions(props);
  },

  mountComponentIntoNode: function(rootID, container) {
    throw new Error(
      'You cannot render an ART component standalone. ' +
      'You need to wrap it in a Surface.'
    );
  }

});

var Image = createComponent('Image', SurfaceMixin, {
  mountComponent: function() {
    ReactComponentMixin.mountComponent.apply(this, arguments);
    this.node = new ImageSurface({});
    this.applyNodeProps(BLANK_PROPS, this.props);
    return this.node;
  },

  receiveComponent: function(nextComponent, transaction) {
    var props = nextComponent.props;
    this.applyNodeProps(this.props, props);
    this.props = props;
  }
});

var ReactFamous = {
  Context: Context,
  Image: Image
};

module.exports = ReactFamous;

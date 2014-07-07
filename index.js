/** @jsx React.DOM */
var Timer = require('famous/utilities/Timer');
var React = require('react');
var ReactFamous = require('./react-famous');

var Context = ReactFamous.Context;
var Image = ReactFamous.Image;

var FamousTimerMixin = {
  componentWillMount: function() {
    this._famousTimers = [];
  },

  setInterval: function() {
    this._famousTimers.push(
      Timer.setInterval.apply(Timer, arguments)
    );
  },

  componentWillUnmount: function() {
    this._famousTimers.forEach(Timer.clear.bind(Timer));
  }
};

var App = React.createClass({
  mixins: [FamousTimerMixin],

  getInitialState: function() {
    return {famous: true};
  },
  componentDidMount: function() {
    this.setInterval(this.toggle, 1000);
  },
  toggle: function() {
    this.setState({famous: !this.state.famous});
  },
  render: function() {
    var imageUrl = this.state.famous ? 'famous_logo.png' : 'react_logo.png';
    return (
      <Context>
        <Image size={[200, 200]} content={imageUrl} />
      </Context>
    );
  }
});
React.renderComponent(App(), document.body);


//Timer.setTimeout(function() {
//  React.renderComponent(<h1>PEACE</h1>, document.body);
//}, 5000);

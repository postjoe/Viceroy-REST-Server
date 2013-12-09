var util = require('util');
var viceroy = require('viceroy');


function Person() {
  viceroy.Model.apply(this, arguments);
}
util.inherits(Person, viceroy.Model);


module.exports = Person;
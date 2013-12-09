

// modules
var util = require('util');
var connect = require('connect');

// libs
var viceroy = require('../../Viceroy');
var viceroyMongo = require('../../Viceroy-Mongo');
var viceroyRestServer = require('../');
var Model = viceroy.Model;

// create the web server
var app = connect();

// link up the viceroy driver
viceroy.driver(viceroyMongo({
  database: 'viceroy-rest-server-test'
}));

// create the viceroy rest server
var server = viceroyRestServer(app);
viceroy.use(server.middleware());




// load a people resource
server.loadRoutes(function(router) {
  router.resource('people');
});




// setup the db connection
viceroy.connect(function() {






  // create and register the Persion model
  function Person() {
    Model.apply(this, arguments);
  }
  util.inherits(Person, Model);
  viceroy.model(Person);






});

// bind the web server to port 8000
app.listen(8000);


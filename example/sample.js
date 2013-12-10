

// modules
var util = require('util');
var connect = require('connect');
var viceroy = require('viceroy');
var viceroyNeDB = require('viceroy-nedb');

// libs
var viceroyRestServer = require('../');
var Model = viceroy.Model;

// create the web server
var app = connect();

// link up the viceroy driver
viceroy.driver(viceroyNeDB({
  databasePath: 'viceroy-rest-server-test'
}));

// create the viceroy rest server
var server = viceroyRestServer(app);
viceroy.use(server.middleware());

// load a people resource
server.loadRoutes(function(router) {
  router.resource('people');
});


// create and register the Persion model
function Person() {
  Model.apply(this, arguments);
}
util.inherits(Person, Model);
viceroy.model(Person);


// setup the db connection
viceroy.connect(function() {

  // bind the web server to port 8000
  app.listen(8000);
});



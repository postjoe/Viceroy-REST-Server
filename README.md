# Viceroy-REST-Server

Viceroy REST Server contains middleware for express and [Viceroy] [1].
It allows you to create RESTful routes as well as custom routes based on
your Viceroy Models.

## Sample Code:

```javascript
// modules
var util = require('util');
var connect = require('connect');
var viceroy = require('viceroy');
var viceroyNeDB = require('viceroy-nedb');

// libs
var viceroyRestServer = require('viceroy-rest-server');
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
  // this creates the following routes for 'people':
  // create: POST /people
  // show: GET /people/:id
  // index: GET /people
  // update: PUT /people/:id
  // destroy: DELETE /people/:id
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


```


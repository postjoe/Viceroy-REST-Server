

// modules
var util = require('util');
var connect = require('connect');

// libs
var viceroy = require('viceroy');
var viceroyNeDB = require('viceroy-nedb');
var viceroyREST = require('viceroy-rest');
var viceroyRESTServer = require('../');
var Model = viceroy.Model;

xdescribe('viceroy and viceroy REST intergration', function() {

  // create the web server and bind it to port 8025
  before(function(done) {
    this.connectApp = connect();
    this.port = this.connectApp.listen(8025, done);
    this.serverViceroy = new viceroy.Viceroy();
    this.clientViceroy = new viceroy.Viceroy();
  });

  // setup the server
  before(function(done) {

    // configure the driver
    this.serverViceroy.driver(viceroyNeDB({
      databasePath: 'tmp/test-db'
    }));

    // setup the REST server
    this.RESTServer = viceroyRESTServer(this.connectApp);

    // load some resource routes
    this.RESTServer.loadRoutes(function(router) {
      router.resource('people', function() {
        router.resource('friends', { controller: 'people' });
      });
    });

    // add the REST server middleware to viceroy
    this.serverViceroy.use(this.RESTServer.middleware());
      
    // add the person model
    function Person() {
      Model.apply(this, arguments);
      this.schema({
        name: 'Robert'
      });
      this.hasMany('Person', 'friends');
    }
    util.inherits(Person, Model);
    this.serverViceroy.model(Person);

    // connect
    this.serverViceroy.connect(done);
  });

  // setup the client
  before(function(done) {

    // configure the driver
    this.clientViceroy.driver(viceroyREST({
      host: 'localhost',
      port: 8025
    }));
    
    // add the person model
    function Person() {
      Model.apply(this, arguments);
      this.schema({
        name: 'Robert'
      });
      this.hasMany('Person', 'friends');
    }
    util.inherits(Person, Model);
    this.Person = Person;
    this.clientViceroy.model(Person);

    // connect
    this.clientViceroy.connect(function() {
      done();
    });
  });

  // shutdown the app server
  after(function(done) {
    this.port.close(done);
  });

  it('can create a model', function(done) {
    this.Person.create({
      name: 'Robert'
    }, function(err, robert) {
      if(err) { done(err); return; }
      robert.should.exist;
      console.log(robert.data());
      robert._id.should.exist;
      robert.name.should.equal('Robert');
      done();
    });
  });
});


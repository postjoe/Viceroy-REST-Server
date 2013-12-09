
var connect = require('connect');
var viceroy = require('viceroy');
var viceroyRESTServer = require('../');
var Middleware = viceroyRESTServer.Middleware;
var Person = require('./fixtures/models/person');


describe('Middleware', function() {

  beforeEach(function() {
    this.viceroy = viceroy;
    this.app = connect();
    this.server = viceroyRESTServer(this.app);
  });

  it('throws if viceroy is not passed', function() {
    (function() {
      new Middleware();
    }).should.throw();
  });

  it('throws if viceroy and viceroyRESTServer is not passed', function() {
    (function() {
      new Middleware(this.viceroy);
    }).should.throw();
  });

  it('accepts an instance of viceroy and viceroyRESTServer', function() {
    new Middleware(this.viceroy, this.server);
  });
});


describe('middleware', function() {

  beforeEach(function() {
    this.viceroy = viceroy;
    this.app = connect();
    this.server = viceroyRESTServer(this.app);
    this.middleware = new Middleware(this.viceroy, this.server);
  });

  it('has an augmentModel method', function() {
    this.middleware.augmentModel.should.be.type('function');
  });


  describe('augmentModel', function() {

    beforeEach(function() {
      this.Person = Person;
    });

    it('accepts a model', function() {
      this.middleware.augmentModel(this.Person);
    });

    it('ignores (does not throw on) calls without a model', function() {
      this.middleware.augmentModel();
    });

    it('adds a model to _models by name', function() {
      this.middleware.augmentModel(this.Person);
      this.middleware._models.Person.should.equal(this.Person);
    });
  });
});

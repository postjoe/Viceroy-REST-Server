
var connect = require('connect');
var viceroy = require('viceroy');
var viceroyRESTServer = require('../');
var Person = require('./fixtures/models/person');


describe('viceroyRESTServer (factory)', function() {

  it('throws if a connect server is not passed', function() {
    (function() {
      viceroyRESTServer();
    }).should.throw();
  });

  it('accepts a connect server', function() {
    var app = connect();
    viceroyRESTServer(app);
  });

  it('accepts a connect server and opts', function() {
    viceroyRESTServer(connect(), {});
  });

  it('returns an instance of ViceroyRESTServer', function() {
    var server = viceroyRESTServer(connect(), {});
    server.should.be.instanceOf(viceroyRESTServer.ViceroyRESTServer);
  });
});


describe('viceroyRESTServer (instance)', function() {

  beforeEach(function() {
    this.app = connect();
    this.server = viceroyRESTServer(this.app, {});
  });

  it('has a middleware method', function() {
    this.server.middleware.should.be.type('function');
  });

  it('has a loadRoutes method', function() {
    this.server.loadRoutes.should.be.type('function');
  });


  describe('middleware (factory)', function() {

    beforeEach(function() {
      this.middlewareFactory = this.server.middleware();
      this.Person = Person;
    });

    it('returns a middleware factory function', function() {
      this.middlewareFactory.should.be.type('function');
    });

    it('returns a middleware factory function which should throw if not passed an instance of viceroy', function() {
      var _this = this;
      (function() {
        _this.middlewareFactory();
      }).should.throw();
    });

    it('returns a middleware factory function which accepts an instance of viceroy', function() {
      this.middlewareFactory(viceroy);
    });

    it('grabs all of the models off of viceroy', function() {
      var middleware = this.middlewareFactory(viceroy);
      viceroy.use(middleware);
      viceroy.model(this.Person);
      middleware._models.Person.should.equal(this.Person);
    });

    it('returns a middleware factory function which returns an instance of viceroyRESTServer middleware', function() {
      var middleware = this.middlewareFactory(viceroy);
      middleware.should.be.instanceOf(viceroyRESTServer.Middleware);
    });
  });


  describe('loadControllers', function() {

    it('throws if a path or an object is not given', function() {
      var _this = this;
      (function() {
        _this.server.loadControllers();
      }).should.throw();
    });

    it('accepts a directory path', function() {
      this.server.loadControllers('./test/fixtures/controllers');
    });

    it('accepts an object', function() {
      this.server.loadControllers({
        people: {
          index: function(req, res, next) { res.end('hi'); }
        }
      });
    });

    it('adds the controller to the instance', function() {
      this.server.loadControllers({
        people: {
          index: function(req, res, next) { res.end('hi'); }
        }
      });
      this.server._controllers.people.should.exist;
      this.server._controllers.people.index.should.exist;
    });
  });


  describe('loadRoutes', function() {

    it('throws if a path or function is not given', function() {
      var _this = this;
      (function() {
        _this.server.loadRoutes();
      }).should.throw();
    });

    it('accepts a file path', function() {
      this.server.loadRoutes('./test/fixtures/config/routes.js');
    });

    it('accepts a function', function() {
      this.server.loadRoutes(function(routes) {});
    });

    it('passes the module or function the router instance', function(done) {
      this.server.loadRoutes(function(router) {
        router.should.be.instanceOf(viceroyRESTServer.Router);
        done();
      });
    });
  });


  describe('resource', function() {

    it('accepts a pluralized, lowercase model name', function() {
      this.server.resource
    });
  });
});
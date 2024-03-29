
var Router = require('../').Router;

var connect = require('connect');
var viceroyRESTServer = require('../');
var Router = require('../').Router;


describe('router', function() {

  beforeEach(function() {
    this.app = connect();
    this.server = viceroyRESTServer(this.app);
    this.router = new Router(this.server);
  });

  it('has a loadRoutes method', function() {
    this.router.loadRoutes.should.be.type('function');
  });

  it('has a resource method', function() {
    this.router.resource.should.be.type('function');
  });

  it('has a get method', function() {
    this.router.get.should.be.type('function');
  });

  it('has a post method', function() {
    this.router.post.should.be.type('function');
  });

  it('has a put method', function() {
    this.router.put.should.be.type('function');
  });

  it('has a patch method', function() {
    this.router.patch.should.be.type('function');
  });

  it('has a del method', function() {
    this.router.del.should.be.type('function');
  });

  describe('use', function() {

    it('throws if no args are passed', function() {
      var _this = this;
      (function() {
        _this.router.use();
      }).should.throw();
    });

    it('throws if a non function is passed', function() {
      var _this = this;
      (function() {
        _this.router.use('string');
      }).should.throw();
    });

    it('adds middleware to the router', function() {
      var testMiddleware = function() {};
      this.router.use(testMiddleware);
      this.router._middleware.length.should.equal(1);
      this.router._middleware[0].should.equal(testMiddleware);
    });
  });

  describe('loadRoutes', function() {

    it('throws if no callback is given', function() {
      var _this = this;
      (function() {
        _this.router.loadRoutes();
      }).should.throw();
    });

    it('accepts a callback', function() {
      this.router.loadRoutes(function() {});
    });

    it('executes the callback passing it the router', function(done) {
      var _this = this;
      this.router.loadRoutes(function(router) {
        router.should.equal(_this.router);
        done();
      });
    });

    it('sets the state to loading prior to executing the callback', function(done) {
      var _this = this;
      this.router.loadRoutes(function() {
        _this.router.state.should.equal('loading');
        done();
      });
    });

    it('sets the state to ready after executing the callback', function() {
      var executed = false;
      this.router.loadRoutes(function() {
        executed = true;
      });
      executed.should.be.true;
      this.router.state.should.equal('ready');
    });
  });

  var methods = ['get', 'post', 'put', 'patch', 'del'];

  methods.forEach(function(method) {
    describe(method, function() {

      it('throws if a routeUrl is not given', function() {
        var _this = this;
        (function() {
          _this.router[method]();
        }).should.throw();
      });

      it('accepts routeUrl', function() {
        this.router[method]('about');
      });

      it('accepts routeUrl and opts', function() {
        this.router[method]('about', { controller: 'pages', action: 'about' });
      });

      it('accepts routeUrl and opts string', function() {
        this.router[method]('about', 'pages#about');
      });

      it('accepts routeUrl and sub routes callback', function() {
        this.router[method]('about', 'pages#about', function() {});
      });

      it('accepts routeUrl, opts string, and sub routes callback', function() {
        this.router[method]('about', 'pages#about', function() {});
      });

      it('sets a route object on the router', function() {
        this.router[method]('about', 'pages#about', function() {});
        this.router._routes['/about'].should.be.type('object');
        if(method == 'del') { method = 'delete'; }
        this.router._routes['/about'][method].should.be.type('object');
        this.router._routes['/about'][method].controller.should.equal('pages');
        this.router._routes['/about'][method].action.should.equal('about');
        if(method == 'delete') { method = 'del'; }
      });

      it('correctly binds root', function() {
        this.router[method]('', 'pages#index', function() {});
        this.router._routes['/'].should.be.type('object');
        if(method == 'del') { method = 'delete'; }
        this.router._routes['/'][method].should.be.type('object');
        this.router._routes['/'][method].controller.should.equal('pages');
        this.router._routes['/'][method].action.should.equal('index');
        if(method == 'delete') { method = 'del'; }
      });

      it('calls the sub routes callback passing it the router', function() {
        var _this = this;
        this.router[method]('about', 'pages#about', function(router) {
          router.should.equal(_this.router);
        });
      });

      it('switches the url context when entering the sub routes callback', function() {
        var _this = this;
        this.router[method]('about', 'pages#about', function(router) {
          _this.router._context.length.should.equal(1);
          _this.router._context[0].should.equal('about');
        });
      });

      it('restores the url context when after exiting sub routes callback', function() {
        var executed = false;
        this.router[method]('about', 'pages#about', function(router) {
          executed = true;
        });
        executed.should.be.true;
        this.router._context.length.should.equal(0);
      });
    });
  });

  describe('resource', function() {

    it('throws if a resource name is not given', function() {
      var _this = this;
      (function() {
        _this.router.resource();
      }).should.throw();
    });

    it('accepts resource name', function() {
      this.router.resource('posts');
    });

    it('accepts resource name and opts', function() {
      this.router.resource('posts', { controller: 'postsCtrl' });
    });

    it('accepts resource name and opts string', function() {
      this.router.resource('posts', 'postsCtrl');
    });

    it('accepts resource name and sub routes callback', function() {
      this.router.resource('posts', function() {});
    });

    it('accepts resource name, opts string, and sub routes callback', function() {
      this.router.resource('posts', 'postsCtrl', function() {});
    });

    it('sets a series of route objects on the router', function() {
      this.router.resource('posts');
      this.router._routes['/posts'].should.be.type('object');
      this.router._routes['/posts'].get.should.be.type('object');
      this.router._routes['/posts'].post.should.be.type('object');
      this.router._routes['/posts/:id'].get.should.be.type('object');
      this.router._routes['/posts/:id'].patch.should.be.type('object');
      this.router._routes['/posts/:id']['delete'].should.be.type('object');
    });

    it('sets a series of route objects on the router for a singular resource', function() {
      this.router.resource('about');
      this.router._routes['/about'].should.be.type('object');
      this.router._routes['/about'].get.should.be.type('object');
      this.router._routes['/about'].post.should.be.type('object');
      this.router._routes['/about'].patch.should.be.type('object');
      this.router._routes['/about']['delete'].should.be.type('object');
    });

    it('sets a middleware on sub routes correctly', function() {
      this.router.resource('posts', {
        middleware: [
          {
            handler: function() {},
            not: ['index', 'destroy']
          }, {
            handler: function() {},
            only: ['foo']
          }
        ]
      });
      this.router._routes['/posts'].post.should.be.type('object');
      this.router._routes['/posts/:id'].get.should.be.type('object');
      this.router._routes['/posts/:id'].patch.should.be.type('object');
      this.router._routes['/posts/:id']['delete'].should.be.type('object');
    });

    it('nests sub resources under the parent resource namespace', function(done) {
      this.router.resource('posts', function(router) {
        router.resource('comments');
        router._routes['/posts/:postId/comments'].should.be.type('object');
        router._routes['/posts/:postId/comments'].get.should.be.type('object');
        router._routes['/posts/:postId/comments'].post.should.be.type('object');
        router._routes['/posts/:postId/comments/:id'].get.should.be.type('object');
        router._routes['/posts/:postId/comments/:id'].patch.should.be.type('object');
        router._routes['/posts/:postId/comments/:id']['delete'].should.be.type('object');
        router._routes['/posts/:postId/comments'].get.context[0].resourceName.should.equal('posts');
        router._routes['/posts/:postId/comments'].get.context[0].idToken.should.equal(':postId');
        router._routes['/posts/:postId/comments'].get.context[1].resourceName.should.equal('comments');
        router._routes['/posts/:postId/comments'].get.context[1].idToken.should.equal(':id');
        done();
      });
    });

    it('nests sub resources of sub resources under the sub resource namespace above and the parent namespace', function(done) {
      this.router.resource('posts', function(router) {
        router.resource('comments', function() {
          router.resource('replies');
          router._routes['/posts/:postId/comments/:commentId/replies'].should.be.type('object');
          router._routes['/posts/:postId/comments/:commentId/replies'].get.should.be.type('object');
          router._routes['/posts/:postId/comments/:commentId/replies'].post.should.be.type('object');
          router._routes['/posts/:postId/comments/:commentId/replies/:id'].get.should.be.type('object');
          router._routes['/posts/:postId/comments/:commentId/replies/:id'].patch.should.be.type('object');
          router._routes['/posts/:postId/comments/:commentId/replies/:id']['delete'].should.be.type('object');
          done();
        });
      });
    });

    it('adds sub routes to the parent resource namespace', function(done) {
      this.router.resource('posts', function(router) {
        router.get('authors', 'posts#getAuthors');
        router._routes['/posts/authors'].should.be.type('object');
        router._routes['/posts/authors'].get.should.be.type('object');
        router._routes['/posts/authors'].get.controller.should.equal('posts');
        router._routes['/posts/authors'].get.action.should.equal('getAuthors');
        done();
      });
    });

    it('calls the sub routes callback passing it the router', function() {
      var _this = this;
      this.router.resource('posts', 'postsCtrl', function(router) {
        router.should.equal(_this.router);
      });
    });

    it('switches the url context when entering the sub routes callback', function() {
      var _this = this;
      this.router.resource('posts', 'postsCtrl', function(router) {
        _this.router._context.length.should.equal(1);
        _this.router._context[0].should.equal('posts');
        _this.router._contextIdToken.should.equal(':postId');
      });
    });

    it('restores the url context when after exiting sub routes callback', function() {
      var executed = false;
      this.router.resource('posts', 'postsCtrl', function(router) {
        executed = true;
      });
      executed.should.be.true;
      this.router._context.length.should.equal(0);
      (!this.router._contextIdToken).should.be.true;
    });
  });
});
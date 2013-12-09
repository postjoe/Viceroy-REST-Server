
var lingo = require('lingo');
var tools = require('primitive');


/**
 * Creates viceroy middleware for viceroy REST
 * server.
 * @param {Viceroy}           viceroy An instance of viceroy.
 * @param {ViceroyRESTServer} server  An instance of viceroy REST server.
 */
function Middleware(viceroy, server) {
  var _this = this;

  // validate the args
  if(typeof viceroy != 'object') {
    throw new Error('viceroy must be an object');
  }
  if(typeof server != 'object') {
    throw new Error('server must be an object');
  }
  if(typeof server.opts != 'object') {
    throw new Error('server.opts must be an object');
  }
  if(typeof server.app != 'function') {
    throw new Error('server.app must be an instance of a connect application.');
  }
  if(typeof server.router != 'object') {
    throw new Error('server.router must be an object.');
  }

  // setup the instance
  this.viceroy = viceroy;
  this.app = server.app;
  this.opts = server.opts;
  this.router = server.router;
  this._models = {};
  this._controllers = server._controllers;

  // bind requests to the routes
  this.app.use(function(req, res, next) {
    _this._handleRequest(req, res, next);
  });
}

Middleware.prototype.augmentModel = function(Model) {

  // ignore bad models
  if(typeof Model != 'function') { return; }
  if(typeof Model.name != 'string') { return; }
  if(Model.name.length < 1) { return; }

  // add the model to the _models object.
  this._models[Model.name] = Model;

  // create a controller for the model.
  var controllerName = lingo.en.pluralize(Model.name.toLowerCase());
  if(!this._controllers[controllerName]) {
    this._controllers[controllerName] = this._createModelController(Model);
  }
};

Middleware.prototype._handleRequest = function(req, res, next) {

  // loop through the routes and find any that have not been bound.
  var result = this._findRouteByUrl(req.url);
  if(!result) { next(); return; }

  // get the route and params.
  var route = result.route[req.method.toLowerCase()];
  if(!route) { next(); return; }


  // get the controller.
  var controller = this._controllers[route.controller];
  if(!controller) { next(); }
  if(!controller[route.action]) { next(); return; }

  // backup and set the params
  var _params = req.params;
  req.params = result.params;

  // run the middleware
  if(route.middleware.length > 0) {
    var i = 0;
    (function exec() {
      route.middleware[i](req, res, function(err) {
        if(err) { next(err); return; }
        i += 1;
        if(i < route.middleware.length) {
          exec();
        } else {
          // TODO: look for and use `not` and 
          // `only` if set on the req.
          // execute the controller and retore the
          // params
          controller[route.action](req, res, next);
          req.params = _params;
        }
      });
    })();
  } else {
    controller[route.action](req, res, next);
    req.params = _params;
  }
};

Middleware.prototype._findRouteByUrl = function(requestUrl) {
  var routes = this.router._routes;
  var result = {
    route: {},
    params: {}
  };

  // get the request chunks as fixup the url
  var requestChunks = requestUrl.split('/');
  for(var i = 0; i < requestChunks.length; i += 1) {
    if(requestChunks[i].length < 1) { requestChunks.splice(i, 1); i -= 1; }
  }
  requestUrl = '/' + requestChunks.join('/');

  // return if there is a direct match.
  if(routes[requestUrl]) {
    result.route = routes[requestUrl];
    return result;
  }

  for(var routeUrl in routes) {

    // get the route chunks.
    var routeChunks = routeUrl.split('/');
    for(var i = 0; i < routeChunks.length; i += 1) {
      if(routeChunks[i].length < 1) { routeChunks.splice(i, 1); i -= 1; }
    }
    routeUrl = '/' + routeChunks.join('/');

    // skip routes that are different lengths.
    if(routeChunks.length != requestChunks.length) { continue; }

    var isMatch = true;
    var params = {};
    for(var i = 0; i < routeChunks.length; i += 1) {
      var routeChunk = routeChunks[i];
      var requestChunk = requestChunks[i];

      // extract params
      if(routeChunk[0] == ':') { params[routeChunk.substr(1)] = requestChunk; continue; }

      // if not a match.
      if(routeChunk != requestChunk) { isMatch = false; break; }
    }

    if(isMatch) {
      result.route = routes[routeUrl];
      result.params = params;
      return result;
    }
  }
};

Middleware.prototype._createModelController = function(Model) {

  // create the model controller
  var controller = {
    index: function(req, res, next) {
      Model.find(req.query, function(err, modelSet) {
        if(err) { next(err); return; }
        if(!modelSet) {
          res.writeHead(412);
          res.end();
          return;
        }
        res.writeHead(200);
        res.write(modelSet.toString());
        res.end();
      });
    },
    show: function(req, res, next) {
      if(req.params.id) {
        req.params._id = new Model.types.ID(req.params.id);
        delete req.params.id;
      }
      Model.findOne(req.params, function(err, model) {
        if(err) { next(err); return; }
        if(!model) {
          res.writeHead(412);
          res.end();
          return;
        }
        res.writeHead(200);
        res.write(model.toString());
        res.end();
      });
    },
    create: function(req, res, next) {
      if(typeof req.body != 'object') {
        next(new Error('req.body must be an object'));
      }
      Model.create(req.body, function(err, model) {
        if(err) { next(err); return; }
        res.writeHead(201);
        res.write(model.toString());
        res.end();
      });
    },
    update: function(req, res, next) {
      if(req.params.id) {
        req.params._id = new Model.types.ID(req.params.id);
        delete req.params.id;
      }
      Model.findOne(req.params, function(err, model) {
        if(err) { next(err); return; }
        if(!model) {
          res.writeHead(412);
          res.end();
          return;
        }
        tools.delta.apply(model, req.body);
        model.save(function(err, model) {
          if(err) { next(err); return; }
          res.writeHead(204);
          res.write(model.toString());
          res.end();
        });
      });
    },
    destroy: function(req, res, next) {
      if(req.params.id) {
        req.params._id = new Model.types.ID(req.params.id);
        delete req.params.id;
      }
      Model.remove(req.params, function(err) {
        if(err) { next(err); return; }
        res.writeHead(204);
        res.end();
      });
    }
  };

  return controller;
};

module.exports = Middleware;

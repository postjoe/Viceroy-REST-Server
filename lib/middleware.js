var baseController = require('./base-controller');
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
  this.tokens = server.tokens;
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
  var controllerName = lingo.en.pluralize(tools.camelize(Model.name[0].toLowerCase() + Model.name.substr(1)));
  this._controllers[controllerName] = this._extendModelController(Model, this._controllers[controllerName]);
};

Middleware.prototype._handleRequest = function(req, res, next) {

  // grab the url and remove any query string garbage.
  var url = req.url.split('?')[0];

  // loop through the routes and find any that have not been bound.
  var result = this._findRouteByUrl(url);
  if(!result) { next(); return; }

  // get the route and params.
  var route = result.route[req.method.toLowerCase()];
  if(!route) { next(); return; }

  // get the controller.
  var controller = this._controllers[route.controller];
  if(!controller) { next(); return; }
  if(!controller[route.action]) { next(); return; }

  // backup and set the params
  var _params = req.params;
  req.params = result.params;
  req.context = tools.merge([], route.context, true);

  baseController.handleRequest(this._models, req, res, function() {

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
            controller[route.action](req, res, function(err) {
              req.params = _params;
              return next(err);
            });
          }
        });
      })();
    } else {
      controller[route.action](req, res, function(err) {
        req.params = _params;
        return next(err);
      });
    }
  });
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
      if(routeChunk[0] == ':') {
        params[routeChunk.substr(1)] = requestChunk;
        continue;
      }

      // if not a match
      if(routeChunk != requestChunk) { isMatch = false; break; }
    }

    if(isMatch) {
      result.route = routes[routeUrl];
      result.params = params;
      return result;
    }
  }
};

Middleware.prototype._extendModelController = function(Model, controller) {
  var _this = this;

  // defaults
  controller = controller || {};

  // type validation
  if(typeof Model != 'function') {
    throw new Error('Model must be a model constructor');
  }
  if(typeof controller != 'object') {
    throw new Error('controller must be an object');
  }

  // create the default actions
  var defaultActions = ['index', 'show', 'create', 'update', 'destroy']; 
  defaultActions.forEach(function(actionName) {
    if(controller[actionName] === undefined) {
      controller[actionName] = function(req, res, next) {
        baseController.Model = controller.Model;
        baseController.Models = _this._models;
        baseController[actionName](req, res, next);
      };
    } 
  });

  return controller;
};


module.exports = Middleware;

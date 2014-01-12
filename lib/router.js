
var lingo = require('lingo');
var path = require('path');
var tools = require('primitive');


/**
 * Creates a router instance.
 * @constructor
 * @param {ViceroyRESTServer} server An instance of viceroy REST server.
 */
function Router(server) {

  // validate the args
  if(typeof server != 'object') {
    throw new Error('server must be an object');
  }
  if(typeof server.opts != 'object') {
    throw new Error('server.opts must be an object');
  }
  if(typeof server.app != 'function') {
    throw new Error('server.app must be an instance of a connect application');
  }
  if(typeof server.tokens != 'object') {
    throw new Error('server.tokens must be a object');
  }
  if(typeof server.tokens.id != 'string') {
    throw new Error('server.tokens.id must be a string');
  }
  if(typeof server.tokens.subId != 'string') {
    throw new Error('server.tokens.subId must be a string');
  }
  if(server.opts.baseUrl && typeof server.opts.baseUrl != 'string') {
    throw new Error('server.opts.baseUrl must be a string');
  }

  // setup the instance.
  this.opts = server.opts;
  this.tokens = server.tokens;
  this.state = 'ready';
  this._routes = {};
  this._context = [];
  this._resourceContext = [];

  // if the opts base url is set then set it as the base context.
  if(this.opts.baseUrl) {
    var uris = this._urlToUris(this.opts.baseUrl);
    for(var i = 0; i < uris.length; i += 1) {
      this.context.push(uris[i]);
    }
  }
}

/**
 * Calls a callback that is expected to setup the routes for the server.
 * @param  {String|Function} routesLoader A path to a module or callback.
 * @chainable
 */
Router.prototype.loadRoutes = function(routesLoader) {

  if(this.state != 'ready') {
    throw new Error('Cannot load routes. The router is not ready');
  }
  this.state = 'loading';

  // throw an error if the routes load is not a
  // function.
  if(typeof routesLoader != 'function') {
    throw new Error('routesLoader must be a function');
  }

  // load the routes, set the state to ready, and return.
  routesLoader(this);
  this.state = 'ready';
  return this;
};

Router.prototype.resource = function(resourceUrl, opts, subRouteLoader) {

  // remapping
  if(typeof opts == 'function') {
    subRouteLoader = opts;
    opts = {};
  }

  // defaults
  opts = opts || {};
  if(typeof opts == 'string') { opts = this._parseStrRouteOpts(opts); }
  if(opts.middleware && typeof opts.middleware == 'function') {
    opts.middleware = [opts.middleware];
  }
  if(opts.middleware && typeof opts.middleware == 'object' && opts.middleware.constructor != Array) {
    opts.middleware = [opts.middleware];
  }
  if(typeof opts.only == 'string') {
    opts.only = [opts.only];
  }
  if(typeof opts.not == 'string') {
    opts.not = [opts.not];
  }
  opts = opts || {};
  opts.only = opts.only || ['index', 'show', 'create', 'update', 'destroy'];
  opts.not = opts.not || [];
  opts.middleware = opts.middleware || [];

  // throw on invalid args
  if(typeof resourceUrl != 'string') {
    throw new Error('resourceUrl must be a string');
  }
  if(typeof opts != 'object') {
    throw new Error('opts must be an object');
  }
  if(opts.controller !== undefined && typeof opts.controller != 'string') {
    throw new Error('opts.controller must be a string');
  }
  if(typeof opts.only != 'object' || opts.only.constructor != Array) {
    throw new Error('opts.only must be an array');
  }
  if(typeof opts.not != 'object' || opts.not.constructor != Array) {
    throw new Error('opts.not must be an array');
  }
  if(typeof opts.middleware != 'object' || opts.middleware.constructor != Array) {
    throw new Error('opts.middleware must be an array');
  }
  if(opts.singular !== undefined && typeof opts.singular != 'boolean') {
    throw new Error('opts.singular must be a boolean');
  }

  // convert the opts.only to an object
  var actions = {};
  for(var i = 0; i < opts.only.length; i += 1) {
    actions[opts.only[i]] = true;
  }
  for(var i = 0; i < opts.not.length; i += 1) {
    if(actions[opts.not[i]]) {
      delete actions[opts.not[i]];
    }
  }
  delete opts.only;
  delete opts.not;

  // chunk the resource url and get the name.
  var uris = this._urlToUris(resourceUrl);
  var resourceName = tools.camelize(uris[uris.length - 1]);
  opts.controller = opts.controller || resourceName;
  var contextIdToken = this._contextIdToken;

  // opts.singular was not set then set it based
  // on whether or not the resource name is
  // singular.
  if(opts.singular === undefined) {
    opts.singular = lingo.en.isSingular(resourceName);
  }

  // if a parent resource id token is set then add
  // it to the context.
  if(contextIdToken) { this._context.push(contextIdToken); }

  // add the current uri chunks to the context
  for(var i = 0; i < uris.length; i += 1) {
    this._context.push(uris[i]);
  }
  
  // create the id tokens. Replace the context
  // id token.
  var idToken = this._getIdToken(resourceName);
  var lastContextIdToken = this._contextIdToken;
  var subIdToken = this._getSubIdToken(resourceName);
  this._contextIdToken = subIdToken;

  // update the previous resource
  var lastResourceContext = this._resourceContext[this._resourceContext.length - 1];
  if(lastResourceContext) {
    lastResourceContext.idToken = lastResourceContext._subIdToken;
  }

  // set the resource name context
  this._resourceContext.push({
    resourceName: resourceName,
    resourceController: opts.controller,
    idToken: idToken,
    _idToken: idToken,
    _subIdToken: subIdToken
  });

  // grab the middlware so we have the orginal
  // set.
  var middleware = opts.middleware;

  // setup each route for the resource.
  if(opts.singular) {
    if(actions.show) {
      opts.action = 'show';
      opts.middleware = this._filterMiddleware(opts.action, middleware);
      this._bind('get', '', opts);
    }
    if(actions.create) {
      opts.action = 'create';
      opts.middleware = this._filterMiddleware(opts.action, middleware);
      this._bind('post', '', opts);
    }
    if(actions.update) {
      opts.action = 'update';
      opts.middleware = this._filterMiddleware(opts.action, middleware);
      this._bind('put', '', opts);
      this._bind('patch', '', opts);
    }
    if(actions.destroy) {
      opts.action = 'destroy';
      opts.middleware = this._filterMiddleware(opts.action, middleware);
      this._bind('delete', '', opts);
    }
  } else {
    if(actions.index) {
      opts.action = 'index';
      opts.middleware = this._filterMiddleware(opts.action, middleware);
      this._bind('get', '', opts);
    }
    if(actions.show) {
      opts.action = 'show';
      opts.middleware = this._filterMiddleware(opts.action, middleware);
      this._bind('get', idToken, opts);
    }
    if(actions.create) {
      opts.action = 'create';
      opts.middleware = this._filterMiddleware(opts.action, middleware);
      this._bind('post', '', opts);
    }
    if(actions.update) {
      opts.action = 'update';
      opts.middleware = this._filterMiddleware(opts.action, middleware);
      this._bind('put', idToken, opts);
      this._bind('patch', idToken, opts);
    }
    if(actions.destroy) {
      opts.action = 'destroy';
      opts.middleware = this._filterMiddleware(opts.action, middleware);
      this._bind('delete', '', opts);
      this._bind('delete', idToken, opts);
    }
  }

  // if there is a sub route loader then run it.
  if(subRouteLoader) { subRouteLoader(this); }

  // if a parent resource id token is was then
  // pop it off.
  if(contextIdToken) { this._context.pop(); }

  // pop off the context uris.
  for(var i = 0; i < uris.length; i += 1) {
    this._context.pop();
  }

  // reset the context id token.
  this._contextIdToken = lastContextIdToken;
  this._resourceContext.pop();
  var resourceContext = this._resourceContext[this._resourceContext.length - 1];
  if(resourceContext) {
    resourceContext.idToken = resourceContext._idToken;
  }
};

var methods = ['get', 'post', 'put', 'patch', 'delete'];
methods.forEach(function(method) {
  var methodName = method == 'delete' && 'del' || method;
  Router.prototype[methodName] = function(routeUrl, opts, subRouteLoader) {
    this._bind(method, routeUrl, opts, subRouteLoader);
  };
});

Router.prototype._bind = function(method, routeUrl, opts, subRouteLoader) {

  // remapping
  if(typeof opts == 'string') { opts = this._parseStrRouteOpts(opts); }

  // defaults
  opts = opts || {};
  opts.middleware = opts.middleware || [];
  if(typeof opts.middleware == 'object' && opts.middleware.constructor != Array) {
    opts.middleware = [opts.middleware];
  }
  var lastResourceContext = this._resourceContext[this._resourceContext.length - 1];
  opts.controller = opts.controller || lastResourceContext &&
                    lastResourceContext.resourceController || 'root';
  opts.action = opts.action || '';

  // validation
  if(typeof method != 'string') {
    throw new Error('method must be a string');
  }
  if(['get', 'post', 'put', 'patch', 'delete'].indexOf(method) == -1) {
    throw new Error('method must be get, post, put, patch, or delete');
  }
  if(typeof routeUrl != 'string') {
    throw new Error('routeUrl must be a string');
  }
  if(typeof opts != 'object') {
    throw new Error('opts must be an object');
  }
  if(typeof opts.controller != 'string') {
    throw new Error('opts.controller must be an string');
  }
  if(typeof opts.action != 'string') {
    throw new Error('opts.action must be an string');
  }
  if(typeof opts.middleware != 'object' || opts.middleware.constructor != Array) {
    throw new Error('opts.middleware must be an array');
  }
  if(subRouteLoader && typeof subRouteLoader != 'function') {
    throw new Error('subRouteLoader must be a function');
  }

  // get the uris and the full url.
  var uris = this._urlToUris(routeUrl);
  if(opts.action === '') { opts.action = uris[uris.length - 1]; }
  var url = this._urisToUrl(uris);
  var contextUrl = this._urisToUrl(this._context);

  var fullUrl;
  if(contextUrl && url) {
    fullUrl = '/' + contextUrl + '/' + url;
  } else if(contextUrl) {
    fullUrl = '/' + contextUrl;
  } else if(url) {
    fullUrl = '/' + url;
  }

  // register the routes.
  if(!this._routes[fullUrl]) { this._routes[fullUrl] = {}; }

  var context = [];
  for(var i = 0; i < this._resourceContext.length; i += 1) {
    context.push({
      idToken: this._resourceContext[i].idToken,
      resourceName: this._resourceContext[i].resourceName,
      resourceController: this._resourceContext[i].resourceController,
    });
  }

  this._routes[fullUrl][method] = {
    url: fullUrl,
    action: opts.action,
    controller: opts.controller,
    middleware: opts.middleware,
    context: context
  };


  // if there is a sub route loader then run it.
  if(subRouteLoader) {

    // add the current uri chunks to the context
    for(var i = 0; i < uris.length; i += 1) {
      this._context.push(uris[i]);
    }
    subRouteLoader(this);

    // pop off the context uris.
    for(var i = 0; i < uris.length; i += 1) {
      this._context.pop();
    }
  }
};

Router.prototype._filterMiddleware = function(action, middlewareSet) {

  if(typeof action != 'string') {
    throw new Error('action must be a string');
  }
  if(typeof middlewareSet != 'object' || middlewareSet.constructor != Array) {
    throw new Error('middlewareSet must be an array');
  }

  // clone the middleware set
  middlewareSet = middlewareSet.slice(0);

  for(var i = 0; i < middlewareSet.length; i += 1) {
    var middleware = middlewareSet[i];

    // remove non functions and objects
    if(['function', 'object'].indexOf(typeof middleware) < 0) {
      throw new Error('middleware must be an object or function');
    }

    // middleware object
    if(typeof middleware == 'object') {

      // defaults
      if(typeof middleware.not == 'string') { middleware.not = [middleware.not]; }
      if(typeof middleware.only == 'string') { middleware.only = [middleware.only]; }

      // validation
      if(typeof middleware.handler != 'function') {
        throw new Error('middleware.handler must be a function');
      }
      if(
        middleware.not &&
        (
          typeof middleware.not != 'object' ||
          middleware.not.constructor != Array
        )
      ) {
        throw new Error('middleware.not must be an array');
      }
      if(
        middleware.only &&
        (
          typeof middleware.only != 'object' ||
          middleware.only.constructor != Array
        )
      ) {
        throw new Error('middleware.only must be an array');
      }

      // not
      if(middleware.not) {
        if(middleware.not.indexOf(action) > -1) {
          middlewareSet.splice(i, 1);
          i -= 1;
        } else {
          middlewareSet[i] = middleware.handler;
        }
      } 

      // only
      else if(middleware.only) {
        if(middleware.only.indexOf(action) < 0) {
          middlewareSet.splice(i, 1);
          i -= 1;
        } else {
          middlewareSet[i] = middleware.handler;
        }
      }

      // anything else
      else {
        middlewareSet[i] = middleware.handler;
      }
    }
  }

  return middlewareSet;
};

Router.prototype._parseStrRouteOpts = function(optsStr) {
  if(typeof optsStr != 'string') {
    throw new Error('optsStr must be a string');
  }
  var optsArr = optsStr.split('#');
  var opts = {
    controller: optsArr[0],
    action: optsArr[1]
  };
  return opts;
};

Router.prototype._getIdToken = function(resourceName) {
  return ':' + this.tokens.id.replace('!{resourceName}', lingo.en.singularize(resourceName));
};

Router.prototype._getSubIdToken = function(resourceName) {
  return ':' + this.tokens.subId.replace('!{resourceName}', lingo.en.singularize(resourceName));
};

Router.prototype._urlToUris = function(url) {
  if(typeof url != 'string') {
    throw new Error('url must be a string');
  }
  var uris = url.split('/');
  while(uris[uris.length - 1] == '') { uris.pop(); }
  while(uris[0] == '') { uris.shift(); }
  return uris;
};

Router.prototype._urisToUrl = function(uris) {
  if(typeof uris != 'object' || uris.constructor != Array) {
    throw new Error('uris must be an array');
  }
  return uris.join('/');
};

module.exports = Router;

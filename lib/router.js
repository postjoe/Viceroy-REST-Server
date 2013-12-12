
var lingo = require('lingo');
var path = require('path');


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
  if(typeof server.resourceIdPrefix != 'string') {
    throw new Error('server.resourceIdPrefix must be a string');
  }
  if(typeof server.resourceIdSuffix != 'string') {
    throw new Error('server.resourceIdSuffix must be a string');
  }
  if(server.opts.baseUrl && typeof server.opts.baseUrl != 'string') {
    throw new Error('server.opts.baseUrl must be a string');
  }

  // setup the instance.
  this.opts = server.opts;
  this.resourceIdPrefix = server.resourceIdPrefix;
  this.resourceIdSuffix = server.resourceIdSuffix;
  this.state = 'ready';
  this._routes = {};
  this._contextIdToken = '';
  this._contextUrl = this.opts.baseUrl && this._removeTrailingSlash(this.opts.baseUrl) || '';
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

Router.prototype.resource = function(resourceName, opts, subRouteLoader) {

  // remapping
  if(typeof opts == 'function') {
    subRouteLoader = opts;
    opts = {};
  }

  // add parent resource id
  var lastContextUrl = this._contextUrl;
  if(this._contextIdToken) {
    this._contextUrl += '/' + this._contextIdToken;
  }

  // defaults
  if(typeof opts == 'string') { opts = this._parseStrRouteOpts(opts); }
  opts = opts || {};
  opts.controller = opts.controller || resourceName;
  opts.only = opts.only || ['index', 'show', 'create', 'update', 'destroy'];
  opts.not = opts.not || [];
  opts.middleware = opts.middleware || [];

  // throw on invalid args
  if(typeof resourceName != 'string') {
    throw new Error('resourceName must be a string');
  }
  if(typeof opts != 'object') {
    throw new Error('opts must be an object');
  }
  if(typeof opts.controller != 'string') {
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

  // get the id token
  if(actions.index) {
    opts.action = 'index';
    this._bind('get', resourceName, opts);
  }
  if(actions.show) {
    opts.action = 'show';
    this._bind('get', resourceName + '/:id', opts);
  }
  if(actions.create) {
    opts.action = 'create';
    this._bind('post', resourceName, opts);
  }
  if(actions.update) {
    opts.action = 'update';
    this._bind('put', resourceName + '/:id', opts);
    this._bind('patch', resourceName + '/:id', opts);
  }
  if(actions.destroy) {
    opts.action = 'destroy';
    this._bind('delete', resourceName, opts);
    this._bind('delete', resourceName + '/:id', opts);
  }

  this._contextUrl = lastContextUrl;

  // if there is a sub route loader then run it.
  if(subRouteLoader) {

    // set the conext url.
    var lastContextUrl = this._contextUrl;
    this._contextUrl = '/' + resourceName;
    this._contextIdToken = this._createIdToken(resourceName);

    // run the sub route loader.
    subRouteLoader(this);

    // clear the context id token and reset the 
    // context url.
    this._contextIdToken = '';
    this._contextUrl = lastContextUrl;
  }
};

Router.prototype.get = function(routeUrl, opts, subRouteLoader) {
  
  // throw on invalid args
  if(typeof routeUrl != 'string') {
    throw new Error('routeUrl must be a string');
  }
  if(typeof opts == 'string') { opts = this._parseStrRouteOpts(opts); }
  if(typeof opts != 'object') {
    throw new Error('opts must be an object');
  }

  opts.action = opts.action || 'show';
  this._bind('get', routeUrl, opts, subRouteLoader);
};

Router.prototype.post = function(routeUrl, opts, subRouteLoader) {
  
  // throw on invalid args
  if(typeof routeUrl != 'string') {
    throw new Error('routeUrl must be a string');
  }
  if(typeof opts == 'string') { opts = this._parseStrRouteOpts(opts); }
  if(typeof opts != 'object') {
    throw new Error('opts must be an object');
  }

  opts.action = opts.action || 'create';
  this._bind('post', routeUrl, opts, subRouteLoader);
};

Router.prototype.put = function(routeUrl, opts, subRouteLoader) {
  
  // throw on invalid args
  if(typeof routeUrl != 'string') {
    throw new Error('routeUrl must be a string');
  }
  if(typeof opts == 'string') { opts = this._parseStrRouteOpts(opts); }
  if(typeof opts != 'object') {
    throw new Error('opts must be an object');
  }

  opts.action = opts.action || 'update';
  this._bind('put', routeUrl, opts, subRouteLoader);
};

Router.prototype.patch = function(routeUrl, opts, subRouteLoader) {
  
  // throw on invalid args
  if(typeof routeUrl != 'string') {
    throw new Error('routeUrl must be a string');
  }
  if(typeof opts == 'string') { opts = this._parseStrRouteOpts(opts); }
  if(typeof opts != 'object') {
    throw new Error('opts must be an object');
  }

  opts.action = opts.action || 'update';
  this._bind('patch', routeUrl, opts, subRouteLoader);
};

Router.prototype.del = function(routeUrl, opts, subRouteLoader) {
  
  // throw on invalid args
  if(typeof routeUrl != 'string') {
    throw new Error('routeUrl must be a string');
  }
  if(typeof opts == 'string') { opts = this._parseStrRouteOpts(opts); }
  if(typeof opts != 'object') {
    throw new Error('opts must be an object');
  }

  opts.action = opts.action || 'destroy';
  this._bind('delete', routeUrl, opts, subRouteLoader);
};

Router.prototype._bind = function(method, routeUrl, opts, subRouteLoader) {

  // throw on invalid args.
  if(typeof method != 'string') {
    throw new Error('method must be a string');
  }
  if(['get', 'post', 'put', 'patch', 'delete'].indexOf(method) == -1) {
    throw new Error('method must be get, post, put, patch, or delete');
  }
  if(subRouteLoader && typeof subRouteLoader != 'function') {
    throw new Error('subRouteLoader must be a function');
  }

  // ensure the route url has a trailing slash.
  routeUrl = this._removeTrailingSlash(routeUrl);

  // bind connect route.
  var fullRouteUrl = this._contextUrl + '/' + routeUrl;

  // register the routes.
  if(!this._routes[fullRouteUrl]) { this._routes[fullRouteUrl] = {}; }
  this._routes[fullRouteUrl][method] = {
    url: fullRouteUrl,
    action: opts.action,
    controller: opts.controller,
    middleware: opts.middleware
  };

  // if there is a sub route loader then run it.
  if(subRouteLoader) {

    // set the conext url.
    var lastContextUrl = this._contextUrl;
    this._contextUrl = fullRouteUrl;

    // run the sub route loader.
    subRouteLoader(this);

    // reset the context url.
    this._contextUrl = lastContextUrl;
  }
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

Router.prototype._removeTrailingSlash = function(url) {
  if(url[url.length - 1] == '/') { url = url.substr(0, url.length - 1); }
  return url;
};

Router.prototype._createIdToken = function(resourceName) {
  return ':' + this.resourceIdPrefix + lingo.en.singularize(resourceName) + this.resourceIdSuffix;
};

module.exports = Router;

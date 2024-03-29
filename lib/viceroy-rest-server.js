
var connect = require('connect');
var path = require('path');
var fs = require('fs');
var tools = require('primitive');

var Middleware = require('./middleware');
var baseController = require('./base-controller');
var Router = require('./router');


/**
 * Creates an instance of viceroy REST server.
 * @constructor
 * @param {Function} connectApp An instance of a connect app to serve the 
 *                              viceroy REST api on.
 * @param {Object}   opts       viceroy REST server options.
 */
function ViceroyRESTServer(connectApp, opts) {

  opts = opts || {};

  if(typeof connectApp != 'function') {
    throw new Error('connectApp must be an instance of a connect application.');
  }
  if(typeof opts != 'object') {
    throw new Error('opts must be an object.');
  }
  if(opts.controllersPath && typeof opts.controllersPath != 'string') {
    throw new Error('opts.controllersPath must be a string.');
  }

  this._controllers = {};

  //TODO: This info should come from viceroy
  this.tokens = {
    id: 'id',
    subId: '!{resourceName}Id'
  };
  this.baseController = baseController;
  this.app = connectApp || connect();
  this.app.use(connect.query());
  this.app.use(connect.json());
  this.opts = opts;
  this.router = new Router(this);
}

/**
 * Creates an instance of viceroy REST server for use with viceroy.use.
 * @return {Function} A factory function that accepts an instance of
 *                    viceroy (passed to it by viceroy.use), and returns an
 *                    instance of viceroy rest server middleware.
 */
ViceroyRESTServer.prototype.middleware = function() {
  var _this = this;
  return function(viceroy) {
    return new Middleware(viceroy, _this);
  };
};

/**
 * Loads controllers from a given directory path. If an object is passed
 * instead, it is assumed that each property on the object is a controller.
 * @param  {String|Object} controllers A path to a directory of controller
 *                                     modules, or an object of 
 *                                     controllers.
 * @chainable
 */
ViceroyRESTServer.prototype.loadControllers = function(controllers) {

  // if the controllers is a controller directory
  // path then load it.
  if(typeof controllers == 'string') {
    var controllersPath = path.resolve(process.cwd(), controllers);
    controllers = {};
    var controllerFiles = {};
    var controllersDir = fs.readdirSync(controllersPath);
    for(var i = 0; i < controllersDir.length; i += 1) {
      var controllerFilename = controllersDir[i];
      var controllerPath = path.join(controllersPath, controllerFilename);
      var controllerExt = path.extname(controllerFilename);
      var controllerName = tools.camelize(path.basename(controllerFilename, controllerExt));
      var controller = require(controllerPath);
      if(controller.Model){
        controllers[controllerName] = this._extendModelController(controller.Model, controller);
      } else {
        controllers[controllerName] = controller;
      }
    }
  }

  if(typeof controllers != 'object') {
    throw new Error('controllers must be an object');
  }

  // attach each controller.
  for(var controllerName in controllers) {
    if(!this._controllers[controllerName]) {
      this._controllers[controllerName] = {};
    }
    for(var actionName in controllers[controllerName]) {
      if(!this._controllers[controllerName][actionName]) {
        this._controllers[controllerName][actionName] = {};
      }
      this._controllers[controllerName][actionName] = controllers[controllerName][actionName];
    }
  }
  return this;
};

/**
 * Loads routes from a given path to routes config module, or using a 
 * passed function.
 * @param  {Function|String} routesLoader A function accepting the router 
 *                                        instance or a path to a module 
 *                                        that exports a function that 
 *                                        accepts the router instance.
 * @chainable
 */
ViceroyRESTServer.prototype.loadRoutes = function(routesLoader) {

  // if the routesLoader is a module path then 
  // load it.
  if(typeof routesLoader == 'string') {
    routesLoader = require(path.resolve(process.cwd(), routesLoader));
  }

  // load the routes, set the state to ready, and return.
  this.router.loadRoutes(routesLoader);
  return this;
};

ViceroyRESTServer.prototype._extendModelController = function(Model, controller) {
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
        baseController.handleRequest(_this._models, req, res, function() {
          baseController.Model = controller.Model;
          baseController.Models = _this._models;
          baseController[actionName](req, res, next);
        });
      };
    } 
  });

  return controller;
};


/**
 * A factory function for ViceroyRESTServer.
 * @param  {Function}          connectApp An instance of a connect app to 
 *                                        serve the viceroy REST api on.
 * @param  {Object}            opts       Viceroy REST server options.
 * @return {ViceroyRESTServer}            An instance of viceroy Rest
 *                                        server.
 */
module.exports = exports = function(connectApp, opts) {
  return new ViceroyRESTServer(connectApp, opts);
};
exports.ViceroyRESTServer = ViceroyRESTServer;
exports.Router = Router;
exports.Middleware = Middleware;

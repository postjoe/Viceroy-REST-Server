var tools = require('primitive');
var lingo = require('lingo');

exports.Model = false;
exports.Models = {};

exports.handleRequest = function(Model, req, res, next) {
  next();
};

exports.index = function(req, res, next) {
  var Model = this._getModel(req);
  this._buildQuery(req, function(err, query) {
    if(err) { next(err); return; }
    Model.find(query, function(err, modelSet) {
      if(err) { next(err); return; }
      res.writeHead(200, {
        'Content-Type': 'application/json'
      });
      res.end(modelSet.toString());
    });
  });
};

exports.show = function(req, res, next) {
  var Model = this._getModel(req);
  this._buildQuery(req, function(err, query) {
    if(err) { next(err); return; }
    Model.findOne(query, function(err, model) {
      if(err) { next(err); return; }
      if(!model) { res.writeHead(404); res.end(); return; }
      res.writeHead(200, {
        'Content-Type': 'application/json'
      });
      res.end(model.toString());
    });
  });
};

exports.create = function(req, res, next) {
  if(!req.body) { res.writeHead(400); res.end(); return; }
  var Model = this._getModel(req);

  var done = function(err, model) {
    if(err) { next(err); return; }
    res.writeHead(201, {
      'Content-Type': 'application/json'
    });
    res.end(model.toString());
  };

  if(req.context.length > 1) {
    var ctx = req.context[req.context.length - 1];
    this._getParentInstance(req, function(err, parent) {
      if(err) { next(err); return; }

      var singularResourceName = lingo.en.singularize(ctx.resourceName);
      if(typeof parent[ctx.resourceName] == 'function') {
        parent[ctx.resourceName].create(req.body, done);
      } else if(typeof parent[singularResourceName] == 'function') {
        parent[singularResourceName].create(req.body, done);
      } else {
        res.writeHead(400);
        res.end();
      }
    });
  } else {
    Model.create(req.body, done);
  }
};

exports.update = function(req, res, next) {
  if(!req.body) { res.writeHead(400); res.end(); return; }
  var Model = this._getModel(req);
  var update = this._applyUpdate;
  this._buildQuery(req, function(err, query) {
    if(err) { next(err); return; }
    Model.findOne(query, function(err, model) {
      if(err) { next(err); return; }
      if(!model) { res.writeHead(404); res.end(); return; }
      update(model, req.body);
      model.save(function(err, model) {
        if(err) { next(err); return; }
        res.writeHead(200, {
          'Content-Type': 'application/json'
        });
        res.end(model.toString());
      });
    });
  });
};

exports.destroy = function(req, res, next) {
  var Model = this._getModel(req);
  var update = this._applyUpdate;
  this._buildQuery(req, function(err, query) {
    if(err) { next(err); return; }
    Model.findOne(query, function(err, model) {
      if(err) { next(err); return; }
      if(!model) { res.writeHead(404); res.end(); return; }
      model.remove(function(err) {
        if(err) { next(err); return; }
        res.writeHead(204);
        res.end();
      });
    });
  });
};

exports._getModel = function(req) {
  var _this = this;
  return this.Model || (function() {
    var resourceController = req.context[req.context.length - 1].resourceController;
    var singularName = lingo.en.singularize(resourceController);
    var modelName = singularName[0].toUpperCase() + singularName.substr(1);
    return _this.Models[modelName];
  })();
};

exports._getParentInstance = function(req, callback) {

  // get the parent model
  var parentCtx = req.context[req.context.length - 2];
  var singularName = lingo.en.singularize(parentCtx.resourceController);
  var modelName = singularName[0].toUpperCase() + singularName.substr(1);
  var Model = this.Models[modelName];
  var id = req.params[parentCtx.idToken.substr(1)];

  // find the parent data by id
  Model.findOne({ _id: id }, callback);
};

exports._buildQuery = function(req, callback) {
  if(req.query._id === undefined) {

    // see if an id is given in the params.
    var ctx = req.context[req.context.length - 1];
    var id = req.params[ctx.idToken.substr(1)];

    // if an id is given in the params.
    if(id !== undefined) {
      req.query._id = id;
      callback(undefined, req.query);
    } else {
      var parentCtx = req.context[req.context.length - 2];

      // if there is no parent context then
      // grab everything.
      if(!parentCtx) { callback(undefined, req.query); return; }

      // get the parent model
      var singularName = lingo.en.singularize(parentCtx.resourceController);
      var modelName = singularName[0].toUpperCase() + singularName.substr(1);
      var Model = this.Models[modelName];
      var id = req.params[parentCtx.idToken.substr(1)];

      // find the parent data by id
      Model.findOne({ _id: id }, { raw: true }, function(err, data) {
        if(err) { callback(err); return; }

        // get the singluar name so we can get the
        // id field for the relation.
        var singularName = tools.camelize(lingo.en.singularize(ctx.resourceController));
        if(data[singularName + 'IDs']) {
          var ids = data[singularName + 'IDs'];
          callback(undefined, { _id: { '$in': ids } });
        } else if(data[singularName + 'ID']) {
          var id = data[singularName + 'ID'];
          callback(undefined, { _id: id });
        } else {
          callback();
        }
      });
    }
  } else {
    callback(undefined, req.query);
  }
};

exports._applyUpdate = function(model, newData) {
  var delta = true;
  for(var prop in newData) {
    if(prop.charAt(0) != '$') { delta = false; break; }
  }
  var data = model.data();
  var cache = tools.merge({}, model._data, true);
  if(delta) {
    tools.delta.apply(data, newData);
  } else {
    tools.merge(data, newData, true);
  }
  model.data(data);
  model._data = cache;
};

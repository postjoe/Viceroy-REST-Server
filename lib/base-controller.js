var tools = require('primitive');
var lingo = require('lingo');

exports.Model = false;
exports.Models = {};

exports.handleRequest = function(Model, req, res, next) {
  next();
};

exports.index = function(req, res, next) {
  var fetchChain = this._buildFetchChain(req.context, req.query, req.params);
  this._processFetchChain(fetchChain, function(err, modelSet) {
    if(err) { next(err); return; }
    if(!modelSet) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, {
      'Content-Type': 'application/json'
    });
    res.end(modelSet.toString());
  });
};

exports.create = function(req, res, next) {
  if(!req.body) { res.writeHead(400); res.end(); return; }
  var ctx = req.context.pop();
  if(req.context && req.context[0]) {
    var fetchChain = this._buildFetchChain(req.context, req.query, req.params);
    this._processFetchChain(fetchChain, function(err, modelSet) {
      if(err) { next(err); return; }
      if(!modelSet || !modelSet[0]) { res.writeHead(404); res.end(); return; }
      if(!modelSet[0][ctx.resourceName]) { res.writeHead(500); res.end(); return; }
      modelSet[0][ctx.resourceName].create(req.body, function(err, model) {
        if(err) { next(err); return; }
        res.writeHead(201, {
          'Content-Type': 'application/json'
        });
        res.end(model.toString());
      });
    });
  } else {
    var BaseModel = this._getBaseModel(ctx);
    BaseModel.create(req.body, function(err, model) {
      if(err) { next(err); return; }
      res.writeHead(201, {
        'Content-Type': 'application/json'
      });
      res.end(model.toString());
    });
  }
};

exports.show = function(req, res, next) {
  var fetchChain = this._buildFetchChain(req.context, req.query, req.params);
  this._processFetchChain(fetchChain, function(err, modelSet) {
    if(err) { next(err); return; }
    if(!modelSet || !modelSet[0]) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, {
      'Content-Type': 'application/json'
    });
    res.end(modelSet[0].toString());
  });
};

exports.update = function(req, res, next) {
  var _this = this;
  if(!req.body) { res.writeHead(400); res.end(); return; }
  var fetchChain = this._buildFetchChain(req.context, req.query, req.params);
  this._processFetchChain(fetchChain, function(err, modelSet) {
    if(err) { next(err); return; }
    if(!modelSet || !modelSet[0]) { res.writeHead(404); res.end(); return; }
    _this._applyUpdate(modelSet[0], req.body);
    modelSet[0].save(function(err, model) {
      if(err) { next(err); return; }
      res.writeHead(200, {
        'Content-Type': 'application/json'
      });
      res.end(model.toString());
    });
  });
};

exports.destroy = function(req, res, next) {
  var fetchChain = this._buildFetchChain(req.context, req.query, req.params);
  this._processFetchChain(fetchChain, function(err, modelSet) {
    if(err) { next(err); return; }
    if(!modelSet || !modelSet[0]) { res.writeHead(404); res.end(); return; }
    modelSet[0].remove(function(err) {
      if(err) { next(err); return; }
      res.writeHead(204);
      res.end();
    });
  });
};

exports._getBaseModel = function(fetchChunk) {
  var _this = this;
  return this.Model || (function() {
    var singularName = lingo.en.singularize(fetchChunk.resourceName);
    var modelName = singularName[0].toUpperCase() + singularName.substr(1);
    return _this.Models[modelName];
  })();
};

exports._buildFetchChain = function(context, query, params) {
  var fetchChain = [];
  var ctx;
  for(var i = 0; i < context.length; i += 1) {
    ctx = context[i];
    var id = params[ctx.idToken.substr(1)] || params._id;
    if(id !== undefined || i < context.length - 1) {
      fetchChain.push({
        query: { _id: id },
        resourceName: ctx.resourceName
      });
    } else {
      fetchChain.push({
        query: query,
        resourceName: ctx.resourceName
      });
    }
  }
  return fetchChain;
};

exports._processFetchChain = function(fetchChain, callback) {
  var _this = this;

  // get the base model
  var BaseModel = this._getBaseModel(fetchChain[0]);

  // begin fetching
  var i = 0;
  (function exec(model) {
    _this._processFetchChunk(model, fetchChain[i], function(err, modelSet) {
      if(err) { callback(err); return; }
      i += 1;
      if(!modelSet) {
        callback();
      } else if(i < fetchChain.length) {
        exec(modelSet[0]);
      } else {
        callback(undefined, modelSet);
      }
    });
  })(BaseModel);
};

exports._processFetchChunk = function(model, fetchChunk, callback) {
  if(typeof model == 'function' && typeof model.find == 'function') {
    if(fetchChunk.query._id !== undefined) {
      model.find(fetchChunk.query, { limit: 1 }, callback);
    } else {
      model.find(fetchChunk.query, callback);
    }
  } else if(typeof model[fetchChunk.resourceName] == 'function') {
    if(fetchChunk.query._id !== undefined) {
      model[fetchChunk.resourceName](fetchChunk.query, { limit: 1 }, callback);
    } else {
      model[fetchChunk.resourceName](fetchChunk.query, callback);
    }
  } else {
    callback();
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

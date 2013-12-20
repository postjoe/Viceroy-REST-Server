var tools = require('primitive');
var lingo = require('lingo');

exports.handleRequest = function(Model, req, res, next) {
  next();
};

exports.fetchContextModel = function(models, params, context, callback) {
  var getModelbyContext = function(currentContext, callback) {

    // get the singlular form of the resource name
    var resourceName = currentContext.resourceName;
    var singularResourceName = lingo.en.singularize(resourceName);
    var model = currentContext.model;
    var id = params[currentContext.idToken.substr(1)];
    var query = {};
    if(id) { query._id = id; }

    // fetch from model
    if(model) {

      // check for a *many getter
      if(model[resourceName]) {
        model[resourceName](query, function(err, modelSet) {
          if(err) { callback(err); return; }
          callback(undefined, modelSet[0]);
        });
      }

      // check for a *one getter
      else if(model[singularResourceName]) {
        model[singularResourceName](query, callback);
      }
    }

    // get model
    else {
      var modelName = singularResourceName[0].toUpperCase() + singularResourceName.substr(1);
      models[modelName].findOne(query, callback);
    }
  };

  var i = 0;
  (function getNextModel(err, model) {
    if(err) { callback(err); return; }
    var currentContext = context[i];
    getModelbyContext(currentContext, function(err, model) {
      if(err) { callback(err); return; }
      i += 1;
      if(context[i]) {
        context[i].model = model;
        getNextModel();
      } else {
        callback(undefined, model);
      }
    });
  })();
};

exports.index = function(models, req, res, next) {
  var resourceName = req.context.pop().resourceName;

  if(req.context.length > 0) {
    this.fetchContextModel(models, req.params, req.context, function(err, model) {
      if(err) { next(err); return; }
      if(model && model[resourceName]) {
        model[resourceName](req.query, function(err, modelSet) {
          res.writeHead(200, {
            'Content-Type': 'application/json'
          });
          res.end(modelSet.toString());
        });
      }
      else {
        res.writeHead(404);
        res.end();
        return;
      }
    });
  } else {
    var singularResourceName = lingo.en.singularize(resourceName);
    var modelName = singularResourceName[0].toUpperCase() + singularResourceName.substr(1);
    models[modelName].find(req.query, function(err, modelSet) {
      if(err) { next(err); return; }
      res.writeHead(200, {
        'Content-Type': 'application/json'
      });
      res.end(modelSet.toString());
    });
  }
};

exports.show = function(models, req, res, next) {
  this.fetchContextModel(models, req.params, req.context, function(err, model) {
    if(err) { next(err); return; }
    if(!model) {
      res.writeHead(404);
      res.end();
      return;
    }
    res.writeHead(200, {
      'Content-Type': 'application/json'
    });
    res.end(model.toString());
  });
};

exports.create = function(models, req, res, next) {
  if(typeof req.body != 'object') {
    next(new Error('req.body must be an object'));
  }

  var resourceName = req.context.pop().resourceName;
  if(req.context.length > 0) {
    this.fetchContextModel(models, req.params, req.context, function(err, model) {
      if(err) { next(err); return; }
      if(!model) {
        res.writeHead(404);
        res.end();
        return;
      }
      model[resourceName].create(req.body, function(err, model) {
        if(err) { next(err); return; }
        res.writeHead(201, {
          'Content-Type': 'application/json'
        });
        res.end(model.toString());
      });
    });
  } else {
    var singularResourceName = lingo.en.singularize(resourceName);
    var modelName = singularResourceName[0].toUpperCase() + singularResourceName.substr(1);
    models[modelName].create(req.body, function(err, model) {
      if(err) { next(err); return; }
      res.writeHead(201, {
        'Content-Type': 'application/json'
      });
      res.end(model.toString());
    });
  }
};

exports.update = function(models, req, res, next) {
  this.fetchContextModel(models, req.params, req.context, function(err, model) {
    if(err) { next(err); return; }
    if(!model) {
      res.writeHead(404);
      res.end();
      return;
    }
    var isDelta = false;
    for(var actionName in req.body) {
      if(actionName[0] == '$') {
        isDelta = true;
        break;
      }
    }
    if(isDelta) {
      tools.delta.apply(model, req.body);
    } else {
      tools.merge(model, req.body, true);
    }
    model.save(function(err, model) {
      if(err) { next(err); return; }
      res.writeHead(200, {
        'Content-Type': 'application/json'
      });
      res.end(model.toString());
    });
  });
};

exports.destroy = function(models, req, res, next) {
  this.fetchContextModel(models, req.params, req.context, function(err, model) {
    if(!model) {
      res.writeHead(404);
      res.end();
      return;
    }
    model.remove(function(err) {
      if(err) { next(err); return; }
      res.writeHead(204);
      res.end();
    });
  });
};

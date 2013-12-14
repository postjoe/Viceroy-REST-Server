var tools = require('primitive');

exports.handleRequest = function(Model, req, res, next) {
  next();
};

exports.index = function(Model, req, res, next) {
  Model.find(req.query, function(err, modelSet) {
    if(err) { next(err); return; }
    if(!modelSet) {
      res.writeHead(412);
      res.end();
      return;
    }
    res.writeHead(200, {
      'Content-Type': 'application/json'
    });
    res.write(modelSet.toString());
    res.end();
  });
};

exports.show = function(Model, req, res, next) {
  Model.findOne(req.params, function(err, model) {
    if(err) { next(err); return; }
    if(!model) {
      res.writeHead(412);
      res.end();
      return;
    }
    res.writeHead(200, {
      'Content-Type': 'application/json'
    });
    res.end(model.toString());
  });
};

exports.create = function(Model, req, res, next) {
  if(typeof req.body != 'object') {
    next(new Error('req.body must be an object'));
  }
  if(req.body.constructor == Array) {
    Model.insert(req.body, function(err, modelSet) {
      if(err) { next(err); return; }
      res.writeHead(201, {
        'Content-Type': 'application/json'
      });
      res.end(modelSet.toString());
    });
  } else {
    Model.create(req.body, function(err, model) {
      if(err) { next(err); return; }
      res.writeHead(201, {
        'Content-Type': 'application/json'
      });
      res.end(model.toString());
    });
  }
};

exports.update = function(Model, req, res, next) {
  Model.findOne(req.params, function(err, model) {
    if(err) { next(err); return; }
    if(!model) {
      res.writeHead(412);
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
      res.writeHead(204, {
        'Content-Type': 'application/json'
      });
      res.write(model.toString());
      res.end();
    });
  });
};

exports.destroy = function(Model, req, res, next) {
  Model.remove(req.params, function(err) {
    if(err) { next(err); return; }
    res.writeHead(204);
    res.end();
  });
};

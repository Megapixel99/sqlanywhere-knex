
// Sqlanywhere Client
// -------
const {map, pick, keys, flatten, values} = require('lodash');

const Formatter = require('../../formatter.js')
const Client    = require('../../client.js')

const Transaction       = require('./transaction')
const QueryCompiler     = require('./query/compiler')
const SchemaCompiler    = require('./schema/compiler')
const ColumnBuilder     = require('./schema/columnbuilder')
const ColumnCompiler    = require('./schema/columncompiler')
const TableCompiler     = require('./schema/tablecompiler')
const ReturningHelper   = require('./utils').ReturningHelper
const prepareValue      = require('./utils').prepareValue

// Always initialize with the "QueryBuilder" and "QueryCompiler"
// objects, which extend the base 'lib/query/builder' and
// 'lib/query/compiler', respectively.

function skim(data) {
  return map(data, (obj) => {
    return pick(obj, keys(obj));
  });
}

class Client_Sqlanywhere extends Client {
  constructor(config) {
    super(config);
  }

  queryCompiler(builder, formatter) {
    return new QueryCompiler(this, builder, formatter);
  }

  tableCompiler() {
    return new TableCompiler(this, ...arguments);
  }

  columnCompiler() {
    return new ColumnCompiler(this, ...arguments);
  }

  viewBuilder() {
    return new ViewBuilder(this, ...arguments);
  }

  viewCompiler() {
    return new ViewCompiler(this, ...arguments);
  }

  formatter(builder) {
    return new Formatter(this, builder);
  }

  transaction() {
    return new Transaction(this, ...arguments);
  }

  prepBindings(bindings) {
    return map(bindings, (value) => {
      // returning helper uses always ROWID as string
      if (value instanceof ReturningHelper && this.driver) {
        return new this.driver.OutParam(this.driver.OCCISTRING)
      }
      return prepareValue( value )
    })
  }

  // Get a raw connection, called by the `pool` whenever a new
  // connection needs to be added to the pool.
  acquireRawConnection() {
    const client = this
    return new Promise((resolver, rejecter) => {
      const connection = client.driver.createConnection();
      connection.connect(client.connectionSettings, (err) => {
        if (err) return rejecter(err);
        return resolver(connection);
      });
    });
  }

  // Used to explicitly close a connection, called internally by the pool
  // when a connection times out or the pool is shutdown.
  destroyRawConnection(connection, cb) {
    return new Promise((resolve, reject) => {
      return connection.disconnect((err, result) => {
        if (err) return reject(err);
        resolve(result);
      });
    });
  }

  // Return the database for the Sqlanywhere client.
  database() {
    return this.connectionSettings.dbn || this.connectionSettings.DatabaseName
  }

  _stream(connection, sql, stream/*, options*/) {
    const client = this;
    return new Promise(function(resolver, rejecter) {
      stream.on('error', rejecter)
      stream.on('end', resolver)
      return client._query(connection, sql).then(function(obj) {
        return obj.response
      }).map(function(row) {
        stream.write(row)
      }).catch(function(err) {
        stream.emit('error', err)
        rejecter();
      }).then(function() {
        stream.end()
        resolver();
      })
    })
  }

  // Runs the query on the specified connection, providing the bindings
  // and any other necessary prep work.
  _query(connection, obj) {
    if (!obj.sql) throw new Error('The query is empty');

    return new Promise((resolve, reject) => {
      let cb = (err, result) => {
        if (err) return reject(err);
        resolve(result);
      };
      if (obj.bindings) {
        return connection.exec(obj.sql, obj.bindings, cb);
      }
      return connection.exec(obj.sql, cb);
    });
  }

  // Process the response as returned from the query.
  processResponse(obj, runner) {
    let response = obj.response;
    const method   = obj.method;
    if (obj.output) return obj.output.call(runner, response);
    switch (method) {
      case 'select':
      case 'pluck':
      case 'first':
        response = skim(response);
        if (obj.method === 'pluck') response = map(response, obj.pluck);
        return obj.method === 'first' ? response[0] : response;
      case 'insert':
      case 'del':
      case 'update':
      case 'counter':
        if (obj.returning) {
          if (obj.returning.length > 1 || obj.returning[0] === '*') {
            return response;
          }
          // return an array with values if only one returning value was specified
          return flatten(map(response, values));
        }
        return response;
      default:
        return response;
    }
  }

  ping(resource, callback) {
    resource.exec('SELECT 1', [], callback);
  }

  _driver() {
    return require('sqlanywhere')
  }
}

Client_Sqlanywhere.prototype.dialect = 'sqlanywhere';
Client_Sqlanywhere.prototype.driverName = 'sqlanywhere';

module.exports = Client_Sqlanywhere

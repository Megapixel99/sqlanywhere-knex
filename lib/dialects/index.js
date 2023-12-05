"use strict";
exports.__esModule = true;
exports.getDialectByNameOrAlias = void 0;
const resolveClientNameWithAliases = require('../util/helpers').resolveClientNameWithAliases;
const dbNameToDialectLoader = Object.freeze({
    'better-sqlite3': function () { return require('./better-sqlite3'); },
    cockroachdb: function () { return require('./cockroachdb'); },
    mssql: function () { return require('./mssql'); },
    mysql: function () { return require('./mysql'); },
    mysql2: function () { return require('./mysql2'); },
    oracle: function () { return require('./oracle'); },
    oracledb: function () { return require('./oracledb'); },
    pgnative: function () { return require('./pgnative'); },
    postgres: function () { return require('./postgres'); },
    redshift: function () { return require('./redshift'); },
    sqlanywhere: function () { return require('./sqlanywhere'); },
    sqlite3: function () { return require('./sqlite3'); }
});
/**
 * Gets the Dialect object with the given client name or throw an
 * error if not found.
 *
 * NOTE: This is a replacement for prior practice of doing dynamic
 * string construction for imports of Dialect objects.
 */
function getDialectByNameOrAlias(clientName) {
    const resolvedClientName = resolveClientNameWithAliases(clientName);
    const dialectLoader = dbNameToDialectLoader[resolvedClientName];
    if (!dialectLoader) {
        throw new Error("Invalid clientName given: " + clientName);
    }
    return dialectLoader();
}
exports.getDialectByNameOrAlias = getDialectByNameOrAlias;

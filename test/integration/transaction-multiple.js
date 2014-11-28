var async    = require('async');
var should   = require('should');
var helper   = require('../support/spec_helper');
var ORM      = require('../../');

describe("Transaction.multiple()", function() {
	var db = null;
	var Person = null;

	var setup = function () {
		return function (done) {
			Person = db.define("person", {
				name   : String
			});

			return helper.dropSync(Person, function () {
				done();
			});
		};
	};

	before(function (done) {
		helper.connect({query: {pool: true}}, function (connection) {
			db = connection;

			return done();
		});
	});

	after(function () {
		return db.close();
	});

	describe("direct calls", function () {
		before(setup());

		it("should end up with no person", function (done) {
			if (typeof db.transaction !== "function") {
				return done(); //transaction not supported
			}
			db.transaction( function(err, txn) {
				async.times(10, function(n, cb) {
					Person.create({
						name: 'person' + n
					}, txn, function(err, p) {
						cb(err, p);	
					});
				}, function(err, results){
					txn.rollback(function(err) {
						if (err)
							done(err);
						else {
							Person.count(function (err, qty) {
								should.equal(err, null);
								should.equal(qty, 1);
								return done();
							});
						}
					});
				});
			});
		});
	});

});

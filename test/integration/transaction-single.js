var async    = require('async');
var should   = require('should');
var helper   = require('../support/spec_helper');
var ORM      = require('../../');

describe("Transaction.single()", function() {
	var db = null;
	var Person = null;

	var setup = function () {
		return function (done) {
			Person = db.define("person", {
				name   : String,
				gender : [ 'female', 'male' ]
			});

			return helper.dropSync(Person, function () {
				Person.create({
					id  : 1,
					name: "Jeremy Doe",
					gender: "male"
				}, done);
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

		it("should end up with one person", function (done) {
			var first = {
				id  : 2,
				name: "John Doe",
				gender: "male3"
			};
			var second = {
				id  : 3,
				name: "Jane Doe",
				gender: "female"
			};
			async.parallel([
			function(cb) {
				db.transaction( function(err, txn1) {
					var fncb = function(err, p) {
						if (err)
							txn1.rollback( function(err2) {
								cb();
							});
						else
							txn1.commit( function(err2) {
								cb();
							});
					};
					Person.create(second, txn1, function(err2, p) {
						setTimeout(fncb, 500, err2, p);
					});
				});
			},
                        function(cb) {
                                db.transaction( function(err, txn2) {
                                        var fncb = function(err, p) {
                                                if (err)
                                                        txn2.rollback( function(err2) {
                                                                cb();
                                                        });
                                                else
                                                        txn2.commit( function(err2) {
                                                                cb();
                                                        });
                                        };
                                        Person.create(first, txn2, function(err2, p) { //error
                                                setTimeout(fncb, 700, err2, p);
                                        });
                                });
                        },
			function(cb) {
				db.transaction( function(err, txn3) {
					Person.get(1, txn3, function(err, person) {
						var fncb = function(err) {
							if (err)
								txn3.rollback( function(err2) {
									cb();
								});
							else
								txn3.commit( function(err2) {
									cb();
								});
						};
						if (err) {
							return cb();
						}
						person.remove(function(err2) {
							setTimeout(fncb, 200, err2);
						});
					});
				})
			}
			], function(err, results) {
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

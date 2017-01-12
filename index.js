let assert = require('assert')
const debug = require('debug')('activitypub-tests')
const fetch = require('node-fetch')
const url = require('url')

exports.runner = runner
function runner({ activityPubUrl }) {
	return async function () {
		const results = runTests(await getAllTests({ activityPubUrl }))
		return results
	}
}

// TODO: consider adding another layer to handle testig many types of activity against an endpoint, e.g.
// Feature -> Requirement -> ...Test(activityInstance) -> Result
exports.getAllTests = getAllTests;
function getAllTests({ activityPubUrl, authorization }) {
	const serverAcceptsSubmissionsToOutbox = {
		type: 'Feature',
		name: 'Accept activity submissions and produce correct side effects',
		slug: 'server-outbox',
		description: 'A server handling an activity submitted by an authenticated actor to their outbox and handling client to server interaction side effects appropriately.',
		id: 'C25EE91B-A3B5-4874-85C0-8393E5F91F45',
		tests: [
			{
				type: 'Test',
				id: 'D8953217-B813-4C90-8214-A5A1968B68F5',
				name: 'outbox is discoverable',
				assert: async function () {
					const outboxUrl = await discoverOutboxUrl(activityPubUrl)
					if ( ! outboxUrl) {
						throw new Error("Couldn't discover outbox URL")
					}
					return outboxUrl
				}
			},
			{
				type: 'Test',
				id: 'F7E85B25-172C-463E-AE4D-1FACECB92DE9',
				name: 'Outbox accepts Activity Objects',
				assert: withChecker(async function (checker) {
					const outboxUrl = await discoverOutboxUrl(activityPubUrl);
					assert(outboxUrl, "Can't test sending to outbox, because it can't be discovered")
					// send something to it
					const activity = {
						actor: { name: 'Ben' },
						type: 'Create',
						object: {
							type: 'Note',
							content: '<p>Hello, world!</p>',
						},
					}
					const response = await fetch(outboxUrl, {
						method: 'post',
						body: JSON.stringify(activity),
						headers: {
							'content-type': 'application/ld+json; profile="https://www.w3.org/ns/activitystreams#"',
							'authorization': authorization,
						}
					})
					checker.assert.equal(response.status, 201,
						'Outbox MUST respond with 201 status code')
					checker.assert(response.headers.get('location'),
						'Outbox response MUST include Location header whose value is id of new object, unless the Activity is transient')
				})
			}
		]
	}
	const serverAcceptsInboxNotifications = {
		type: 'Feature',
		name: 'Accept inbox notifications from other servers',
		slug: 'server-inbox',
		description: "A federated server receiving an activity to its actor's inbox, validating that the activity and any nested objects were created by their respective actors, and handling server to server side effects appropriately.",
		id: 'ksdjfkajdsfkj',
		tests: [
			{
				type: 'Test',
				id: 'DAAAA217-B813-4C90-8214-A5A1968B68F5',
				name: 'inbox is discoverable',
				assert: async function () {
					const inboxUrl = await discoverInboxUrl(activityPubUrl)
					if ( ! inboxUrl) {
						throw new Error("Couldn't discover inbox URL")
					}
					return inboxUrl
				}
			},
			{
				type: 'Test',
				id: 'asdfasdfasdeee',
				name: 'Inbox accepts Activity Notifications',
				assert: withChecker(async function (checker) {
					const inboxUrl = await discoverInboxUrl(activityPubUrl);
					assert(inboxUrl, "Can't test sending to inbox, because it can't be discovered")
					const activity = {
						actor: { name: 'Ben' },
						type: 'Create',
						object: { type: 'Note', content: '<p>Hi</p>' }
					};
					const response = await fetch(inboxUrl, {
						method: 'post',
						body: JSON.stringify(activity),
						headers: {
							'content-type': 'application/ld+json; profile="https://www.w3.org/ns/activitystreams#"',
							'authorization': authorization,
						}
					})
					checker.check(function () {
						if (200 <= response.status && response.status <= 299) {
							return
						}
						throw new PublicError("Inbox response should be 2xx, but it was "+response.status)
					})
				})
			},
		]
	}	
	// TODO: Probably want output to group by feature
	return ([]
		.concat(serverAcceptsSubmissionsToOutbox.tests)
		.concat(serverAcceptsInboxNotifications.tests)
	);
}

function withChecker(doTest) {
	return async function () {
		const checker = Checker()
		try {
			await doTest(checker)
		} catch (error) {
			debug(error)
			// something REALLY went wrong
			throw checker.errors.concat([error])
		}
		// test func finished. But maybe some batched failures
		checker.throw()
  }
}

async function runTests (tests) {
  const results = await Promise.all(
  	// map each to a result or promise of result
  	tests.map(
  		(test) => {
  			const { id, name } = test;
  			// assert() can be sync or async
  			let o;
  			// if sync failures will throw here;
  			if (typeof test.assert !== 'function') {
  				throw new Error("test is missing an 'assert' function. Add one. "+test.name)
  			}
  			try {
  				o = test.assert()
  			} catch (error) {
  				debug('test assert() threw, returning Failure')
  				return fail(error)
  			}
  			// if it was async, o will be a promise and failures will be .catch()
  			return Promise.resolve(o)
	  			.then((v) => {
	  				return {
	  					ok: true,
	  					test,
	  					value: v
	  				}
	  			})
	  			.catch(error => {
	  				debug('async test error')
	  				return fail(error)
	  			})
	  		function fail(error) {
	  			logFailure(error)
	  			return {
	  				ok: false,
	  				test,
	  				errors: Array.isArray(error) ? error : [error]
	  			}
	  		}
  			// utils
	      function logFailure (error) {
	        debug(`TEST FAIL: ${test.name}\n${error.stack}\n`)
	      }
  		}
  	)
  )
  return results;
}

async function discoverProfileProperty(uri, property) {
    const res = await fetch(uri)
    switch (res.status) {
        case 200:
        		let profile;
        		try {
	            profile = await res.json()
	          } catch (error) {
	          	throw new PublicError(`Failed to parse ${uri} as JSON`)
	          }
            const propertyValue = profile[property]
            if ( ! propertyValue) {
                throw new PublicError(`Fetched ${uri}, but it doesn't specify a .${property}`)
            }
            return propertyValue
        default:
            throw new Error(`Couldn't successfully GET ${uri}. Code ${res.status}`)
    }	
}

async function discoverInboxUrl(uri) {
	const inbox = await discoverProfileProperty(uri, 'inbox')
	return url.resolve(uri, inbox)
}

async function discoverOutboxUrl(uri) {
	const outbox = await discoverProfileProperty(uri, 'outbox')
	return url.resolve(uri, outbox)
}

// Error whose message is safe to be shared with the world via toJSON()
function PublicError(message) {
	Error.captureStackTrace(this, PublicError);
	this.toJSON = function () {
		return {
			message: message
		}
	}
}

// create a thing that acts like assert, but doesn't throw
// utnil you call .throw(), and then all the bad things are thrown
// used for checking things that don't strictly prevent further checks
function Checker() {
	const errors = []
	return {
		errors: errors,
		throw: function () {
			if ( ! errors.length) return;
			throw errors;
		},
		assert: Object.assign(
			wrap(assert),
			Object.keys(assert).reduce((checker, k) => {
				checker[k] = wrap(assert[k])
				return checker
			}, {})
		),
		check: function (check) {
			wrap(check)()
		},
	}
	function wrap(method) {
		return function () {
			try {
				return method.apply(assert, arguments)
			} catch (error) {
				errors.push(error)
			}
		}
	}
}

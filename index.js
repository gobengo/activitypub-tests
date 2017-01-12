let assert = require('assert')
const dedent = require('dedent-js')
const fetch = require('node-fetch')

exports.runner = runner
function runner({ activityPubUrl }) {
	return async function () {
		const tests = await getAllTests({ activityPubUrl })
		const results = runTests(tests)
		return results
	}
}

// TODO: consider adding another layer to handle testig many types of activity against an endpoint, e.g.
// Feature -> Requirement -> ...Test(activityInstance) -> Result

function getAllTests({ activityPubUrl, authorization }) {
	const serverAcceptsSubmissionsToOutbox = {
		name: 'Accept activity submissions and produce correct side effects',
		slug: 'server-outbox',
		description: 'A server handling an activity submitted by an authenticated actor to their outbox and handling client to server interaction side effects appropriately.',
		id: 'C25EE91B-A3B5-4874-85C0-8393E5F91F45',
		tests: [
			{
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
				id: 'F7E85B25-172C-463E-AE4D-1FACECB92DE9',
				name: 'Accepts Activity Objects',
				assert: async function () {
					const batchAsserter = BatchAsserter()
					const outboxUrl = await discoverOutboxUrl(activityPubUrl);
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
					batchAsserter.assert.equal(response.status, 201,
						'Outbox MUST respond with 201 status code')
					batchAsserter.throw()
				}
			}
		]
	}
	return serverAcceptsSubmissionsToOutbox.tests
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
  			try {
  				o = test.assert()
  			} catch (error) {
  				console.log('test assert() threw, returning Failure')
  				return fail(error)
  			}
  			// if it was async, o will be a promise and failures will be .catch()
  			return Promise.resolve(o)
	  			.then((v) => {
	  				console.log('test succeeded')
	  				return {
	  					ok: true,
	  					test,
	  					value: v
	  				}
	  			})
	  			.catch(error => {
	  				console.log('async test error')
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
	        console.error(`TEST FAIL: ${test.name}\n${error.stack}\n`)
	      }
  		}
  	)
  )
  return results;
}

async function discoverOutboxUrl(thingWithOutbox) {
    const res = await fetch(thingWithOutbox)
    switch (res.status) {
        case 200:
            const profile = await res.json()
            const outbox = profile.outbox
            if ( ! outbox) {
                throw new Error("Fetched thingWithOutbox, but it doesn't specify an outbox")
            }
            return require('url').resolve(thingWithOutbox, outbox)
        default:
            throw new Error("Couldn't GET thingWithOutbox. code "+res.status)
    }
}

function withProps(start, spec) {
	Object.keys(start).forEach(function (k) {
		if ( ! spec.hasOwnProperty(k)) {
			throw new Error("Unexpected property: ", k)
		}
	})
	return start;
}

// create a thing that acts like assert, but doesn't throw
// utnil you call .end(), and then all the bad things are thrown
function BatchAsserter() {
	const errors = []
	return {
		throw: function () {
			if ( ! errors.length) return;
			throw errors;
		},
		assert: Object.assign(
			wrap(assert),
			Object.keys(assert).reduce((batchAsserter, k) => {
				batchAsserter[k] = wrap(assert[k])
				return batchAsserter
			}, {})
		),
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

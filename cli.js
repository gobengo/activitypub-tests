#!/usr/bin/env node --harmony
const tests = require('.')

if (require.main === module) {
	cli()
		.catch(err => {
			console.error(err)
			process.exit(1)
		})
		.then(process.exit)
}

module.exports = cli
async function cli(argv = process.argv) {
	const activityPubUrl = process.argv[2];
	if ( ! activityPubUrl) {
		throw new Error("Please run with cli arg of activityPubUrl like `./cli.js http://distbin.com`")
	}
	const runner = tests.runner({ activityPubUrl })
	const results = await runner() 
	// console.log('results', results)
	console.log(JSON.stringify(results, null, 2))
}

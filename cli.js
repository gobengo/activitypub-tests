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
	console.log('activitypub-tests')
	const activityPubUrl = 'http://distbin.com'
	const runner = tests.runner({ activityPubUrl })
	const results = await runner() 
	console.log('results')
	console.log(JSON.stringify(results, null, 2))
}

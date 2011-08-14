var http = require('http');
var bencode = require('dht-bencode');

http.createServer(function (req, res) {
	// What is it?
	console.log(req.url);
	params = require('url').parse(req.url, true);
	console.log(params);

	if (params.pathname == '/announce') {
		console.log('Announce logged');
		res.end(bencode.bencode({
			'interval': '60',
			'tracker id': 'foo',
			'complete': 1,
			'incomplete': 1,
			'peers': {
				'peer id': 123,
				'ip': '1.1.1.1',
				'port': 123
			}
		
		}).toString());
	}
	
	//console.log(require('url').parse(req.url, true));
	res.end(bencode.bencode({'failure reason': 'Unhandled request'}).toString());
}).listen(1337, "192.168.0.23");



var http = require('http');
var bencode = require('dht-bencode');
var redis = require("redis-node");

var srv = http.createServer(function (req, res) {
	// What is it?
	params = require('url').parse(req.url, true);

	if (params.pathname == '/announce') {
		var ip_address = null;
		try {
			peer_ip = req.headers['x-forwarded-for'];
		} catch (error) {
			peer_ip = req.connection.remoteAddress;
		}

		torrentHash = new Buffer(params.query.info_hash, 'binary').toString('base64');
		peerkey = generatePeerKey(torrentHash, params.query.peer_id, params.query.key);

		console.log(params);
		addPeer(torrentHash, (params.query.left == 0), peerkey, params.query.peer_id, peer_ip, params.query.port);
		console.log('Announce logged');
		res.end(bencode.bencode({
			'interval': '10',
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
});

// Connect to redis
var client = redis.createClient();
//client.select(1);

srv.listen(1337, "192.168.0.23", function() {
});


function addPeer(torrentHash, complete, peerkey, peerid, ip, port) {
	// Wrap this in a transaction I guess
	if (complete) {
		complete = 'i';
	} else {
		complete = 'u';
	}

	client.sadd('torrent:' + torrentHash, complete + ':' + peerkey);
	client.hmset('tpeer:' + peerkey, {
		'peerid': peerid,
		'ip': ip,
		'port': port});
	client.expire('tpeer:' + peerkey, 100);
	// We could expire this, idk

	console.log('added a key -  tpeer:' + peerkey);
}

function getPeers(torrentHash, count) {
	count = count || 50; // A default of 50
	// Get a list of all Peers for a torrent
	
}

function removePeer(torrentHash, peerkey) {

}

function generatePeerKey(torrentHash, peerid, key) {
	console.log('generating key' + key + peerid);
	var hash = require('crypto').createHash('md5'); // We need to use something *far* faster here
	hash.update(peerid);
	hash.update(key);
	hash.update(torrentHash);
	return hash.digest('base64');
}


// Will need a worker to expire junk at some point

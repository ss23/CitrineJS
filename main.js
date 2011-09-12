var http = require('http');
var bencode = require('dht-bencode');
var redis = require("redis");
var srv = http.createServer(function (req, res) {
	// What is it?
	params = require('url').parse(req.url, true);

	console.log(params.pathname);	
	switch(params.pathname) {
		case "/announce": 
		peer_ip = req.connection.remoteAddress;

		torrentHash = new Buffer(params.query.info_hash, 'binary').toString('base64');
		peerkey = generatePeerKey(torrentHash, params.query.peer_id, params.query.key);

		case "/scrape":
		// First thing we do is finish the request!
		getPeers(function(peers) {

			console.log(peers);
			// At this point, we need to use each of those peers to do stuff I guess
			// I'm told theres some crazy multi thing... BAM
			multi = client.multi();
			peers.forEach(function(element) {
				console.log('get all for ' + element.substr(2));
				multi.hgetall('tpeer:' + element.substr(2));
			});

			multi.exec(function(err, replies) {
				//Count the number of complete and incomplete peers
				var complete = 0;
				var incomplete = 0;

				//For each peer in the peers array
				for(var i = 0; i < peers.length; i++)
				{
					//i is incomplete
					if(peers[i].substr(0,1) == 'i')
					{
						incomplete++;
					}
					//c is complete
					else
					{
						complete++;
					}
				}

				var data = {
					'interval': '10',
					'tracker id': 'foo',
					'complete': complete,
					'incomplete': incomplete,
					'peers': replies
				};

				
					var resp = bencode.bencode(data).toString();
					console.log('Data array: ' + JSON.stringify(data));
					console.log('Bencoded response: ' + resp);
					res.end(resp);
			});
		}, torrentHash);

		// Now the request is completed, we can do things that are non essential
		addPeer(torrentHash, (params.query.left == 0), peerkey, params.query.peer_id, peer_ip, params.query.port);
		break;
	default: 
		res.end(bencode.bencode({'failure reason': 'Unhandled request'}).toString());
		break;
	}
});

// Connect to redis
var client = redis.createClient();
//client.select(1);

srv.listen(1337, "127.0.0.1");

function addPeer(torrentHash, complete, peerkey, peerid, ip, port) {
	// Wrap this in a transaction I guess
	if (complete) {
		complete = 'c';
	} else {
		complete = 'i';
	}

	client.sadd('torrent:' + torrentHash, complete + ':' + peerkey);
	client.hmset('tpeer:' + peerkey, {
		'peerid': peerid,
		'ip': ip,
		'port': port});
	client.expire('tpeer:' + peerkey, 100);
	// We could expire this, idk

	//console.log('added a key -  tpeer:' + peerkey);
}

function getPeers(callback, torrentHash, count) {
	count = count || 50; // A default of 50
	// Get a list of all Peers for a torrent
	
	// For now, uh, get an array of... peers for a torrent
	console.log('torrent:' + torrentHash);
	client.smembers('torrent:' + torrentHash, function(err, peers) {
		callback(peers);
	});
}

function removePeer(torrentHash, peerkey) {

}

function generatePeerKey(torrentHash, peerid, key) {
	//console.log('generating key' + key + peerid);
	var hash = require('crypto').createHash('md5'); // We need to use something *far* faster here
	hash.update(peerid);
	hash.update(key);
	hash.update(torrentHash);
	return hash.digest('base64');
}

			/* 
			{
				'interval': '10',
				'tracker id': 'foo',
				'complete': 1,
				'incomplete': 1,
				'peers': {
					'peer id': 123,
					'ip': '1.1.1.1',
					'port': 123
				}*/

// Will need a worker to expire junk at some point

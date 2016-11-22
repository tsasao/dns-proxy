var dnsd = require('dnsd');
var dns = require('dns');

var port = 53;

var parse_rule = function(str) {
    var pattern_result = str.split(/,/);
    if(pattern_result.length != 2) {
	throw 'Wrong format';
    }
    return { pattern: new RegExp(pattern_result[0]), replace: pattern_result[1] };
};

var args = process.argv.slice(2);
var rules = [ ];
while(0 < args.length && args[0].match(/^-/)) {
    var opt = args.shift();
    if(opt == '-p') {
	port = args.shift();
    } else if(opt == '-s') {
	rules.push(parse_rule(args.shift()));
    } else {
	throw 'Unknown parameter';
    }
}

var ttl = 60;
var server = dnsd.createServer(handler)
.listen(port, '127.0.0.1')
console.log('Server running at 127.0.0.1:'+port);

function handler(req, res) {
    console.log('%s:%s/%s %j', req.connection.remoteAddress, req.connection.remotePort, req.connection.type, req)
    var question = res.question[0];
    var name = res.question[0].name;
    for(var i=0 ; i<rules.length ; i++) {
	if(rules[i].pattern.exec(name)) {
	    name = rules[i].replace;
	    console.log(' -> ' + name);
	    break;
	}
    }
    dns.resolve4(name, function (err, addresses) {
        console.log(`addresses: ${JSON.stringify(addresses)}`);
	if(err && err.code == 'ENOTFOUND') {
	    // TODO: return soa of zone
	    res.end();
	    return;
	}
	if(err) {
	    console.log(err);
	    res.end();
	    return;
	}
        while(0 < addresses.length) {
	    var a = addresses.shift();
	    res.answer.push({
		name: res.question[0].name,
		type: 'A', data: a,
		ttl: ttl
	    });
        }
        res.end();
    });
}

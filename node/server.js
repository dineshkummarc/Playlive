
var sio = require('socket.io')
  , basename = require('path').basename
  , express = require('express')
  , fs = require('fs')
  , mime = require('mime')
  , url = require('url')

  , conf = require('./config.js')
  , db = require('./database.js');

var app = express.createServer();

app.configure(function () {
    app.use('/public', express.static(__dirname + '/../public'));
    app.set('views', __dirname);
    app.set('view engine', 'html');

    this.use(express.cookieParser());
    this.use(express.session({
        "secret": "333333",
        "store":  new express.session.MemoryStore({ reapInterval: 60000 * 10 })
    }));

    db.mongoose.connect('mongodb://'+conf.mongo);
});

app.register('.html', {
    compile: function(str, options){
        return {
            call: function() {
                return str;
            }
        };
    }
});

app.listen(3000, function () {
    var addr = app.address();
    console.log('   app listening on http://' + addr.address + ':' + addr.port);
});

function requireLogin (req, res, next) {
    var queryString = url.parse(req.url,true);
    if (queryString.query[conf.user] && queryString.query[conf.user] == conf.pass) {
        req.session.auth = true;
    }

    if (req.session.auth) {
        next();
    } else {
        // Otherwise, we redirect him to login form
        res.statusCode = 403;
        res.end('You must login');
    }
}

var io = sio.listen(app);

app.get('/', [requireLogin], function (req, res) {
    res.render('../public/index.html', { layout: false });
});

app.post('/upload', [requireLogin], function(req, res) {
    var ALLOWED_MIME_TYPES = {
        'audio/mpeg3': true,
        'audio/mpeg': true
    };

    var fName = basename(req.header('x-file-name'))
      , ws = fs.createWriteStream('./public/music/'+fName)
      , mimetype = mime.lookup(ws.path);

    if (!ALLOWED_MIME_TYPES[mimetype]) {
        console.log('### ERROR: INVALID MIMETYPE', mimetype);
        res.end('INVALID MIMETYPE');
        return;
    }

    req.on('data', function(data) {
        ws.write(data);
    });

    req.on('end', function(){
        var track = new db.Track();
        track.title = fName;
        track.file = fName;

        track.save(function(err) {
            if (!err) {
                console.log('track created! file uploaded : '+fName);
                io.sockets.emit('add_track', track);
                res.end('');
            }
        });
    });
});

io.sockets.on('connection', function (socket) {

    socket.on('create', function(data) {
        var track = new db.Track();
        track.title = data.title;
        track.save();
    });

    socket.on('remove', function(data) {
        console.log('>> remove track', data);
        db.Track.findById(data.id, function(err, track) {
            if (!err) {
                track.remove();
                io.sockets.emit('remove_track', {id: data.id});
            }
        });
    });

    socket.on('play', function(data) {
        io.sockets.emit('play_track', data);
    });

    socket.on('fetch_all', function(data) {
        db.Track.find({}, function(err, tracks) {
            console.log('tracks >>', tracks);
            for (i = 0; i < tracks.length; i++) {
                socket.emit('add_track', tracks[i]);
            }
        });
    });

});

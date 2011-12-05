
var PlayliveApplication = Backbone.View.extend({

    el: $('body'),

    initialize: function() {
        this.status = $('.player_nav .player_status');

        this.socket = io.connect(window.location.origin);

        this.playlist = new jPlayerPlaylist({
            jPlayer: "#jquery_jplayer_1",
            cssSelectorAncestor: "#jp_container_1"
        }, [], {
            supplied: "mp3",
            wmode: "window",
            play: this._call('onPlay'),
            pause: function() {
                $('span.now_playing').remove();
            },
            playlistOptions: {
                enableRemoveControls: true
            }
        });

        this.player = $(this.playlist.cssSelector.jPlayer).jPlayer();

        var context = this;

        for (name in this._events) {
            this.socket.on(name, this._call(this._events[name]));
        }

        dropZone = $('.drop_zone');
        dropZone.removeClass('error');

        this.views = {
            'main'      : new PlayliveMainView(),
            'playlist'  : new PlaylivePlaylistView(),
        };

        // default view
        this.setView(this.views.main);

        // Check if window.FileReader exists to make 
        // sure the browser supports file uploads
        if (typeof(window.FileReader) == 'undefined') {
            dropZone.text('Browser Not Supported!');
            dropZone.addClass('error');
            return;
        }

        // Add a nice drag effect
        dropZone[0].ondragover = function () {
            dropZone.addClass('hover');
            return false;
        };

        // Remove the drag effect when stopping our drag
        dropZone[0].ondragend = function () {
            dropZone.removeClass('hover');
            return false;
        };

        dropZone[0].ondrop = this._call('onDrop');
    },

    setView: function(view) {
        // empty all items
        $('.jp-playlist li').remove();

        // display all items
        this.log('>> view changed', view.fetchEvent);
        this.socket.emit(view.fetchEvent);

        view.init();

        this.view = view;
    },

    // call a method passing the player context
    _call: function(method) {
        var context = this;
        return function() {
            return context[method].apply(context, arguments);
        };
    },

    // polymorphic
    log: function() {
        return console && Function.prototype.bind.call(console.log, console).apply(console, arguments);
    },


    // --- DOM events --- //

    events: {
        'click #jplayer_top_add': 'openUploadPane',
        'click .jp-playlist-item-remove': 'remove',
        'click .add_playlist': 'newPlaylist'
    },

    openUploadPane: function(event) {
        this.$('.drop_zone').show();
    },

    newPlaylist: function(event) {
        this.playlist.add({
            title: 'new playlist'
        });
    },

    remove: function(e) {
        var id = $(e.target).parents('li').first().data('id');
        this.socket.emit('remove', {id: id});
    },

    onPlay: function(event) {
        $('span.now_playing').remove();

        var media = event.jPlayer.status.media;
        $('li[data-id='+media.id+']').find('div').append(
            $('<span/>').addClass('now_playing').text('[now playing]')
        );
    },


    // --- SocketIO events --- //

    _events: {
        'add_track': 'addTrack',
        'add_playlist': 'addPlaylist',
        'remove_track': 'removeTrack',
    },

    addTrack: function(track) {
        this.log('>> add track', track);
        this.playlist.add({
            title: track.title,
            mp3: '/public/music/'+track.file,
            id: track._id
        });
    },

    addPlaylist: function(track) {
        this.log('>> add playlist', playlist);
        this.playlist.add({
            title: playlist.title,
            mp3: playlist.title,
            id: playlist._id
        });
    },

    removeTrack: function(data) {
        $('li[data-id='+data.id+']').remove();
    },

    // --- Upload --- //

    onDrop: function(event) {
        //Stop the browser from opening the file in the window
        event.preventDefault();
        dropZone.removeClass('hover');

        // Get the file and the file reader
        var file = event.dataTransfer.files[0];

        // Validate file size
        if(file.size > 30*1000*1000) {
            this.status.text('File Too Large!');
            dropZone.addClass('error');
            return false;
        }

        // Send the file
        var xhr = new XMLHttpRequest();
        xhr.upload.addEventListener('progress', this._call('uploadProgress'), false);
        xhr.onreadystatechange = this._call('stateChange');
        xhr.open('POST', '/upload', true);
        xhr.setRequestHeader('X-FILE-NAME', file.name);
        xhr.send(file);
    },

    uploadProgress: function(event) {
        var percent = parseInt(event.loaded / event.total * 100);
        this.status.text(percent == 100 ? '' : 'Uploading: ' + percent + '%');
    },

    // Show upload complete or upload failed depending on result
    stateChange: function(event) {
        var self = this;
        if (event.target.readyState == 4) {
            if (event.target.status == 200 || event.target.status == 304) {
                self.status.text('Upload Complete!');
            }
            else {
                dropZone.text('Upload Failed!');
                dropZone.addClass('error');
            }
        }
    }
});

window.PlayliveMainView = Backbone.View.extend({
    fetchEvent: 'fetch_playlists'

  , init: function() {
        $('.player_nav .nav_buttons').html(
            $('<a/>').text('add playlist').attr('href', '#').addClass('add_playlist')
        );
    }
});

window.PlaylivePlaylistView = Backbone.View.extend({
    fetchEvent: 'fetch_tracks'
});

jPlayerPlaylist.prototype._createListItem = function(media) {
    self = this;

    //Wrap the <li> contents in a <div>
    var listItem = "<li data-id='"+media.id+"'><div>";

    // Create remove control
    listItem += "<a href='javascript:;' class='" + this.options.playlistOptions.removeItemClass + "'>&times;</a>";

    // Create links to free media
    if(media.free) {
        var first = true;
        listItem += "<span class='" + this.options.playlistOptions.freeGroupClass + "'>(";
        $.each(media, function(property,value) {
            if($.jPlayer.prototype.format[property]) { // Check property is a media format.
                if(first) {
                    first = false;
                } else {
                    listItem += " | ";
                }
                listItem += "<a class='" + self.options.playlistOptions.freeItemClass + "' href='" + value + "' tabindex='1'>" + property + "</a>";
            }
        });
        listItem += ")</span>";
    }

    // The title is given next in the HTML otherwise the float:right on the free media corrupts in IE6/7
    listItem += "<a href='javascript:;' class='" + this.options.playlistOptions.itemClass + "' tabindex='1'>" + media.title + (media.artist ? " <span class='jp-artist'>by " + media.artist + "</span>" : "") + "</a>";
    listItem += "</div></li>";

    return listItem;
};


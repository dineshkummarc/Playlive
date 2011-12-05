require.paths.unshift('vendor/mongoose/lib');

var mongoose = require('mongoose');

var Schema = mongoose.Schema
  , ObjectId = Schema.ObjectId;

var PlaylistSchema = new Schema({
    id      : ObjectId
  , title   : String
  , file    : String
  , tracks  : [{ type: Schema.ObjectId, ref: 'Track' }]
});

var TrackSchema = new Schema({
    id          : Schema.ObjectId
  , _playlist   : { type: Schema.ObjectId, ref: 'Playlist' }
  , title       : String
});

exports.mongoose = mongoose;
exports.Playlist = mongoose.model('Playlist', PlaylistSchema);
exports.Track = mongoose.model('Track', TrackSchema);

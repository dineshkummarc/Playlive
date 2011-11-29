require.paths.unshift('vendor/mongoose/lib');

var mongoose = require('mongoose');

var Schema = mongoose.Schema
  , ObjectId = Schema.ObjectId;

var TrackSchema = new Schema({
    id    : ObjectId
  , title     : String
  , file      : String
});

exports.mongoose = mongoose;
exports.Track = mongoose.model('Track', TrackSchema);

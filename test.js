#!/usr/bin/env node

var mapnik = require('mapnik');
var assert = require('assert');
var path = require('path');
var fs = require('fs');

/* settings */

assert.ok(mapnik.settings);
assert.ok(mapnik.settings.paths);
assert.ok(mapnik.settings.paths.fonts.length);
assert.ok(mapnik.settings.paths.input_plugins.length);


/* has version info */

assert.ok(mapnik.versions);
assert.ok(mapnik.versions.node);
assert.ok(mapnik.versions.v8);
assert.ok(mapnik.versions.mapnik);
assert.ok(mapnik.versions.mapnik_number);
assert.ok(mapnik.versions.boost);
assert.ok(mapnik.versions.boost_number);


/* datasource "input_plugins" */

// make sure we have some
assert.ok(mapnik.datasources().length > 1);

// reloading the default plugins path should return false as no more plugins are registered
assert.ok(!mapnik.register_datasources(mapnik.settings.paths.input_plugins));


/* fonts */

function oc(a)
{
  var o = {};
  for (var i = 0; i < a.length; i++)
  {
    o[a[i]] = '';
  }
  return o;
}

// make sure we have default fonts
assert.ok('DejaVu Sans Bold' in oc(mapnik.fonts()));

// make sure system font was loaded
if (process.platform == 'darwin') {
    assert.ok('Times Regular' in oc(mapnik.fonts()));
    // it should already be loaded so trying to register more should return false
    assert.ok(!mapnik.register_fonts('/System/Library/Fonts/', {recurse: true}));
}

// will return true if new fonts are found
// but should return false as we now call at startup
assert.ok(!mapnik.register_system_fonts());


/* ABI compatibility */

// be strict/exact
// note process.versions == process.versions.node except the latter has the 'v' stripped
assert.ok(mapnik.versions.node === process.versions.node, 'The node version "' + process.versions.node + '" does not match the node version that node-mapnik was compiled against: "' + mapnik.versions.node + '"');


/* Map */

// Test mapnik.Map object creation

// no 'new' keyword
assert.throws(function() {mapnik.Map('foo')});
// invalid args
assert.throws(function() {new mapnik.Map()});
assert.throws(function() {new mapnik.Map(1)});
assert.throws(function() {new mapnik.Map('a', 'b', 'c')});
assert.throws(function() {new mapnik.Map(new mapnik.Map(1, 1))});

var Map = mapnik.Map;

var map1 = new Map(256, 256);

assert.ok(map1 instanceof Map);

var map = new mapnik.Map(600, 400);

assert.ok(map instanceof mapnik.Map);
assert.throws(function() {new mapnik.Map('foo')});

assert.throws(function() {mapnik.Map('foo')});

// test initial values
assert.notStrictEqual(map.extent(), [-1.0, -1.0, 0.0, 0.0]);

// Test rendering a blank image
map.render_to_file('/tmp/nodemap.png');
assert.ok(path.existsSync('/tmp/nodemap.png'));

// test async rendering
map.render(map.extent(), function(buffer) {
       fs.writeFile('/tmp/nodemap_async.png', buffer, function(err) {
           if (err) throw err;
           assert.ok(path.existsSync('/tmp/nodemap_async.png'));
           // todo - not working right...
           //assert.equal(fs.readFileSync('/tmp/nodemap.png').length,fs.readFileSync('/tmp/nodemap_async.png').length);
       });
  });


// Test loading a sample world map
map.load('./examples/stylesheet.xml');

// clear styles and layers from previous load to set up for another
// otherwise layers are duplicated
map.clear();

// Test loading a map from a string
var style_string = fs.readFileSync('./examples/stylesheet.xml').toLocaleString();
var base_url = './examples/'; // must end with trailing slash
map.from_string(style_string, base_url);

// test new extent based on active layers
map.zoom_all();
var expected = [-20037508.3428, -14996604.5082, 20037508.3428, 25078412.1774];
assert.notStrictEqual(map.extent(), expected);

// Test rendering with actual data
map.render_to_file('/tmp/world.png');
assert.ok(path.existsSync('/tmp/world.png'));

assert.equal(map.width(), 600);
assert.equal(map.height(), 400);
map.resize(256, 256);
assert.equal(map.width(), 256);
assert.equal(map.height(), 256);

// layers
var layers = map.layers();
assert.equal(layers.length, 1, layers.length);
lyr = layers[0];
assert.equal(lyr.name, 'world');
assert.equal(lyr.srs, '+proj=merc +lon_0=0 +lat_ts=0 +x_0=0 +y_0=0 +ellps=WGS84 +datum=WGS84 +units=m +no_defs');
assert.equal(lyr.styles.length, 1);
assert.equal(lyr.styles[0], 'style');
assert.equal(lyr.name, 'world');
assert.equal(lyr.datasource.type, 'shape');
assert.equal(lyr.datasource.file, path.join(process.cwd(), 'examples/data/world_merc.shp'));


// features
var features = map.features(0); // for first and only layer
assert.equal(features.length, 245);
var last = features[244];
assert.equal(last.AREA, 1638094);
assert.equal(last.FIPS, 'RS');
assert.equal(last.ISO2, 'RU');
assert.equal(last.LAT, 61.988);
assert.equal(last.LON, 96.689);
assert.equal(last.NAME, 'Russia');
assert.equal(last.POP2005, 143953092);
assert.equal(last.REGION, 150);
assert.equal(last.SUBREGION, 151);
assert.equal(last.UN, 643);

// datasource meta data
var described = map.describe_data();
assert.notStrictEqual(described.world.extent, [-20037508.342789248, -8283343.693882697, 20037508.342789244, 18365151.363070473]);
assert.equal(described.world.type, 'vector');
assert.equal(described.world.encoding, 'utf-8');
assert.equal(described.world.fields.FIPS, 'String');


/* Layer */

// no 'new' keyword
assert.throws(function() {mapnik.Layer('foo')});
// invalid args
assert.throws(function() {new mapnik.Layer()});
assert.throws(function() {new mapnik.Layer(1)});
assert.throws(function() {new mapnik.Layer('a', 'b', 'c')});
assert.throws(function() {new mapnik.Layer(new mapnik.Layer('foo'))});

// new layer
var layer = new mapnik.Layer('foo', '+init=epsg:4326');
assert.ok(layer.name, 'foo');
assert.ok(layer.srs, '+init=epsg:4326');
assert.ok(layer.styles, []);
// TODO
assert.ok(layer.datasource, {});

// json representation
var meta = layer.describe();
assert.ok(meta.name, 'foo');
assert.ok(meta.srs, '+init=epsg:4326');
assert.ok(meta.styles, []);
// TODO
//assert.ok(meta.datasource,{});


// actual map including layer with datasource
var map = new mapnik.Map(256, 256);
map.load('./examples/stylesheet.xml');

// pull a copy out of the map into v8 land
var layer = map.get_layer(0);
assert.ok(layer.name, 'world');
assert.ok(layer.srs, '+proj=merc +lon_0=0 +lat_ts=0 +x_0=0 +y_0=0 +ellps=WGS84 +datum=WGS84 +units=m +no_defs');
assert.ok(layer.styles.length, 1);
assert.ok(layer.styles[0], 'style');
// TODO
assert.ok(layer.datasource, {});

// json representation
var meta = layer.describe();
assert.ok(meta.name, 'world');
assert.ok(meta.srs, '+proj=merc +lon_0=0 +lat_ts=0 +x_0=0 +y_0=0 +ellps=WGS84 +datum=WGS84 +units=m +no_defs');
assert.ok(meta.styles.length, 1);
assert.ok(meta.styles[0], 'style');

// make a change to layer, ensure it sticks
layer.name = 'a';
layer.styles = ['a'];
layer.srs = '+init=epsg:4326';
// TODO
assert.throws(function() {layer.datasource = {}});

// check for change, after adding to map
// adding to map should release original layer
// as a copy is made when added (I think)
map.add_layer(layer);
var added = map.layers()[1];
// make sure the layer is an identical copy to what is on map
assert.ok(added.name, layer.name);
assert.ok(added.srs, layer.srs);
assert.ok(added.styles.length, layer.styles.length);
assert.ok(added.styles[0], layer.styles[0]);
// TODO
//assert.ok(added.datasource,layer.datasource);



/* Projection */

// Test mapnik.Projection object creation

assert.throws(function() {new mapnik.Projection('+init=epsg:foo')});
assert.throws(function() {new mapnik.Projection('+proj +foo')});

try {
    var proj = new mapnik.Projection('+init=epsg:foo');
}
catch (err)
{
    assert.equal(err.message, 'failed to initialize projection with:+init=epsg:foo');
}

var wgs84 = new mapnik.Projection('+init=epsg:4326');

assert.ok(wgs84 instanceof mapnik.Projection);

var merc = null;

try {
    // perhaps we've got a savvy user?
    merc = new mapnik.Projection('+init=epsg:900913');
}
catch (err) {
    // newer versions of proj4 have this code which is == 900913
    merc = new mapnik.Projection('+init=epsg:3857');
}

if (!merc) {
    /* be friendly if this test fails */
    var msg = 'warning, could not create a spherical mercator projection';
    msg += '\nwith either epsg:900913 or epsg:3857, so they must be missing';
    msg += '\nfrom your proj4 epsg table (/usr/local/share/proj/epsg)';
    console.log(msg);
}
else
{
    assert.ok(merc instanceof mapnik.Projection);
    long_lat_coords = [-122.33517, 47.63752];
    merc_coords = merc.forward(long_lat_coords);

    assert.equal(merc_coords.length, 2);
    assert.notStrictEqual(merc_coords, [-13618288.8305, 6046761.54747]);
    assert.notStrictEqual(long_lat_coords, merc.inverse(merc.forward(long_lat_coords)));

    long_lat_bounds = [-122.420654, 47.605006, -122.2435, 47.67764];
    merc_bounds = merc.forward(long_lat_bounds);

    assert.equal(merc_bounds.length, 4);
    var expected = [-13627804.8659, 6041391.68077, -13608084.1728, 6053392.19471];
    assert.notStrictEqual(merc_bounds, expected);
    assert.notStrictEqual(long_lat_bounds, merc.inverse(merc.forward(long_lat_bounds)));
}

console.log('All tests pass...');
/*eslint-disable*/
//eslint deactive etmek icin yazdık bu dosyada

const locations = JSON.parse(document.getElementById('map').dataset.locations);
console.log(locations)

  mapboxgl.accessToken ='pk.eyJ1IjoiamFzb24tbWF4d2VsbCIsImEiOiJjbGRrMWVjYzkxd3JwM3hxcGRkM291N3drIn0.GJTNCVZrYgbDTJ1r6SURFg';

  var map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/jason-maxwell/cldk26n8g000y01ml6ei7w45h',
    scrollZoom:false,
    // center: [28.987416929409644 , 41.0308861867075],
    // zoom : 10,
    // interactive: false
  });

  const bounds = new mapboxgl.LngLatBounds();

  locations.forEach(loc => {
    //create marker
    const el = document.createElement('div');
    el.className = 'marker';

    //add marker
    new mapboxgl.Marker({
        element:el,
        anchor:'bottom'
    }).setLngLat(loc.coordinates).addTo(map);

    //add popup
    new mapboxgl.Popup({
        offset:30
    }).setLngLat(loc.coordinates).setHTML(`<p>Day ${loc.day}: ${loc.description}</p>`).addTo(map)

    //extend map bounds to include current location
    bounds.extend(loc.coordinates)
  })

  map.fitBounds(bounds, {
    padding: {
      top: 200,
      bottom: 150,
      left: 100,
      right: 100,
    },
  });
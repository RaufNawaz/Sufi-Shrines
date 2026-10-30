// Same selection as overpass.ql, kept identical so the item set matches external_sites.csv;
// "out center tags" already returns every tag, which build_merged_leads.py reads in full.
// If you change the selection here, change overpass.ql too, or the place_id join loses rows.
[out:json][timeout:300];
area["ISO3166-1"="PK"][admin_level=2]->.pk;
(
 nwr["historic"="tomb"](area.pk);
 nwr["tomb"](area.pk);
 nwr["place_of_worship"~"shrine|dargah|mazar|tomb",i](area.pk);
 nwr["amenity"="place_of_worship"]["religion"~"hindu|sikh|jain|zoroastrian|buddhist"](area.pk);
 nwr["amenity"="place_of_worship"]["religion"="muslim"]["name"~"darbar|dargah|mazar|mazaar|ziarat|shrine|tomb|astana|khanqah|khanqa|دربار|مزار|درگاہ|زیارت|آستانہ|خانقاہ",i](area.pk);
 nwr["historic"~"memorial|monument"]["name"~"darbar|mazar|shrine|tomb|samadhi|مزار|دربار",i](area.pk);
);
out center tags;

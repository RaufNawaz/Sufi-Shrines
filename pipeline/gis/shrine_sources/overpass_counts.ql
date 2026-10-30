// Wide net for district shrine COUNTS (district_counts/build_district_counts.py classifies
// every element into tiers A/B/C or drops it, with the rule recorded). A superset of
// overpass.ql; that file's selection stays fixed because place_id joins depend on it.
[out:json][timeout:600];
area["ISO3166-1"="PK"][admin_level=2]->.pk;
(
 nwr["historic"~"^(tomb|mausoleum|wayside_shrine|memorial|monument)$"](area.pk);
 nwr["tomb"](area.pk);
 nwr["building"~"^(shrine|tomb|mausoleum|temple)$"](area.pk);
 nwr["place_of_worship"](area.pk);
 nwr["amenity"="place_of_worship"]["religion"!="muslim"](area.pk);
 nwr["amenity"="place_of_worship"][!"religion"](area.pk);
 nwr["amenity"="place_of_worship"]["religion"="muslim"]["name"~"darbar|darbār|durbar|dargah|dargāh|mazar|mazār|mazaar|ziarat|ziyarat|shrine|tomb|astana|aastana|khanqah|khanqa|khankah|maqbara|maqbarah|roza|rauza|samadhi|pir |peer |baba |sakhi|sain |hazrat|bibi |دربار|مزار|درگاہ|زیارت|آستانہ|خانقاہ|مقبرہ|روضہ|پیر |بابا |سخی|سائیں|حضرت|بی بی",i](area.pk);
 nwr["name"~"darbar|darbār|dargah|mazar|mazār|mazaar|ziarat|ziyarat|shrine|astana|aastana|khanqah|khanqa|maqbara|samadhi|samadh|gurdwara|gurudwara|mandir|دربار|مزار|درگاہ|زیارت|آستانہ|خانقاہ|مقبرہ|سمادھی|گوردوارہ|مندر",i](area.pk);
 nwr["name:en"~"darbar|dargah|mazar|shrine|tomb|mausoleum|samadhi|gurdwara|temple|mandir",i](area.pk);
);
out center tags;

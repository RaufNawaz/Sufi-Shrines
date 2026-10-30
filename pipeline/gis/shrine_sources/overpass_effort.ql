// Mapping effort per district (district_counts/): every Muslim or untagged place of worship,
// coordinates only. Mosques track population, not shrines, so their mapped density measures
// how thoroughly OSM has been mapped in a district.
[out:json][timeout:600];
area["ISO3166-1"="PK"][admin_level=2]->.pk;
(
 nwr["amenity"="place_of_worship"]["religion"="muslim"](area.pk);
 nwr["amenity"="place_of_worship"][!"religion"](area.pk);
);
out center qt;

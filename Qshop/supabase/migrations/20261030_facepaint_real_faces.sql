-- Face-paint products use our own shoot (real UniHive faces), applied 20 Oct 2026.
update event_products set image_url = '/hive/facepaint/look-flower.webp' where name = 'Face Paint — Basic';
update event_products set image_url = '/hive/facepaint/clown-body.webp' where name = 'Face & Body Paint';
update event_products set image_url = '/hive/facepaint/uv-mirror.webp' where name = 'Luminous Face Paint';

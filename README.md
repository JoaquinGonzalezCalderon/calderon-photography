# Joaquín Calderón · Photography

Archivo fotográfico construido con React, TypeScript, Vite y CSS moderno. La Home funciona como un índice de álbumes: cada portada abre una experiencia fullscreen con transición desde la misma imagen, galería editorial y lightbox.

## Desarrollo

```bash
npm install
npm run optimize:photos
npm run dev
```

Para producción: `npm run build`.

Las fuentes originales importadas desde Drive viven en `photo-source/originals/` y las versiones optimizadas para la web en `public/photos/web/`. El logo real está en `public/logo/calderon_logo.svg`.

La metadata individual está en `src/data/photos.ts`. Para sumar una foto, colocar el original en una carpeta de `photo-source/originals/`, correr `npm run optimize:photos` y agregar su registro allí. Los álbumes y sus portadas están centralizados en `src/data/albums.ts`: cambiar `coverPhoto` para reemplazar una portada y agregar una entrada nueva para crear otro álbum. `photoIds` define las fotos que aparecen dentro de cada álbum.

Instagram y email se editan en `src/config/site.ts`. Mientras no se definan, la interfaz no enlaza datos inventados.

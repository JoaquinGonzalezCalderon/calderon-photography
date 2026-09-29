import { photos, type Photo } from './photos'

export interface Album {
  id: string
  title: string
  year: string
  place?: string
  coverPhoto: string
  photoIds: string[]
  association: 'confirmed' | 'unconfirmed'
}

export const driveUrls: Record<string, string> = {
  jornadauader: 'https://drive.google.com/drive/folders/1GmKaRL7Q5cAtRlXvuQU0T0QOEIFqBtvq?usp=sharing',
  tekomates: 'https://drive.google.com/drive/folders/14MNtGRw_4O1LFl9O_zwQi51kCwn0UVf1?usp=sharing',
  'desafio-ciudadania': 'https://drive.google.com/drive/folders/1EGfYnA4cN1ykFvVD4pE7M4QuptNYBcjp?usp=sharing',
  scentea: 'https://drive.google.com/drive/u/1/folders/1N7iPyQVrwzDpUguv07yhMY49Lp5L2PEl',
  lossantos: 'https://drive.google.com/drive/folders/1Kj2s15P81QRqUbpzC6N9pR2NjkeopuN6?usp=sharing',
}

export const albums: Album[] = [
  { id: "campusparty", title: "Campus Party Paraná", year: '2026', coverPhoto: "campusparty-dscn4144-vsco", photoIds: ["campusparty-08bf9f3a-1710-44a6-9ca8-3db9398d827d","campusparty-22fabdb0-7386-499c-8062-198780da0957","campusparty-6b0d13d3-2f9e-49dd-8a2c-b79f1de87676","campusparty-7e9c5897-05dc-4de2-b64e-f3a27ac9aabf","campusparty-81e86f5a-5984-4c73-9d68-30eec3bfc429","campusparty-c14cc7cd-7b0b-4d7f-8d2f-4f1cbab6e5b7","campusparty-d5ff770c-6e33-4b26-8bb2-ba06b3971154","campusparty-dscn3940-vsco","campusparty-dscn3981-vsco","campusparty-dscn4046-vsco","campusparty-dscn4113-vsco","campusparty-dscn4132-vsco","campusparty-dscn4134-vsco","campusparty-dscn4144-vsco","campusparty-dscn4147-vsco","campusparty-dscn4150-vsco","campusparty-dscn4207-vsco","campusparty-dscn4229-vsco","campusparty-dscn4236-vsco","campusparty-dscn4241-vsco","campusparty-dscn4273-vsco","campusparty-dscn4287-vsco","campusparty-dscn4304-vsco","campusparty-dscn4308-vsco","campusparty-dscn4333-vsco","campusparty-dscn4394-vsco","campusparty-dscn4411-vsco","campusparty-dscn4420-vsco","campusparty-dscn4420-vsco-1"], association: 'unconfirmed' },
  { id: "jornadauader", title: "Jornada Recreativa y Deportiva UADER", year: '2026', coverPhoto: "jornadauader-dscn5111", photoIds: ["jornadauader-dscn4488","jornadauader-dscn4695","jornadauader-dscn4710","jornadauader-dscn4871","jornadauader-dscn4911","jornadauader-dscn4972","jornadauader-dscn4982","jornadauader-dscn5049","jornadauader-dscn5060","jornadauader-dscn5074","jornadauader-dscn5080","jornadauader-dscn5111","jornadauader-dscn5248","jornadauader-dscn5259","jornadauader-dscn5312","jornadauader-dscn5353"], association: 'unconfirmed' },
  { id: "tekomates", title: "Teko Mates", year: '2026', coverPhoto: "tekomates-dscn5603", photoIds: ["tekomates-dscn5591","tekomates-dscn5595","tekomates-dscn5596","tekomates-dscn5597","tekomates-dscn5599","tekomates-dscn5603","tekomates-dscn5610","tekomates-dscn5611","tekomates-dscn5616","tekomates-dscn5617","tekomates-dscn5619","tekomates-dscn5620","tekomates-dscn5626-01","tekomates-dscn5626","tekomates-dscn5627","tekomates-dscn5629","tekomates-dscn5630","tekomates-dscn5631","tekomates-dscn5632","tekomates-dscn5634","tekomates-dscn5636","tekomates-dscn5637","tekomates-dscn5639","tekomates-dscn5640","tekomates-dscn5641","tekomates-dscn5642","tekomates-dscn5643","tekomates-dscn5648","tekomates-dscn5649-01","tekomates-dscn5649","tekomates-dscn5650","tekomates-dscn5651","tekomates-dscn5652","tekomates-dscn5663","tekomates-dscn5664","tekomates-dscn5668","tekomates-dscn5669","tekomates-dscn5670","tekomates-dscn5672","tekomates-dscn5684","tekomates-dscn5689","tekomates-dscn5691","tekomates-dscn5692","tekomates-dscn5694","tekomates-dscn5705","tekomates-dscn5706","tekomates-dscn5708"], association: 'unconfirmed' },
  { id: "desafio-ciudadania", title: "Desafío Ciudadanía", year: '2026', coverPhoto: "desafio-ciudadania-dscn6298", photoIds: ["desafio-ciudadania-dscn5721","desafio-ciudadania-dscn5754","desafio-ciudadania-dscn5775","desafio-ciudadania-dscn5797","desafio-ciudadania-dscn5841","desafio-ciudadania-dscn5861","desafio-ciudadania-dscn5864","desafio-ciudadania-dscn5916","desafio-ciudadania-dscn5942","desafio-ciudadania-dscn5964","desafio-ciudadania-dscn5995","desafio-ciudadania-dscn6142","desafio-ciudadania-dscn6179","desafio-ciudadania-dscn6200","desafio-ciudadania-dscn6207","desafio-ciudadania-dscn6213-01","desafio-ciudadania-dscn6243","desafio-ciudadania-dscn6269","desafio-ciudadania-dscn6275","desafio-ciudadania-dscn6298","desafio-ciudadania-dscn6299","desafio-ciudadania-dscn6306"], association: 'unconfirmed' },
  { id: "scentea", title: "Scentea", year: '2026', coverPhoto: "scentea-dscn6114", photoIds: ["scentea-dscn6012","scentea-dscn6014","scentea-dscn6021","scentea-dscn6022","scentea-dscn6037","scentea-dscn6041","scentea-dscn6043","scentea-dscn6048","scentea-dscn6049","scentea-dscn6058","scentea-dscn6065","scentea-dscn6082","scentea-dscn6083","scentea-dscn6086","scentea-dscn6088","scentea-dscn6092","scentea-dscn6094","scentea-dscn6099","scentea-dscn6109","scentea-dscn6110","scentea-dscn6112","scentea-dscn6113","scentea-dscn6114","scentea-dscn6116","scentea-dscn6120","scentea-dscn6121","scentea-dscn6125","scentea-dscn6131"], association: 'unconfirmed' },
  { id: "lossantos", title: "Los Santos", year: '2026', coverPhoto: "lossantos-dscn6493-01", photoIds: ["lossantos-dscn6313","lossantos-dscn6316-01","lossantos-dscn6326-01","lossantos-dscn6331-01","lossantos-dscn6336-01","lossantos-dscn6350","lossantos-dscn6356","lossantos-dscn6369","lossantos-dscn6377","lossantos-dscn6378-01","lossantos-dscn6389","lossantos-dscn6399","lossantos-dscn6414","lossantos-dscn6416","lossantos-dscn6430","lossantos-dscn6452","lossantos-dscn6464","lossantos-dscn6465","lossantos-dscn6467","lossantos-dscn6473","lossantos-dscn6493-01","lossantos-dscn6497","lossantos-dscn6502","lossantos-dscn6531","lossantos-dscn6532","lossantos-dscn6537","lossantos-dscn6541-01"], association: 'unconfirmed' },
]

export const albumPhotos = (album: Album): Photo[] => album.photoIds.map((id) => photos.find((photo) => photo.id === id)).filter((photo): photo is Photo => Boolean(photo))
export const albumCover = (album: Album): Photo => photos.find((photo) => photo.id === album.coverPhoto) ?? albumPhotos(album)[0]

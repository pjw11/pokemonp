"""Download source CSVs and artwork with TLS verification; cache local files."""
import csv, json, io, urllib.request, pathlib, concurrent.futures, sys
ROOT = pathlib.Path(__file__).resolve().parents[1]
CACHE = pathlib.Path('/tmp/champions-lab-sources/csv'); CACHE.mkdir(parents=True, exist_ok=True)
API_COMMIT = '81d20919845b6a445969b9265aab5cec6b04cece'
SPRITES_COMMIT = '0dc105d5b12416932f29b594078282ab4be045f5'
def table(name):
 p=CACHE/(API_COMMIT+'-'+name+'.csv')
 if not p.exists():
  p.write_bytes(urllib.request.urlopen(f'https://raw.githubusercontent.com/PokeAPI/pokeapi/{API_COMMIT}/data/v2/csv/{name}.csv',timeout=30).read())
 return list(csv.DictReader(io.StringIO(p.read_text())))
def localized(name,key):
 return {r[key]:r['name'] for r in table(name) if r['local_language_id']=='3'}
if sys.argv[1]=='names':
 pokemons=table('pokemon'); forms=table('pokemon_forms'); formnames={r['pokemon_form_id']:r.get('pokemon_name') or r.get('form_name') for r in table('pokemon_form_names') if r['local_language_id']=='3'}
 print(json.dumps({'species':localized('pokemon_species_names','pokemon_species_id'),'moves':localized('move_names','move_id'),'abilities':localized('ability_names','ability_id'),'items':localized('item_names','item_id'),'pokemon':{r['identifier']:r for r in pokemons},'formnames':{r['pokemon_id']:formnames.get(r['id']) for r in forms},'itemIds':{r['identifier']:r['id'] for r in table('items')},'abilityIds':{r['identifier'].replace('-',''):r['id'] for r in table('abilities')},'moveIds':{r['identifier'].replace('-',''):r['id'] for r in table('moves')}}))
else:
 data=json.loads((ROOT/'public/data/champions.json').read_text())
 tasks={p['imageId']:p['num'] for p in data['pokemon']}; dest=ROOT/'public/pokemon';dest.mkdir(exist_ok=True)
 def download(task):
  image_id,base=task;p=dest/f'{image_id}.webp'
  if p.exists():return None
  try:
   raw=urllib.request.urlopen(f'https://raw.githubusercontent.com/PokeAPI/sprites/{SPRITES_COMMIT}/sprites/pokemon/other/official-artwork/{image_id}.png',timeout=25).read()
   from PIL import Image
   im=Image.open(io.BytesIO(raw));im.thumbnail((420,420));im.save(p,'WEBP',quality=86)
   return None
  except Exception as e:return [image_id,str(e)]
 with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:errors=[e for e in pool.map(download,tasks.items()) if e]
 print(json.dumps({'downloaded':len(tasks)-len(errors),'errors':errors}))

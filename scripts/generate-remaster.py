"""Reproduce the Last Edition remaster paintings with the user's LAN FLUX service."""
import json, pathlib, urllib.request, subprocess
BASE = 'http://192.168.8.186:7870'
OUT = pathlib.Path(__file__).resolve().parents[1] / 'game/assets/remaster'
STYLE = ('Hand-painted cinematic storybook environment for a premium 2D side-scrolling adventure, intricate miniature city made of folded newspaper, carved wood and weathered brass. Tactile paper edges, painterly gouache textures, atmospheric perspective, exquisite warm light, sophisticated art direction. Wide panoramic side view, deep layered scenery, empty playable foreground, no people, no readable text, no UI, no border. ')
PROMPTS = {
'nursery': STYLE + 'Blue hour in an abandoned European nursery district. Tall crooked slate-blue townhouses with mansard roofs, dormer windows, copper spires and hanging paper bunting. A magnificent distant clocktower on the right. Amber windows glow against deep midnight teal and dusty indigo. A huge soft ivory moon in a hazy peach sky. Paper cranes in the sky. Quiet, melancholic, magical, hopeful. Buildings occupy lower two thirds, open upper sky.',
'factory': STYLE + 'The forecast factory district at dusk. A sprawling Victorian printworks of blue-green copper, huge brass wheels, pipes, suspended walkways, tall brick chimneys and ornate windows shining gold. Rolls of newsprint through the architecture. Smoky turquoise atmosphere, deep petrol-blue shadows, burnished amber highlights, dramatic shafts of warm light. Buildings occupy lower two thirds, open upper sky.',
'press': STYLE + 'The enormous final printing cathedral at night. Monumental baroque printing machine architecture, blackened brass columns, suspended copper mechanisms, colossal gears and letterpress drawers. Deep aubergine navy shadows, wine-red ink and warm orange light. A glowing circular window near the right. Moody magical cathedral of paper and machinery. Buildings occupy lower two thirds, open upper sky.',
'morning': STYLE + 'The first morning in a restored miniature paper city. Honey-gold sunlight through soft clouds, flowering roof gardens, glass greenhouses, copper waterwheel, colorful laundry, cream-paper houses with teal roofs, paper birds and abundant greenery. Warm peach and pale mint atmosphere, deep teal shadows, abundant sunlit amber windows, idyllic hopeful spring morning. Buildings occupy lower two thirds, open upper sky.',
'hero': 'Single full body character asset centered on a perfectly flat solid pale pink background, no shadow and no scenery. A lovable little child explorer for a cinematic paper storybook adventure game. Large rounded head, expressive dark eyes, tiny nose, oversized pointed ears like a fennec fox, a small dark tuft of hair. Wearing an ivory folded-paper hood and tunic, a flowing long rust-red scarf, tiny leather satchel and dark brown boots. Standing confident, facing three-quarter right, arms slightly apart, entire character fully visible with generous margins. Beautiful detailed hand-painted gouache, soft warm shading, tactile folded-paper costume, polished charming character design, clear readable silhouette, no text, no border, no extra characters.'
}
def main():
 OUT.mkdir(parents=True, exist_ok=True)
 for i, (name, prompt) in enumerate(PROMPTS.items()):
  if (OUT / (name+'.png')).exists(): continue
  params = dict(prompt=prompt,width=768 if name=='hero' else 1536,height=1024 if name=='hero' else 864,num_inference_steps=28,guidance_scale=4,seed=811+i*101,return_base64=False)
  (OUT / (name+'.json')).write_text(json.dumps(params,indent=2)+'\n')
  # Keep the connection alive during inference. The service is unchanged; only
  # this client runs on the generator host to avoid idle LAN HTTP connections.
  remote = """import urllib.request,json,threading,time
params=PARAMS
result=[]
def run():
 try:
  req=urllib.request.Request('http://127.0.0.1:7870/generate',data=json.dumps(params).encode(),headers={'Content-Type':'application/json'})
  result.append(json.load(urllib.request.urlopen(req,timeout=1800)))
 except Exception as e: result.append({'error':str(e)})
t=threading.Thread(target=run);t.start()
while t.is_alive():
 print('Rendering NAME...',flush=True);t.join(20)
print('RESULT '+json.dumps(result[0]),flush=True)
""".replace('PARAMS',repr(params)).replace('NAME',name)
  print('Generating',name,flush=True)
  proc=subprocess.Popen(['ssh','-o','BatchMode=yes','-o','ServerAliveInterval=15','albert@192.168.8.186','python3 -u -'],stdin=subprocess.PIPE,stdout=subprocess.PIPE,text=True)
  proc.stdin.write(remote);proc.stdin.close()
  result=None
  for line in proc.stdout:
   if line.startswith('RESULT '): result=json.loads(line[7:])
   else: print(line.strip(),flush=True)
  if proc.wait() or result is None or 'error' in result: raise RuntimeError(str(result))
  # Short new requests reliably retrieve completed images.
  data=urllib.request.urlopen(BASE+result['images'][0]['url'],timeout=30).read()
  (OUT/(name+'.png')).write_bytes(data)
  (OUT/(name+'-receipt.json')).write_text(json.dumps(result,indent=2)+'\n')
  print('Saved',name,result.get('seconds'),flush=True)

if __name__ == '__main__': main()

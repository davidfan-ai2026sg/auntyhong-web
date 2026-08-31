import json, re
raw = open("/workspace/auntyhong-image-urls.txt").read()
slug_img = {}
for m in re.finditer(
    r'(https://images\.squarespace-cdn\.com/content/v1/[^"]+)"[^,]{0,80},"mediaFocalPoint".{0,240}?"fullUrl":"/store/p/([^"]+)"',
    raw,
    re.S,
):
    slug_img[m.group(2)] = m.group(1)
named = {
    "cny-banner": "https://images.squarespace-cdn.com/content/v1/5fd98b8d82917438944c7944/2ba52cb4-1e8a-4e21-b2d9-57633d7bcc36/CNY+2025+Banner.jpg",
    "logo": "https://images.squarespace-cdn.com/content/v1/5fd98b8d82917438944c7944/1609304194665-3WRX6X7GCG6WMB21Y8M5/Auntie+Hong+(White).png",
    "noodles": "https://images.squarespace-cdn.com/content/v1/5fd98b8d82917438944c7944/2bb232aa-8a35-4200-9ed0-917137575eeb/_5D_6175.jpg",
    "gold-tin": "https://images.squarespace-cdn.com/content/v1/5fd98b8d82917438944c7944/1609214847079-J6L19BPGG3ZRB896SCLO/2.+Gold+Tin.png",
}
out = {"products": slug_img, "named": named}
json.dump(out, open("/workspace/auntyhong-web/data/images.json", "w"), indent=2)
print(len(slug_img))
for k, v in slug_img.items():
    print(k, v.rsplit("/", 1)[-1][:70])

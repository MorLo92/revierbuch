import glob,json
D={}
for f in sorted(glob.glob('tr*.txt')):
    for ln in open(f,encoding='utf8'):
        ln=ln.rstrip('\n')
        if not ln.strip(): continue
        p=[x.strip() for x in ln.split(' ¦ ')]
        if len(p)!=4: print('BAD',f,ln[:60],len(p)); continue
        D[p[0]]=p[1:]
json.dump(D,open('dict.json','w'),ensure_ascii=False)
print(len(D))
keep=[l.rstrip('\n') for l in open('keep.txt',encoding='utf8')]
st=json.load(open('static.json'))
miss=[k for k in keep+list(st) if k.strip() and k not in D]
print(len(miss)); print('\n'.join(miss))

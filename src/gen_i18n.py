import json,subprocess
subprocess.run(['python3','load.py'],cwd='i18n',capture_output=True)
D=json.load(open('i18n/dict.json',encoding='utf8'))
I={'fr':{},'lb':{},'en':{}}
for k,v in D.items():
    for l,t in zip(['fr','lb','en'],v):
        if t!=k: I[l][k]=t
head=("var LANGS=[['de','Deutsch','de-LU'],['fr','Français','fr-LU'],['lb','Lëtzebuergesch','lb-LU'],['en','English','en-GB']];\n"
"var LANG=(function(){try{var s=localStorage.getItem('revierbuch.lang');if(s&&/^(de|fr|lb|en)$/.test(s))return s}catch(e){}return 'de'})();\n"
"var LOC=(LANGS.filter(function(l){return l[0]===LANG})[0]||LANGS[0])[2];\n"
"var I18N="+json.dumps(I,ensure_ascii=False,separators=(',',':'))+";\n")
open('i18n_head.js','w',encoding='utf8').write(head)
print(len(head))

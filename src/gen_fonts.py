"""Erzeugt fonts.css: Charter Bold (aus Type1) und Inter 400/600/700, als eingebettete WOFF-Dateien (nur Latin)."""
import base64,io
from fontTools.t1Lib import T1Font
from fontTools.fontBuilder import FontBuilder
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.pens.cu2quPen import Cu2QuPen
from fontTools.pens.recordingPen import DecomposingRecordingPen
from fontTools.agl import toUnicode
from fontTools import subset
from fontTools.ttLib import TTFont

UNI=list(range(0x20,0x7F))+list(range(0xA0,0x180))+[0x2013,0x2014,0x2018,0x2019,0x201A,0x201C,0x201D,0x201E,0x2022,0x2026,0x20AC,0x2212,0x00D7]
def charter_bold():
    t1=T1Font('/usr/share/fonts/X11/Type1/c0632bt_.pfb');t1.parse()
    gs=t1.getGlyphSet();order=['.notdef'];cmap={};glyphs={};hmtx={}
    for name in gs.keys():
        try:u=ord(toUnicode(name)) if len(toUnicode(name))==1 else None
        except Exception:u=None
        if name=='.notdef' or (u is not None and u in UNI):
            if name!='.notdef':cmap[u]=name
            pen=TTGlyphPen(None);g=gs[name]
            rec=DecomposingRecordingPen(gs);g.draw(rec);rec.replay(Cu2QuPen(pen,1.0,reverse_direction=True))
            glyphs[name]=pen.glyph();hmtx[name]=(g.width,0);
            if name!='.notdef':order.append(name)
    if '.notdef' not in glyphs:
        pen=TTGlyphPen(None);glyphs['.notdef']=pen.glyph();hmtx['.notdef']=(500,0)
    fb=FontBuilder(1000,isTTF=True);fb.setupGlyphOrder(order);fb.setupCharacterMap(cmap)
    fb.setupGlyf(glyphs);fb.setupHorizontalMetrics({k:(hmtx[k][0],glyphs[k].xMin if hasattr(glyphs[k],'xMin') and glyphs[k].numberOfContours else 0) for k in order})
    fb.setupHorizontalHeader(ascent=900,descent=-250);fb.setupNameTable({'familyName':'Charter Bold','styleName':'Regular'})
    fb.setupOS2(sTypoAscender=900,sTypoDescender=-250,usWinAscent=1000,usWinDescent=300);fb.setupPost()
    fb.font.flavor='woff';b=io.BytesIO();fb.save(b);return b.getvalue()
def inter(w):
    opts=subset.Options();opts.flavor='woff';opts.layout_features=['kern','liga','tnum'];opts.name_IDs=[1,2];opts.notdef_outline=True
    f=TTFont(f'/usr/share/fonts/opentype/inter/Inter-{w}.otf');s=subset.Subsetter(opts);s.populate(unicodes=UNI);s.subset(f)
    f.flavor='woff';b=io.BytesIO();f.save(b);return b.getvalue()
def face(fam,wt,data):
    return '@font-face{font-family:"%s";font-weight:%s;font-style:normal;font-display:swap;src:url(data:font/woff;base64,%s) format("woff")}\n'%(fam,wt,base64.b64encode(data).decode())
css=face('Charter',700,charter_bold())+face('Inter',400,inter('Regular'))+face('Inter',600,inter('SemiBold'))+face('Inter',700,inter('Bold'))
open('fonts.css','w').write(css);print(len(css)//1024,'KB')

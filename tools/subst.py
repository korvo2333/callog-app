import json, re, pathlib
S = str(pathlib.Path(__file__).resolve().parent)
A = json.load(open(f'{S}/assets.json'))
s = open(f'{S}/motion2.src.css').read()
for k in sorted(A, key=len, reverse=True): s = s.replace('__' + k + '__', A[k])
left = re.findall(r'__[A-Z_0-9]+__', s); assert not left, left
pathlib.Path(str(pathlib.Path(__file__).resolve().parent.parent / 'src') + '/motion2.css').write_text(s); print('motion2 ok')

s = open(f'{S}/ui.src.css').read()
for k in sorted(A, key=len, reverse=True): s = s.replace('__' + k + '__', A[k])
left = re.findall(r'__[A-Z_0-9]+__', s); assert not left, left
pathlib.Path(str(pathlib.Path(__file__).resolve().parent.parent / 'src') + '/ui.css').write_text(s); print('ui ok')

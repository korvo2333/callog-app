import pathlib, sys
root = pathlib.Path(__file__).parent
src = (root / 'src' / 'index.src.html').read_text(encoding='utf-8')
css = (root / 'src' / 'style.css').read_text(encoding='utf-8') + '\n' + (root / 'src' / 'themes.css').read_text(encoding='utf-8') + '\n' + (root / 'src' / 'motion.css').read_text(encoding='utf-8') + '\n' + (root / 'src' / 'motion2.css').read_text(encoding='utf-8') + '\n' + (root / 'src' / 'ui.css').read_text(encoding='utf-8') + '\n' + (root / 'src' / 'themes4.css').read_text(encoding='utf-8') + '\n' + (root / 'src' / 'themes5.css').read_text(encoding='utf-8')
js = '\n'.join(p.read_text(encoding='utf-8') for p in sorted((root / 'src' / 'js').glob('*.js')))
out = src.replace('/*__CSS__*/', css).replace('/*__JS__*/', js)
(root / 'dist').mkdir(exist_ok=True)
(root / 'dist' / 'callog.html').write_text(out, encoding='utf-8')
print('built', len(out.splitlines()), 'lines')

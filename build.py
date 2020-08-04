import json, os, zipfile, shutil
from css_html_js_minify import html_minify, js_minify, css_minify

def json_minify(f,**kwargs):
    return f.replace('\n','').replace('\t','').replace('    ','')

with open('dist.json','r') as f:
    config = json.load(f)

minified_files = {}

def zipdir(path, ziph):
    # ziph is zipfile handle
    for root, dirs, files in os.walk(path):
        for file in files:
            ziph.write(os.path.join(root, file))

try:
    os.mkdir(config['target'])
except FileExistsError:
    pass

for path in config['paths']:
    if os.path.isfile(path):
        spext = os.path.splitext(path)
        found = False
        for exclude in config['exclude']:
            if exclude == os.path.split(member[0])[1]:
                found = True
        if found:
            continue
        if spext[1].strip('.') in config['binaries']:
            binary = 'b'
            enc = None
        else:
            binary = ''
            enc = 'utf-8'
        with open(os.path.join(config['target'],path),'w'+binary,encoding=enc) as f:
            with open(path,'r'+binary,encoding=enc) as ofd:
                if spext[1].strip('.') in config['minifyExtensions']:
                    f.write(eval(spext[1].strip('.')+'_minify(data)',globals(),{'data':ofd.read()}))
                else:
                    f.write(ofd.read())

    else:
        members = list(os.walk(path))
        for member in members:
            found = False
            for exclude in config['exclude']:
                if exclude == os.path.split(member[0])[1]:
                    found = True
            if not found:
                for item in member[2]:
                    print(item)
                    found = False
                    for exclude in config['exclude']:
                        if exclude == os.path.split(member[0])[1]:
                            found = True
                    if found:
                        continue
                    spext = os.path.splitext(item)
                    if spext[1].strip('.') in config['binaries']:
                        binary = 'b'
                        enc = None
                    else:
                        binary = ''
                        enc = 'utf-8'
                    try:
                        os.makedirs(os.path.join(config['target'],member[0]))
                    except FileExistsError:
                        pass
                    with open(os.path.join(config['target'],member[0],item),'w'+binary,encoding=enc) as f:
                        with open(os.path.join(member[0],item),'r'+binary,encoding=enc) as ofd:
                            if spext[1].strip('.') in config['minifyExtensions']:
                                f.write(eval(spext[1].strip('.')+'_minify(data)',globals(),{'data':ofd.read()}))
                            else:
                                f.write(ofd.read())

zipf = zipfile.ZipFile(config['target']+'.zip', 'w', zipfile.ZIP_DEFLATED)
zipdir(config['target'], zipf)
zipf.close()

shutil.rmtree(config['target'])
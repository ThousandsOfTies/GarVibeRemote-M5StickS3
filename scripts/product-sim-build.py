"""Build the shared SDK-path simulator and package a GAR host-process artifact."""
import json, os, shutil, subprocess, sys, tempfile
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
if __name__=='__main__':
    command=[sys.executable,str(ROOT/'scripts/build.py')]
    command+=['--wsl',os.environ.get('GAR_WSL_DISTRO','Ubuntu-26.04')] if os.name=='nt' else ['--bootstrap']
    subprocess.run(command,check=True)
    out=ROOT/'artifacts/from-codespace'
    out.parent.mkdir(exist_ok=True)
    with tempfile.TemporaryDirectory(dir=out.parent) as tmp:
        bundle=Path(tmp)/'bundle';host=bundle/'files/host';host.mkdir(parents=True)
        for name in ('index.html','adapter.mjs','style.css','host-server.cjs','host-controller.cjs'):
            shutil.copyfile(ROOT/'simulation'/name,host/name)
        shutil.copytree(ROOT/'simulation/runtime',host/'runtime')
        shutil.copytree(ROOT/'sources/gar-tools/web-simulator/components',host/'gar-components',ignore=shutil.ignore_patterns('__pycache__'))
        descriptor={'schema_version':1,'executable':'node','entrypoint':'host-server.cjs','args':['--port','8774'],'health_url':'http://127.0.0.1:8774/health','panel_url':'http://127.0.0.1:8774/'}
        (host/'host-process.json').write_text(json.dumps(descriptor))
        (bundle/'artifact.json').write_text(json.dumps({'name':'GarVibeRemote-M5StickS3','target':'esp32','entrypoint':'host-server.cjs','deploy':{'app':{'files':[{'src':'files/host','dest':'.'}]}}}))
        if out.exists():out.rename(Path(tmp)/'previous')
        bundle.rename(out)
    print(out)

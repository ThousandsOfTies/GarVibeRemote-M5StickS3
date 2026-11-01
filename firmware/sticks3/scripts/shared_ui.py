from pathlib import Path
import json
import sys
Import('env')
root = Path(env['PROJECT_DIR']).resolve().parents[1]
sys.path.insert(0, str(root / 'scripts'))
from composition import product
selected = product()
generated = selected.prepare()
profile=json.loads((root/'transports/ble/profile.json').read_text(encoding='utf-8'))
(generated/'ble_profile.h').write_text('#pragma once\nnamespace ble_profile {\n'+
    ''.join('inline constexpr char '+key+'[] = '+json.dumps(profile[key])+';\n'
            for key in ('service','rx','tx'))+'}\n',encoding='utf-8')
app = selected.components['application']
board = selected.components['board']
env.Append(CPPPATH=[str(generated), str(board / selected.profile['adapter']['include']),
                    str(root / 'sources/gar-tools/transports/ble-uart/arduino'),
                    *[str(app / path) for path in selected.data['build']['includes']]])
env.Append(CPPDEFINES=[('LV_CONF_PATH', (Path(env['PROJECT_DIR']) / 'include/stickc_lv_conf.h').as_posix())])

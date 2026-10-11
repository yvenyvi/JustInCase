"""Capture actual Android UI for Appendix A; no account credentials are stored."""
import pathlib
import subprocess
import sys
import xml.etree.ElementTree as ET

ADB = r'C:\Users\UyFam.LAPTOP-S1PE31SN\AppData\Local\Android\Sdk\platform-tools\adb.exe'
OUT = pathlib.Path(__file__).parent / 'appendix-a'


def adb(*args):
    return subprocess.check_output([ADB, *args])


action, *args = sys.argv[1:]
if action == 'tap':
    adb('shell', 'input', 'tap', *args)
elif action == 'text':
    adb('shell', 'input', 'text', args[0].replace(' ', '%s'))
elif action == 'key':
    adb('shell', 'input', 'keyevent', *args)
elif action == 'swipe':
    adb('shell', 'input', 'swipe', *args)
elif action == 'open':
    adb('shell', 'am', 'start', '-a', 'android.intent.action.VIEW', '-d', args[0])
elif action == 'capture':
    OUT.mkdir(parents=True, exist_ok=True)
    target = OUT / args[0]
    target.write_bytes(adb('exec-out', 'screencap', '-p'))
    print(target.resolve())
elif action == 'state':
    adb('shell', 'uiautomator', 'dump', '/sdcard/laya-documentation-ui.xml')
    root = ET.fromstring(adb('shell', 'cat', '/sdcard/laya-documentation-ui.xml'))
    for n in root.iter('node'):
        a = n.attrib
        if a.get('text') or a.get('content-desc') or a.get('class', '').endswith('EditText'):
            value = '[password]' if a.get('password') == 'true' else a.get('text', '')
            print(a.get('class', '').split('.')[-1], repr(value), repr(a.get('content-desc', '')), a.get('bounds'), 'focused=' + a.get('focused', ''))

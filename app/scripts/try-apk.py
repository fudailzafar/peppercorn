"""Tries an APK on a running emulator: python3 try-apk.py <file.apk>. Pictures and the log go to ./try."""
import os
import re
import subprocess
import sys
import time
import xml.etree.ElementTree as ET

APP = 'app.peppercorn.money'
OUT = 'try'
os.makedirs(OUT, exist_ok=True)


def adb(*args, check=True, binary=False):
    done = subprocess.run(['adb', *args], capture_output=True, check=check)
    return done.stdout if binary else done.stdout.decode(errors='replace')


def picture(name):
    with open(f'{OUT}/{name}.png', 'wb') as f:
        f.write(adb('exec-out', 'screencap', '-p', binary=True))


def screen():
    for _ in range(5):
        text = adb('exec-out', 'uiautomator', 'dump', '/dev/tty', check=False)
        found = re.search(r'<\?xml.*</hierarchy>', text, re.S)
        if found:
            return list(ET.fromstring(found.group(0)).iter('node'))
        time.sleep(1)
    return []


def find(words):
    for node in screen():
        if words in (node.get('text'), node.get('content-desc')):
            return [int(n) for n in re.findall(r'\d+', node.get('bounds'))]
    return None


def wait(words, seconds=60):
    end = time.time() + seconds
    while time.time() < end:
        place = find(words)
        if place:
            return place
        # A slow emulator's own complaint, over the app.
        slow = find('Wait')
        if slow:
            press(slow)
        time.sleep(1)
    picture('missing')
    raise SystemExit(f'Not on screen: {words}\nThere is: {[n.get("text") or n.get("content-desc") for n in screen() if n.get("text") or n.get("content-desc")]}')


def press(place):
    x1, y1, x2, y2 = place
    adb('shell', 'input', 'tap', str((x1 + x2) // 2), str((y1 + y2) // 2))


def tap(words):
    press(wait(words))
    time.sleep(1.5)


def start():
    adb('shell', 'monkey', '-p', APP, '-c', 'android.intent.category.LAUNCHER', '1')


try:
    # A phone that has just started is busy with itself.
    time.sleep(45)
    adb('install', '-r', sys.argv[1])
    start()
    wait('Skip', 180)
    picture('1-welcome')
    tap('Skip')
    tap('Continue without an account')
    wait('Spent this month')
    picture('2-home')
    tap('Add entry')
    for key in '1250':
        tap(key)
    tap('Food category')
    picture('3-entry')
    tap('Save entry')
    wait('Recent')
    time.sleep(1)
    # As soon as it can be: what was just added has to be on the phone already.
    adb('shell', 'am', 'force-stop', APP)
    start()
    wait('Spent this month', 120)
    time.sleep(2)
    picture('4-opened-again')
    names = [n.get('content-desc') or '' for n in screen()]
    kept = [n for n in names if n.startswith('Food, ') and '1,250.00' in n]
    if not kept:
        raise SystemExit(f'The entry was lost: {names}')
    print('Kept:', kept[0])
    for tab in ('Insights', 'Assets', 'Budget', 'You'):
        tap(tab)
        time.sleep(4 if tab == 'Assets' else 1)
        picture(f'5-{tab}')
    log = adb('logcat', '-d', '-s', 'AndroidRuntime:E', 'ReactNativeJS:E')
    if 'FATAL EXCEPTION' in log:
        raise SystemExit(log)
    print('All good')
finally:
    with open(f'{OUT}/log.txt', 'w') as f:
        f.write(adb('logcat', '-d', check=False)[-400_000:])
